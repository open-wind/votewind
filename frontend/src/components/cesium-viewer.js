'use client';

import { useEffect, useState, useRef } from 'react';
import { 
  Viewer, 
  Ion, 
  createWorldTerrainAsync,
  SunLight,
  DirectionalLight,
  Cartesian3,
  Color,
  ColorBlendMode,
  ShadowMode,
  Cartographic,
  Math as CesiumMath,
  JulianDate,
  Transforms,
  HeadingPitchRoll,
  sampleTerrainMostDetailed,
  createGooglePhotorealistic3DTileset } from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';
import { API_BASE_URL } from '@/lib/config';

if (typeof window !== 'undefined') {
  window.CESIUM_BASE_URL = process.env.CESIUM_BASE_URL;
}

export default function CesiumViewer({longitude, latitude}) {
  const containerRef = useRef(null);
  const tickHandlerRef = useRef(null);
  const initializedRef = useRef(false);
  const [error, setError] = useState(null);

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

      let terrainProvider;
      try {
        terrainProvider = await createWorldTerrainAsync();
      } catch(err) {
        setError("Invalid API Cesium token, please contact VoteWind sysadmin: support@votewind.org");
        return;
      }

      // Initialize the viewer once the component mounts
      viewer = new Viewer(containerRef.current, {

        terrainProvider: terrainProvider,
        contextOptions: {
          webgl: {
            alpha: false,
            antialias: true
          }
        },
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

      const positions = [Cartographic.fromDegrees(longitude, latitude)];
      const updatedPositions = await sampleTerrainMostDetailed(viewer.terrainProvider, positions);
      const terrainHeight = updatedPositions[0].height - 5;
      const basePosition = Cartesian3.fromDegrees(longitude, latitude, terrainHeight);
      const bladePosition = Cartesian3.fromDegrees(longitude, latitude, terrainHeight + 100); // Adjust 40 as needed

      viewer.entities.add({
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
        position: bladePosition,
        orientation: Transforms.headingPitchRollQuaternion(bladePosition, hpr),
        model: {
          uri: '/3d/windturbine_blades.gltf',
          scale: 28.48,
          shadows: ShadowMode.CAST_ONLY,
        }
      });

      viewer.camera.setView({
          destination: Cartesian3.fromDegrees(longitude, latitude, 100 + terrainHeight),
          orientation: {
          heading: CesiumMath.toRadians(220),
          pitch: CesiumMath.toRadians(0.0),
          }
      });

      const startTime = JulianDate.now();

      const tickHandler = () => {
        const now = viewer.clock.currentTime;
        const elapsed = JulianDate.secondsDifference(now, startTime);
        const rpm = 15; // rotations per minute
        const angle = ((rpm * 2 * Math.PI) / 60) * elapsed;

        bladesEntity.orientation = Transforms.headingPitchRollQuaternion(
          bladePosition,
          new HeadingPitchRoll(heading, angle, 0)
        );
      };

      viewer.clock.onTick.addEventListener(tickHandler);
      tickHandlerRef.current = tickHandler;

      const center = Cartesian3.fromDegrees(longitude, latitude, terrainHeight); 
      const transform = Transforms.eastNorthUpToFixedFrame(center);
      const cameraOffset = new Cartesian3(-radius, (-radius / 4), heightAbove)

      viewer.scene.camera.lookAtTransform(transform, cameraOffset);

      // Slide the camera upward in world coordinates (e.g. Y axis up)
      viewer.scene.camera.moveUp(yPan);
    };

    initAnimation();

    return () => {
      if (viewer && !viewer.isDestroyed()) {
        if (tickHandlerRef.current) {
          viewer.clock.onTick.removeEventListener(tickHandlerRef.current);
        }
        viewer.destroy();
        initializedRef.current = false;
      }
    };

  }, []);

  return (
    <div style={{ width: "100%", height: "100%" }}>
      {error ? (
      <div className="flex items-center justify-center h-full text-lg text-center px-4">
        {error}
      </div>
      ) : (
        <div ref={containerRef} id="cesiumContainer" className="w-full h-full" />
      )}
    </div>
  );
}