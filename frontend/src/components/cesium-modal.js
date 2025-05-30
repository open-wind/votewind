'use client';
import { useState } from 'react';
import { Maximize } from 'lucide-react';
import CesiumViewer from './cesium-viewer';

export default function CesiumModal({ longitude, latitude, isOpen, onClose }) {
  if (!isOpen) return null;

  function toggleFullscreen() {
    const container = document.getElementById("cesiumContainer");

    if (!document.fullscreenElement) {
      container.requestFullscreen?.() ||
        container.webkitRequestFullscreen?.() ||
        container.msRequestFullscreen?.();
    } else {
      document.exitFullscreen?.() ||
        document.webkitExitFullscreen?.() ||
        document.msExitFullscreen?.();
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="relative w-full h-full sm:w-[80vw] sm:h-[80vh] bg-white rounded-lg shadow-lg overflow-hidden">

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-2 right-2 z-10 w-10 h-10 text-gray-600 hover:bg-white bg-white bg-opacity-70 rounded-full p-1"
        >
          ✕
        </button>

        {/* Full-screen button */}
        <button
          onClick={() => toggleFullscreen()}
          className="absolute bottom-2 right-2 z-10 w-10 h-10 text-2xl bg-white/30 text-white px-2 py-1 font-extrabold rounded hover:bg-gray-900 transition shadow-sm"
          title="Go fullscreen"
        >
          <Maximize size={24} />
        </button>

        <div className="w-full h-full">
          <CesiumViewer longitude={longitude} latitude={latitude} />
        </div>
      </div>
    </div>
  );
}