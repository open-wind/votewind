'use client';

import { useEffect, useState, useRef } from 'react';
import { 
  Viewer, 
  Ion, 
  createWorldTerrainAsync,
  SunLight,
  Cartesian3,
  ShadowMode,
  Cartographic,
  Math as CesiumMath,
  JulianDate,
  Transforms,
  Matrix4,
  Color,
  ColorBlendMode,
  HeadingPitchRoll,
  HeadingPitchRange, 
  ScreenSpaceEventHandler,
  sampleTerrainMostDetailed,
  createGooglePhotorealistic3DTileset,
  ScreenSpaceEventType,
  Ray,
  defined,
   } from 'cesium';
import {
  FaArrowUp,
  FaArrowDown,
  FaArrowLeft,
  FaArrowRight,
  FaSearchPlus,
  FaSearchMinus,
  FaUndoAlt,
  FaRedoAlt,
} from "react-icons/fa";
import SunCalc from 'suncalc';
import { LocateFixed } from "lucide-react"
import { PlayIcon, PauseIcon } from '@heroicons/react/24/solid';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import 'cesium/Build/Cesium/Widgets/widgets.css';
import { TURBINE_AR_DEFAULT_HUBHEIGHT, API_BASE_URL } from '@/lib/config';

if (typeof window !== 'undefined') {
  window.CESIUM_BASE_URL = process.env.CESIUM_BASE_URL;
}

const NIGHTTIME_ENDS = 21.5;
const MORNING_STARTS = 4.5;

const assetPrefix = process.env.ASSET_PREFIX || '';

export default function CesiumViewer({longitude, latitude}) {
  const containerRef = useRef(null);
  const initializedRef = useRef(false);
  const intervalRef = useRef(null);
  const viewerRef = useRef(null);
  const bladesRef = useRef(null);
  const towerRef = useRef(null);
  const bladePositionRef = useRef(null);
  const animationStartTime = useRef(performance.now());
  const [error, setError] = useState(null);
  const [isViewerReady, setIsViewerReady] = useState(false);
  const [windspeed, setWindspeed] = useState(null);
  const [hourFloat, setHourFloat] = useState(12.0); // default 12pm
  const [isPlaying, setIsPlaying] = useState(false);
  const originalCameraRef = useRef(null);
  const [locating, setLocating] = useState(false);
  const [useUserPosition, setUseUserPosition] = useState(false);
  const interactionHandlerRef = useRef(null);
  const wheelHandlerRef = useRef(null);
  const touchStartHandlerRef = useRef(null);
  const touchMoveHandlerRef = useRef(null);
  const touchEndHandlerRef = useRef(null);

  const moveCamera = (direction) => {
    if (!viewerRef.current) return;
    const camera = viewerRef.current.scene.camera;
    const moveAmount = 1; // meters
    const rotateAmount = 0.05; // radians

    switch (direction) {
      case "up":
        camera.moveUp(moveAmount);
        break;
      case "down":
        camera.moveDown(moveAmount);
        break;
      case "forward":
        camera.moveForward(moveAmount);
        break;
      case "backward":
        camera.moveBackward(moveAmount);
        break;
      case "left":
        camera.moveLeft(moveAmount);
        break;
      case "right":
        camera.moveRight(moveAmount);
        break;
      case "zoomIn":
        camera.zoomIn(moveAmount);
        break;
      case "zoomOut":
        camera.zoomOut(moveAmount);
        break;
      case "rotateLeft":
        camera.rotateLeft(rotateAmount);
        break;
      case "rotateRight":
        camera.rotateRight(rotateAmount);
        break;
    }

    const cartographic = Cartographic.fromCartesian(camera.positionWC);
    const newTransform = Transforms.eastNorthUpToFixedFrame(camera.positionWC);
    camera.lookAtTransform(newTransform);

  };

  function windToRPM(windSpeed) {
    if (windSpeed < 3) return 0; // Below cut-in, no spin
    if (windSpeed >= 12) return 20; // Max capped RPM
    return ((windSpeed - 3) / (12 - 3)) * (20 - 6) + 6; 
  }

  useEffect(() => {
    return () => clearInterval(intervalRef.current);
  }, []);

  function getSolarIrradiance(hourFloat, latitude, longitude) {
    const SOLAR_CONSTANT = 1361; // W/m²

    const date = new Date();
    const hour = Math.floor(hourFloat);
    const minutes = Math.round((hourFloat % 1) * 60);
    date.setHours(hour, minutes, 0, 0); // Local time

    const position = SunCalc.getPosition(date, latitude, longitude);
    const altitude = position.altitude; // in radians

    if (altitude <= 0) return 0; // sun below horizon

    const irradiance = SOLAR_CONSTANT * Math.sin(altitude); // sin(altitude) == cos(zenith)
    return irradiance;
  }

  function getNightOpacity(hourFloat) {
    const irradiance = getSolarIrradiance(hourFloat, latitude, longitude);

    // Normalize irradiance (0 to 1)
    const brightness = Math.min(irradiance / 1361, 1.0);

    // Optional: Apply gamma for perceptual realism
    const adjusted = Math.pow(brightness, 0.6);

    // Invert for overlay opacity: 1 = full night, 0 = full day
    return 1.0 - adjusted;
  }

  const nightOpacity = getNightOpacity(hourFloat);

  const updateCesiumTime = (hourFloat) => {
    if (!viewerRef.current) return;

    setHourFloat(hourFloat);

    const now = new Date();
    
    const hour = Math.floor(hourFloat);
    const minutes = Math.round((hourFloat % 1) * 60);
    now.setUTCHours(hour, minutes, 0, 0);

    const julian = JulianDate.fromDate(now);
    const viewer = viewerRef.current;
    if (!viewer) return;

    viewer.clock.currentTime = julian;
    viewer.scene.light = new SunLight(julian);
  };

  const togglePlayback = () => {
    if (isPlaying) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      intervalRef.current = setInterval(() => {
        setHourFloat((prev) => {
          var next = (prev + 0.03) % 24; // 0.1 hours = 6 minutes
          // Rather than sit in darkness for hours, skip forward from NIGHTIME_ENDS to MORNING_STARTS
          if (next > NIGHTTIME_ENDS) next = MORNING_STARTS;
          updateCesiumTime(next);
          return next;
        });
      }, 100); // update every 100ms
    }
  };

  useEffect(() => {
    if (!isViewerReady) return;

    const animate = () => {
      const now = performance.now();
      const elapsed = (now - animationStartTime.current) / 1000;
      const angle = elapsed * (Math.PI * 2 / 10); // 1 rotation every 10 seconds
      const baseHeading = CesiumMath.toRadians(220);

      const hpr = new HeadingPitchRoll(baseHeading, angle, 0);

      if ((bladesRef.current) && (bladePositionRef.current)) {
        const bladePosition = bladePositionRef.current;
        const quat = Transforms.headingPitchRollQuaternion(bladePosition, hpr);
        bladesRef.current.orientation = quat;
      }

      requestAnimationFrame(animate);
    };

    animationStartTime.current = performance.now();
    requestAnimationFrame(animate);
  }, [isViewerReady]);

  useEffect(() => {
    let isCancelled = false;

    if (!containerRef.current) return;
    if (containerRef.current.hasChildNodes()) return;

    let viewer;
    let tileset;

    const initAnimation = async () => {

      if (initializedRef.current) return;
      initializedRef.current = true;

      try {
        const res = await fetch(API_BASE_URL + "/api/cesium-jit", {
          method: "POST",
        });

        if (!res.ok) {
          throw new Error("Token request failed");
        }

        const data = await res.json();
        Ion.defaultAccessToken = data.token;
      } catch (err) {
        console.error("Failed to fetch Cesium token", err);
      }

      let windspeed_local = 5;

      try {
        const res = await fetch(API_BASE_URL + "/api/windspeed", {
          method: "POST",
          body: JSON.stringify({position: {longitude: longitude, latitude: latitude}})
        });

        if (!res.ok) {
          throw new Error("Windspeed API request failed");
        }

        const data = await res.json();
        windspeed_local = data.windspeed;
        setWindspeed(windspeed_local);
      } catch (err) {
        console.error("Failed to retrieve windspeed", err);
      }

      let terrainProvider;
      try {
        terrainProvider = await createWorldTerrainAsync();
      } catch(err) {
        setError("Invalid API Cesium token, please contact VoteWind sysadmin: support@votewind.org");
        return;
      }

      // Initialize the viewer once the component mounts
      viewer = new Viewer(containerRef.current, {
        contextOptions: {
          webgl: {
            alpha: false,
            antialias: true
          }
        },
        terrainProvider: terrainProvider,
        geocoder: false,
        animation: false,
        baseLayerPicker: false,
        fullscreenButton: false,
        geocoder: false,
        homeButton: false,
        infoBox: false,
        sceneModePicker: false,
        selectionIndicator: false,
        timeline: false,
        navigationHelpButton: false,
        navigationInstructionsInitiallyVisible: false,
        shouldAnimate: false
      });

      viewerRef.current = viewer; 
      viewer.scene.moon.show = false;
      // viewer.scene.globe.show = true;
      viewer.scene.globe._surface._debug.wireframe = false;
      // viewer.scene.globe.maximumScreenSpaceError = 1; // Default is 2-3, lower = higher detail
      viewer.clock.shouldAnimate = true;
      viewer.scene.skyAtmosphere.show = true;
      viewer.scene.sun.show = true;
      viewer.shadows = true;
      viewer.scene.shadowMap.enabled = true;
      viewer.scene.shadowMap.softShadows = true;
      viewer.scene.shadowMap.size = 4096;
      viewer.scene.postProcessStages.fxaa.enabled = true;
      viewer.resolutionScale = window.devicePixelRatio;
      viewer.scene.light = new SunLight();
      viewer.scene.light.intensity = 0.8;
      viewer.scene.globe.enableLighting = true;
      // viewer.scene.globe.enableLighting = false;
      viewer.scene.fog.enabled = true;
      viewer.scene.fog.density = 0.0015;

      // viewer.scene.globe.dynamicAtmosphereLighting = true;

      const now = new Date();    
      const hour = Math.floor(hourFloat);
      const minutes = Math.round((hourFloat % 1) * 60);
      now.setUTCHours(hour, minutes, 0, 0);
      viewer.clock.currentTime = JulianDate.fromDate(now);

      await viewer.terrainProvider.readyPromise;
      await viewer.scene.globe.readyPromise;
      await new Promise(resolve => setTimeout(resolve, 1000)); // wait 1s for LOD refinement

      const positions = [Cartographic.fromDegrees(longitude, latitude)];
      const updatedPositions = await sampleTerrainMostDetailed(viewer.terrainProvider, positions);
      const terrainHeight = updatedPositions[0].height - 5;

      viewer.camera.setView({
          destination: Cartesian3.fromDegrees(longitude, latitude, 100 + terrainHeight),
          orientation: {
          heading: CesiumMath.toRadians(220),
          pitch: CesiumMath.toRadians(0.0),
          }
      });

      try {
        tileset = await createGooglePhotorealistic3DTileset();
        viewer.scene.primitives.add(tileset);
        setTimeout(() => {
          viewer.scene.camera.lookAtTransform(transform, cameraOffset);
          viewer.scene.camera.moveUp(yPan);
        }, 500);      
      } catch (error) {
        console.log(`Failed to load tileset: ${error}`);
      }

      let angle = Math.PI / 2; 
      const radius = 300;
      const yPan = 70;
      // Slightly incline our initial position above the base of the turbine
      // yPan will translate camera by a hubheight distance 
      const heightAbove = 50;

      // Initial orientation of objects
      const heading = CesiumMath.toRadians(220); // Southwest
      const pitch = 0;
      const roll = 0;
      const hpr = new HeadingPitchRoll(heading, pitch, roll);

      const basePosition = Cartesian3.fromDegrees(longitude, latitude, terrainHeight);
      // hub height = TURBINE_AR_DEFAULT_HUBHEIGHT
      const bladePosition = Cartesian3.fromDegrees(longitude, latitude, terrainHeight + TURBINE_AR_DEFAULT_HUBHEIGHT);
      const offset = new Cartesian3(0.0, -1, 0.0);  // local offset
      const rotationMatrix = Transforms.headingPitchRollToFixedFrame(bladePosition, hpr);
      const worldOffset = Matrix4.multiplyByPointAsVector(rotationMatrix, offset, new Cartesian3());
      const offsetBladePosition = Cartesian3.add(bladePosition, worldOffset, new Cartesian3());
      bladePositionRef.current = offsetBladePosition;

      towerRef.current = viewer.entities.add({
        name: "Turbine Tower",
        position: basePosition,
        orientation: Transforms.headingPitchRollQuaternion(basePosition, hpr),
        model: {
          uri: `${assetPrefix}/3d/windturbine_tower.gltf`,
          scale: (TURBINE_AR_DEFAULT_HUBHEIGHT / 100) * 29.28,
          shadows: ShadowMode.ENABLED,
        }
      });

      const bladesEntity = viewer.entities.add({
        name: "Turbine Blades",
        position: offsetBladePosition,
        orientation: Transforms.headingPitchRollQuaternion(bladePosition, hpr),
        // modelMatrix: finalMatrix,
        model: {
          uri: `${assetPrefix}/3d/windturbine_blades.gltf`,
          scale: (TURBINE_AR_DEFAULT_HUBHEIGHT / 100) * 38.48,
          shadows: ShadowMode.CAST_ONLY,
          color: Color.DARKGRAY.withAlpha(1), // or use RGB for finer control
          colorBlendMode: ColorBlendMode.MIX,
          colorBlendAmount: 0.4, // 0 = original color, 1 = full tint
        }
      });
      bladesRef.current = bladesEntity;

      const center = Cartesian3.fromDegrees(longitude, latitude, terrainHeight); 
      const transform = Transforms.eastNorthUpToFixedFrame(center);
      const cameraOffset = new Cartesian3(-radius, (-radius / 4), heightAbove)

      viewer.scene.camera.lookAtTransform(transform, cameraOffset);

      // Slide the camera upward in world coordinates (e.g. Y axis up)
      viewer.scene.camera.moveUp(yPan);

      setTimeout(() => {
        setIsViewerReady(true);
      }, 4000);

    };

    initAnimation();

    return () => {
      if (viewer && !viewer.isDestroyed()) {
        viewer.destroy();
        initializedRef.current = false;
      }
    };

  }, []);

  function saveCameraState() {
    const viewer = viewerRef.current;
    if (!viewer) return;

    const camera = viewer.scene.camera;

    originalCameraRef.current = {
      position: camera.positionWC.clone(),
      direction: camera.directionWC.clone(),
      up: camera.upWC.clone(),
      transform: Matrix4.clone(camera.transform), 
      fov: viewer.camera.frustum.fov
    };
  }

  function restoreCameraState() {
    const viewer = viewerRef.current;
    const saved = originalCameraRef.current;
    if (!viewer || !saved) return;

    const camera = viewer.scene.camera;
    viewer.camera.frustum.fov = saved.fov;
    camera.lookAtTransform(saved.transform || Matrix4.IDENTITY);
    camera.flyTo({
      destination: saved.position,
      orientation: {
        direction: saved.direction,
        up: saved.up,
      },
      duration: 2.5, // seconds
      maximumHeight: 500, // optional: how high camera can arc if needed
      complete: () => {
      },
      cancel: () => {
      },
    });

    // camera.setView({
    //   destination: saved.position,
    //   orientation: {
    //     direction: saved.direction,
    //     up: saved.up,
    //   },
    // });
  }

  function enableCesiumFirstPersonInteraction() {
    const viewer = viewerRef.current;
    if (!viewer) return;

    // Disable default interactions
    const controller = viewer.scene.screenSpaceCameraController;
    controller.enableRotate = false;
    controller.enableTranslate = false;
    controller.enableZoom = false;
    controller.enableTilt = false;
    controller.enableLook = false;

    let isMouseDown = false;
    let lastX = 0;
    let lastY = 0;

    const rotateCamera = (deltaX, deltaY) => {
      viewer.camera.rotate(Cartesian3.UNIT_Z, deltaX * 0.005); // Yaw — turn left/right
      viewer.camera.rotate(viewer.camera.right, deltaY * 0.005);      // relative pitch
    };

    interactionHandlerRef.current = new ScreenSpaceEventHandler(viewer.scene.canvas);

    interactionHandlerRef.current.setInputAction((movement) => {
      isMouseDown = true;
      lastX = movement.position.x;
      lastY = movement.position.y;
    }, ScreenSpaceEventType.LEFT_DOWN);

    interactionHandlerRef.current.setInputAction((movement) => {
      if (!isMouseDown) return;
      const deltaX = movement.endPosition.x - lastX;
      const deltaY = movement.endPosition.y - lastY;
      lastX = movement.endPosition.x;
      lastY = movement.endPosition.y;
      rotateCamera(deltaX, deltaY);
    }, ScreenSpaceEventType.MOUSE_MOVE);

    interactionHandlerRef.current.setInputAction(() => {
      isMouseDown = false;
    }, ScreenSpaceEventType.LEFT_UP);

    const canvas = viewerRef.current?.scene.canvas;
    if (!canvas) return;

    wheelHandlerRef.current = (e) => {
      e.preventDefault();
      const delta = Math.sign(e.deltaY);
      viewerRef.current.camera.frustum.fov += delta * 0.01;
      viewerRef.current.camera.frustum.fov = Math.max(
        CesiumMath.toRadians(5),
        Math.min(CesiumMath.toRadians(150), viewerRef.current.camera.frustum.fov)
      );
    };

    canvas.addEventListener("wheel", wheelHandlerRef.current, { passive: false });

    // Pinch zoom handling
    let lastPinchDistance = null;

    touchStartHandlerRef.current = (e) => {
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        lastPinchDistance = Math.sqrt(dx * dx + dy * dy);
      }
    };

    touchMoveHandlerRef.current = (e) => {
      if (e.touches.length === 2 && lastPinchDistance !== null) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const currentDistance = Math.sqrt(dx * dx + dy * dy);
        const zoomFactor = (lastPinchDistance - currentDistance) * 0.001;

        viewerRef.current.camera.frustum.fov += zoomFactor;
        viewerRef.current.camera.frustum.fov = Math.max(
          CesiumMath.toRadians(10),
          Math.min(CesiumMath.toRadians(80), viewerRef.current.camera.frustum.fov)
        );

        lastPinchDistance = currentDistance;
      }
    };

    touchEndHandlerRef.current = () => {
      lastPinchDistance = null;
    };

    canvas.addEventListener("touchstart", touchStartHandlerRef.current, { passive: false });
    canvas.addEventListener("touchmove", touchMoveHandlerRef.current, { passive: false });
    canvas.addEventListener("touchend", touchEndHandlerRef.current, { passive: false });
  }

  function disableCesiumFirstPersonInteraction() {
    const canvas = viewerRef.current?.scene.canvas;
    if (!canvas) return;

    if (wheelHandlerRef.current) canvas.removeEventListener("wheel", wheelHandlerRef.current);
    if (touchStartHandlerRef.current) canvas.removeEventListener("touchstart", touchStartHandlerRef.current);
    if (touchMoveHandlerRef.current) canvas.removeEventListener("touchmove", touchMoveHandlerRef.current);
    if (touchEndHandlerRef.current) canvas.removeEventListener("touchend", touchEndHandlerRef.current);
    
    if (interactionHandlerRef.current) {
      interactionHandlerRef.current.destroy();
      interactionHandlerRef.current = null;
    }

    const viewer = viewerRef.current;
    if (!viewer) return;

    // Re-enable Cesium's controls
    viewer.scene.screenSpaceCameraController.enableRotate = true;
    viewer.scene.screenSpaceCameraController.enableTranslate = true;
    viewer.scene.screenSpaceCameraController.enableZoom = true;
    viewer.scene.screenSpaceCameraController.enableTilt = true;
    viewer.scene.screenSpaceCameraController.enableLook = true;
  }

  async function findLowestNearbyPoint(longitude, latitude, viewer, radius = 50, step = 5) {
    const scene = viewer.scene;
    const positions = [];

    // Build grid of positions around the user
    for (let dx = -radius; dx <= radius; dx += step) {
      for (let dy = -radius; dy <= radius; dy += step) {
        const offsetLon = longitude + (dx / 111320); // meters to degrees approx
        const offsetLat = latitude + (dy / 110540);
        positions.push({ lon: offsetLon, lat: offsetLat });
      }
    }

    let lowestPoint = null;

    for (const pos of positions) {
      const top = Cartesian3.fromDegrees(pos.lon, pos.lat, 100); // start above
      const bottom = Cartesian3.fromDegrees(pos.lon, pos.lat, -100); // end below
      const dir = Cartesian3.subtract(bottom, top, new Cartesian3());
      const ray = new Ray(top, Cartesian3.normalize(dir, new Cartesian3()));
      const hit = scene.pickFromRay(ray);
      console.log(pos, hit);
      if (hit?.position) {
        const carto = Ellipsoid.WGS84.cartesianToCartographic(hit.position);
        console.log(carto.height);
        if (!lowestPoint || carto.height < lowestPoint.height) {
          lowestPoint = {
            longitude: CesiumMath.toDegrees(carto.longitude),
            latitude: CesiumMath.toDegrees(carto.latitude),
            height: carto.height,
          };
        }
      }
    }

    // Fallback to terrain at central point if nothing hit
    if (!lowestPoint) {
      console.warn("No surface intersection found, falling back to terrain sampling");
      const terrainSamples = await sampleTerrainMostDetailed(viewer.terrainProvider, [
        Cartographic.fromDegrees(longitude, latitude),
      ]);
      const t = terrainSamples[0];
      return {
        longitude: CesiumMath.toDegrees(t.longitude),
        latitude: CesiumMath.toDegrees(t.latitude),
        height: t.height,
      };
    }

    return lowestPoint;
  }

  // Detect if the camera is likely inside a building or terrain
  function isInsideGeometry() {
    const scene = viewerRef.current.scene;
    const position = viewerRef.current.camera.positionWC;

    const directions = [
      Cartesian3.UNIT_X,
      Cartesian3.UNIT_Y,
      Cartesian3.UNIT_Z,
      Cartesian3.negate(Cartesian3.UNIT_X, new Cartesian3()),
      Cartesian3.negate(Cartesian3.UNIT_Y, new Cartesian3()),
      Cartesian3.negate(Cartesian3.UNIT_Z, new Cartesian3()),
    ];

    const ray = new Ray();

    for (const dir of directions) {
      const clonedDirection = Cartesian3.clone(dir, new Cartesian3()); // ✅ make it mutable
      ray.origin = Cartesian3.clone(position, new Cartesian3());
      ray.direction = clonedDirection;

      const hit = scene.pickFromRay(ray);
      if (defined(hit)) {
        return false;
      }
    }

    return true; // All directions blocked — likely inside geometry
  }

  async function moveCameraFirstPerson(userPosition) {
    if (!viewerRef.current) return;

    saveCameraState();

    const viewer = viewerRef.current;

    const userLng = userPosition.longitude;
    const userLat = userPosition.latitude;

    try {
      // Sample terrain heights
      const [userCarto, turbineCarto] = await sampleTerrainMostDetailed(
        viewer.terrainProvider,
        [
          Cartographic.fromDegrees(userLng, userLat),
          Cartographic.fromDegrees(longitude, latitude),
        ]
      );

      const userHeight = isFinite(userCarto.height) ? userCarto.height : 0;
      const turbineHeight = isFinite(turbineCarto.height) ? turbineCarto.height : 0;

      const userCartesian = Cartesian3.fromDegrees(
        userLng,
        userLat,
        userHeight + 1.5 // Clear of any potential buildings
      );
      
      const userTransform = Transforms.eastNorthUpToFixedFrame(userCartesian);
      const turbineCartesian = Cartesian3.fromDegrees(
        longitude,
        latitude,
        turbineHeight + TURBINE_AR_DEFAULT_HUBHEIGHT // Turbine hub height
      );

      // Compute direction from user to turbine hub
      const direction = Cartesian3.subtract(
        turbineCartesian,
        userCartesian,
        new Cartesian3()
      );
      const normalized = Cartesian3.normalize(direction, new Cartesian3());

      // Convert world-space direction to ENU (local) frame at user position
      const transform = Transforms.eastNorthUpToFixedFrame(userCartesian);
      const inverse = Matrix4.inverse(transform, new Matrix4());
      const localDirection = Matrix4.multiplyByPointAsVector(
        inverse,
        normalized,
        new Cartesian3()
      );

      // Calculate heading/pitch from local vector
      const heading = Math.atan2(localDirection.x, localDirection.y);
      const pitch = Math.asin(localDirection.z); // look up/down
      const roll = 0;

      viewer.scene.screenSpaceCameraController.minimumZoomDistance = 0;
      viewer.scene.screenSpaceCameraController.enableCollisionDetection = false; 

      viewer.scene.camera.flyTo({
        destination: userCartesian,
        orientation: {
          heading,
          pitch,
          roll,
        },
        duration: 2.5, // seconds
        maximumHeight: 500, // optional: how high camera can arc if needed
        complete: () => {
          viewer.scene.camera.lookAtTransform(userTransform);
          enableCesiumFirstPersonInteraction();
        },
        cancel: () => {
        },
      });
    } catch (err) {
      console.error("Failed to move camera to look at turbine hub:", err);
    }
  }

  const handleUseMyLocation = () => {

    if (useUserPosition) {
      disableCesiumFirstPersonInteraction();
      restoreCameraState();
      setUseUserPosition(false);
      return;
    }

    setError("");
    if (!navigator.geolocation) {
      setError("Geolocation not supported by your browser.");
      return;
    }

    setLocating(true);

    const isDev = process.env.NODE_ENV === "development";

    const runPositioning = () => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocating(false);
          const { latitude, longitude } = position.coords;
          moveCameraFirstPerson({latitude: latitude, longitude: longitude});
          setUseUserPosition(true);
        },
        () => {
          setLocating(false);
          setError("Unable to retrieve your location.");
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
      );

    }

    isDev ? setTimeout(runPositioning, 1000) : runPositioning();
  };

  return (
  <div style={{ width: "100%", height: "100%", position: "relative", touchAction: 'manipulation' }}>
    {error ? (
      <div className="flex items-center justify-center h-full text-lg text-center px-4">
        {error}
      </div>
    ) : (
      <>
        <div
          ref={containerRef}
          id="cesiumContainer"
          className={`w-full h-full transition-opacity duration-1000 ease-in ${isViewerReady ? "opacity-100" : "opacity-0"}`}
        >

          {isViewerReady && (
            <div
              className="absolute inset-0 bg-black pointer-events-none z-40"
              style={{ opacity: nightOpacity }}
            />
          )}

          {isViewerReady && (
          <>
          {/* View from current position Button */}
          <TooltipProvider>
              <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleUseMyLocation}
                  className={`absolute top-4 left-4 px-2 py-2 z-50 w-10 h-10 ${useUserPosition ? 'bg-blue-700 text-white hover:bg-blue-500 ': 'bg-white text-gray-600 hover:bg-white '} bg-opacity-70 rounded-full p-1`}
                >
                {locating ? (
                  <svg
                    className="animate-spin w-6 h-6"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                ) : (
                  <LocateFixed className={`w-6 h-6`} />
                )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={10} portalled={false} className="font-light text-sm bg-white text-black border shadow px-3 py-1 rounded-md hidden sm:block">
                {useUserPosition ? 'Remove current position lock': 'View turbine from your current position'}
              </TooltipContent>
              </Tooltip>
          </TooltipProvider>

          {/* Control panel */}
          {useUserPosition &&
          <div className="absolute bottom-16 sm:bottom-10 left-1/2 transform -translate-x-1/2 z-50 bg-white bg-opacity-70 p-2 rounded-full flex flex-col items-center space-y-1">
            <button className="text-gray-600 rounded p-0 text-lg" onClick={() => moveCamera("up")}>
              <FaArrowUp className="w-7 h-7 sm:w-5 sm:h-5"/>
            </button>
            <div className="flex space-x-2 space-y-1">
              <button className="text-gray-600 rounded p-0 text-lg mr-8 sm:mr-6" onClick={() => moveCamera("left")}>
                <FaArrowLeft className="w-7 h-7 sm:w-5 sm:h-5" />
              </button>
              <button className="text-gray-600 rounded p-0 text-lg ml-8 sm:ml-6" onClick={() => moveCamera("right")}>
                <FaArrowRight className="w-7 h-7 sm:w-5 sm:h-5"/>
              </button>
            </div>
            <button className="text-gray-600 rounded p-0 text-lg" onClick={() => moveCamera("down")}>
              <FaArrowDown className="w-7 h-7 sm:w-5 sm:h-5"/>
            </button>
          </div>
          }

          </>
          )}

        </div>

        {!isViewerReady && (
          <div className="absolute inset-0 z-0 flex items-center justify-center bg-white">
            <div className="text-gray-600 text-lg font-medium animate-pulse">
              Loading 3D visualisation…
            </div>
          </div>
        )}

        {isViewerReady &&
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 flex flex-wrap justify-center gap-2">
          {(windspeed !== null) && 
          <>
          <div className="bg-gray-100 text-gray-700 hidden sm:inline text-xs sm:text-sm px-4 py-1 rounded-full shadow-sm backdrop-blur-md mx-2">
            Average Wind Speed: <span className="font-semibold">{windspeed.toFixed(1)} m/s</span>
          </div>
          <div className="bg-gray-100 text-gray-700 sm:hidden text-xs sm:text-sm px-4 py-1 rounded-full shadow-sm backdrop-blur-md">
            Avg Wind Speed: <span className="font-semibold">{windspeed.toFixed(1)} m/s</span>
          </div>
          </>
          }
          <div className="inline">
            <button
              onClick={togglePlayback}
              className="max-w-[9rem] bg-white/80 hover:bg-white text-gray-800 text-sm font-sm px-3 py-1 rounded-full flex shadow"
            >
                {isPlaying ? (
                  <PauseIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                ) : (
                  <PlayIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                )}
                <span className="font-mono min-w-[70px] text-xs sm:text-sm">
                {(hourFloat < 13.0) ? String(Math.floor(hourFloat)).padStart(2, '0') : String(Math.floor(hourFloat- 12)).padStart(2, '0')}:
                {String(Math.round((hourFloat % 1) * 60)).padStart(2, '0') + ((hourFloat < 12.0) ? ' AM': ' PM')}
              </span>
            </button>

          </div>
        </div>
        }

      </>
    )}
  </div>
);
}