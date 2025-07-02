import React, { useEffect, useRef, forwardRef } from 'react';

const Map = forwardRef(function Map(
  {
    mapStyle,
    initialViewState,
    interactiveLayerIds = [],
    style = { width: '100%', height: '100%' },
    maxBounds,
    children,
    ...eventHandlers
  },
  externalRef
) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);

  useEffect(() => {
    if (mapInstanceRef.current) {
      return;
    }

    // Dynamically load MapLibre CSS
    const link = document.createElement('link');
    link.href = 'https://unpkg.com/maplibre-gl@1.14.0/dist/maplibre-gl.css';
    link.rel = 'stylesheet';
    document.head.appendChild(link);

    // Dynamically load MapLibre JS
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/maplibre-gl@1.14.0/dist/maplibre-gl.js';
    script.onload = () => {

      if (!window.maplibregl) {
        console.error('MapLibre GL failed to load');
        return;
      }

      const mapOptions = {
        container: mapContainerRef.current,
        style: mapStyle,
        bearing: initialViewState?.bearing || 0,
        pitch: initialViewState?.pitch || 0
      };

      if (initialViewState?.longitude !== undefined && initialViewState?.latitude !== undefined) {
        mapOptions.center = [initialViewState.longitude, initialViewState.latitude];
        if (initialViewState.zoom !== undefined) {
          mapOptions.zoom = initialViewState.zoom;
        }
      }

      if (maxBounds) {
        mapOptions.maxBounds = maxBounds;
      }

      const mapInstance = new window.maplibregl.Map(mapOptions);
      mapInstanceRef.current = mapInstance;

      const refObject = { getMap: () => mapInstance };
      if (externalRef) {
        if (typeof externalRef === 'function') {
          externalRef(refObject);
        } else {
          externalRef.current = refObject;
        }
      }

      // Attach event handlers
      Object.keys(eventHandlers).forEach((key) => {
        const handler = eventHandlers[key];
        if (key.startsWith('on') && typeof handler === 'function') {
          const eventName = key.slice(2).toLowerCase();
          mapInstance.on(eventName, (e) => {
            const features =
              (eventName === 'click' || eventName === 'mousemove')
                ? mapInstance.queryRenderedFeatures(e.point, {
                    layers: interactiveLayerIds.length ? interactiveLayerIds : undefined
                  })
                : [];

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

      let resizeEvent;
      if (typeof Event === 'function') {
        // Modern browsers
        resizeEvent = new Event('resize');
      } else {
        // IE11 fallback
        resizeEvent = document.createEvent('Event');
        resizeEvent.initEvent('resize', true, true);
      }
      window.dispatchEvent(resizeEvent);

    };

    document.body.appendChild(script);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      if (externalRef) {
        if (typeof externalRef === 'function') {
          externalRef(null);
        } else {
          externalRef.current = null;
        }
      }

      // Clean up script and CSS
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
      if (link.parentNode) {
        link.parentNode.removeChild(link);
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
