'use client';

import { useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import maplibregl from 'maplibre-gl';

export default function Popup({
  mapRef,
  longitude,
  latitude,
  children,
  closeButton = true,
  closeOnClick = true,
  anchor = 'bottom',
  offset = 0,
  className = '',
  onClose
}) {
  const popupRef = useRef(null);
  const containerRef = useRef(document.createElement('div'));

  useEffect(() => {
    if (!mapRef?.current || !mapRef.current.getMap) return;

    const mapInstance = mapRef.current.getMap();
    if (!mapInstance) return;

    const popup = new maplibregl.Popup({
      closeButton,
      closeOnClick,
      anchor,
      offset,
      className
    })
      .setLngLat([longitude, latitude])
      .setDOMContent(containerRef.current)
      .addTo(mapInstance);

    if (onClose) {
      popup.on('close', onClose);
    }

    popupRef.current = popup;

    return () => {
      popup.remove();
      popupRef.current = null;
    };
  }, [mapRef, longitude, latitude, closeButton, closeOnClick, anchor, offset, className, onClose]);

  // Use React portal to render into popup DOM
  return ReactDOM.createPortal(children, containerRef.current);
}
