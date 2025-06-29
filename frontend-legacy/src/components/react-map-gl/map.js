'use client';

import { useEffect, useRef, forwardRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

const Map = forwardRef(function Map({
  mapStyle,
  initialViewState,
  interactiveLayerIds = [],
  style = { width: '100%', height: '100%' },
  maxBounds,
  children,
  ...eventHandlers
}, externalRef) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);

  useEffect(() => {
    if (mapInstanceRef.current) {
      return;
    }

    const mapOptions = {
      container: mapContainerRef.current,
      style: mapStyle,
      bearing: initialViewState?.bearing || 0,
      pitch: initialViewState?.pitch || 0
    };

    // If longitude/latitude provided, set center + zoom
    if (
      initialViewState?.longitude !== undefined &&
      initialViewState?.latitude !== undefined
    ) {
      mapOptions.center = [initialViewState.longitude, initialViewState.latitude];
      if (initialViewState?.zoom !== undefined) {
        mapOptions.zoom = initialViewState.zoom;
      }
    }

    if (maxBounds) {
      mapOptions.maxBounds = maxBounds;
    }

    const mapInstance = new maplibregl.Map(mapOptions);
    mapInstanceRef.current = mapInstance;

    const refObject = { getMap: () => mapInstance };
    if (externalRef) {
      if (typeof externalRef === 'function') {
        externalRef(refObject);
      } else {
        externalRef.current = refObject;
      }
    }

    Object.entries(eventHandlers).forEach(([key, handler]) => {
      if (key.startsWith('on') && typeof handler === 'function') {
        const eventName = key.slice(2).toLowerCase();
        mapInstance.on(eventName, (e) => {
          let features = [];
          if (eventName === 'click' || eventName === 'mousemove') {
            features = mapInstance.queryRenderedFeatures(e.point, {
              layers: interactiveLayerIds.length ? interactiveLayerIds : undefined
            });
          }

          handler({
            lngLat: e.lngLat,
            point: e.point,
            features,
            originalEvent: e.originalEvent,
            viewState: {
              longitude: mapInstance.getCenter().lng,
              latitude: mapInstance.getCenter().lat,
              zoom: mapInstance.getZoom(),
              bearing: mapInstance.getBearing(),
              pitch: mapInstance.getPitch()
            }
          });
        });
      }
    });

    window.dispatchEvent(new Event('resize'));

    return () => {
      mapInstance.remove();
      mapInstanceRef.current = null;
      if (externalRef) {
        if (typeof externalRef === 'function') {
          externalRef(null);
        } else {
          externalRef.current = null;
        }
      }
    };
  }, []);

  return (
    <div ref={mapContainerRef} style={style}>
      {children}
    </div>
  );
});

export default Map;
