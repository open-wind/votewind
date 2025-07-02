import { useEffect } from 'react';

export default function PulsingSubstationMarker({ map, longitude, latitude }) {
  useEffect(() => {
    if (!map || longitude === undefined || latitude === undefined) return;
    if (!window.maplibregl) {
      console.error('MapLibre GL is not loaded');
      return;
    }

    // Create wrapper div
    const container = document.createElement('div');
    container.style.position = 'relative';
    container.style.width = '24px';
    container.style.height = '24px';

    // Create pulsing ring
    const ring = document.createElement('div');
    ring.style.position = 'absolute';
    ring.style.top = '0';
    ring.style.left = '0';
    ring.style.width = '100%';
    ring.style.height = '100%';
    ring.style.borderRadius = '50%';
    ring.style.backgroundColor = '#f97316';
    ring.style.opacity = '0.5';

    // Create solid center dot
    const core = document.createElement('div');
    core.style.position = 'absolute';
    core.style.top = '6px';
    core.style.left = '6px';
    core.style.width = '12px';
    core.style.height = '12px';
    core.style.borderRadius = '50%';
    core.style.backgroundColor = '#f97316';
    core.style.border = '2px solid white';
    core.style.boxShadow = '0 0 5px rgba(0,0,0,0.3)';
    core.style.zIndex = '2';

    // Attach both to container
    container.appendChild(ring);
    container.appendChild(core);

    // Inject keyframes
    const style = document.createElement('style');
    const animName = `pulse-${Math.random().toString(36).substr(2, 5)}`;
    ring.style.animation = `${animName} 1.5s infinite ease-in-out`;

    style.innerHTML = `
    @keyframes ${animName} {
        0% { transform: scale(1); opacity: 0.5; }
        50% { transform: scale(1.8); opacity: 0; }
        100% { transform: scale(1); opacity: 0.5; }
    }
    `;
    document.head.appendChild(style);

    // Create marker using window.maplibregl
    const marker = new window.maplibregl.Marker({
      element: container,
      anchor: 'center'
    })
      .setLngLat([longitude, latitude])
      .addTo(map);

    return () => {
      marker.remove();
      document.head.removeChild(style);
    };
  }, [map, longitude, latitude]);

  return null;
}
