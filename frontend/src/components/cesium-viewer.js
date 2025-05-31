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
  sampleTerrainMostDetailed,
  createGooglePhotorealistic3DTileset,
   } from 'cesium';
import SunCalc from 'suncalc';
import { PlayIcon, PauseIcon } from '@heroicons/react/24/solid';
import 'cesium/Build/Cesium/Widgets/widgets.css';
import { API_BASE_URL } from '@/lib/config';

if (typeof window !== 'undefined') {
  window.CESIUM_BASE_URL = process.env.CESIUM_BASE_URL;
}

const NIGHTTIME_ENDS = 21.5;
const MORNING_STARTS = 4.5;

export default function CesiumViewer({longitude, latitude}) {
  const containerRef = useRef(null);
  const tickHandlerRef = useRef(null);
  const initializedRef = useRef(false);
  const [error, setError] = useState(null);
  const [isViewerReady, setIsViewerReady] = useState(false);
  const [windspeed, setWindspeed] = useState(null);
  const [hourFloat, setHourFloat] = useState(12.0); // default 12pm
  const [isPlaying, setIsPlaying] = useState(false);  
  const intervalRef = useRef(null);
  const viewerRef = useRef(null);
  const bladesRef = useRef(null);
  const towerRef = useRef(null);
  const bladePositionRef = useRef(null);
  const animationStartTime = useRef(performance.now());

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
          method: "GET",
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
      viewer.clock.currentTime = JulianDate.fromDate(new Date("2025-05-30T14:00:00Z"));

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
      // We assume 100 hub height
      const bladePosition = Cartesian3.fromDegrees(longitude, latitude, terrainHeight + 100);
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
          uri: '/3d/windturbine_tower.gltf',
          scale: 29.28,
          shadows: ShadowMode.ENABLED,
        }
      });

      const bladesEntity = viewer.entities.add({
        name: "Turbine Blades",
        position: offsetBladePosition,
        orientation: Transforms.headingPitchRollQuaternion(bladePosition, hpr),
        // modelMatrix: finalMatrix,
        model: {
          uri: '/3d/windturbine_blades.gltf',
          scale: 38.48,
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

  return (
  <div style={{ width: "100%", height: "100%", position: "relative" }}>
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
          <button
            onClick={togglePlayback}
            className="absolute bottom-20 sm:bottom-10 left-1/2 transform -translate-x-1/2 z-50 bg-white/80 hover:bg-white text-gray-800 text-sm font-sm px-3 py-1 rounded-full shadow flex items-center gap-2"
          >
              {isPlaying ? (
                <PauseIcon className="w-5 h-5" />
              ) : (
                <PlayIcon className="w-5 h-5" />
              )}
              <span className="font-mono min-w-[70px]">
              {(hourFloat < 13.0) ? String(Math.floor(hourFloat)).padStart(2, '0') : String(Math.floor(hourFloat- 12)).padStart(2, '0')}:
              {String(Math.round((hourFloat % 1) * 60)).padStart(2, '0') + ((hourFloat < 12.0) ? ' AM': ' PM')}
            </span>

          </button>
          )}

        </div>

        {!isViewerReady && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-white">
            <div className="text-gray-600 text-lg font-medium animate-pulse">
              Loading 3D visualisation…
            </div>
          </div>
        )}

        {isViewerReady && (windspeed !== null) && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50">
            <div className="bg-gray-100 text-gray-700 hidden sm:block text-xs sm:text-sm px-4 py-1 rounded-full shadow-sm backdrop-blur-md">
              Average Wind Speed: <span className="font-semibold">{windspeed.toFixed(1)} m/s</span>
            </div>
            <div className="bg-gray-100 text-gray-700 sm:hidden text-xs sm:text-sm px-4 py-1 rounded-full shadow-sm backdrop-blur-md">
              Avg Wind Speed: <span className="font-semibold">{windspeed.toFixed(1)} m/s</span>
            </div>

          </div>
        )}

      </>
    )}
  </div>
);
}