'use client';

import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import ReactDOM from 'react-dom';

export default function Marker({
  map,
  longitude,
  latitude,
  anchor = 'center',
  offset = [0, 0],
  draggable = false,
  onDragStart,
  onDragEnd,
  children
}) {
  const markerRef = useRef(null);
  const elRef = useRef(document.createElement('div'));

  useEffect(() => {
    if (!map) return;

    // Create marker
    markerRef.current = new maplibregl.Marker({
      element: elRef.current,
      anchor,
      offset,
      draggable
    })
      .setLngLat([longitude, latitude])
      .addTo(map);

    if (onDragStart) {
      markerRef.current.on('dragstart', (e) => {
        onDragStart({
          lngLat: markerRef.current.getLngLat(),
          originalEvent: e
        });
      });
    }

    if (onDragEnd) {
      markerRef.current.on('dragend', (e) => {
        onDragEnd({
          lngLat: markerRef.current.getLngLat(),
          originalEvent: e
        });
      });
    }
    
    return () => {
      markerRef.current.remove();
      markerRef.current = null;
    };
  }, [map]);

  useEffect(() => {
    // Update position when props change
    if (markerRef.current) {
      markerRef.current.setLngLat([longitude, latitude]);
    }
  }, [longitude, latitude]);

  useEffect(() => {
    // Update draggable state
    if (markerRef.current) {
      markerRef.current.setDraggable(draggable);
    }
  }, [draggable]);

  return ReactDOM.createPortal(children, elRef.current);
}
