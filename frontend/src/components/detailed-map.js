'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import Map, { AttributionControl } from 'react-map-gl/maplibre';
import { useIsMobile } from "@/components/functions/helpers"
import 'maplibre-gl/dist/maplibre-gl.css';
import LayerTogglePanel from './map-layer-panel';

export default function DetailedMap({ subdomain=null, data=null }) {
    const mapRef = useRef();
    const isMobile = useIsMobile();
    const [mapInstance, setMapInstance] = useState(null);

    const padding = {
        top: 100,
        bottom: 30,
        left: isMobile ? 10 : 300,  // For a sidebar
        right: 10
    };

    function expandBounds(bounds, paddingDegrees = 0.1) {
        const [[west, south], [east, north]] = [
            [bounds[0], bounds[1]],
            [bounds[2], bounds[3]],
        ];

        return [
            [west - paddingDegrees, south - paddingDegrees],
            [east + paddingDegrees, north + paddingDegrees],
        ];
    }

    useEffect(() => {
        if (!mapInstance || typeof mapInstance.setMaxBounds !== 'function') return;

        const bounds = data.features[0].properties.bounds;

        mapInstance.fitBounds(bounds, {
            padding,
            duration: 0,
            linear: true
        });

        requestAnimationFrame(() => {
            const paddedBounds = mapInstance.getBounds();
            mapInstance.setMaxBounds(paddedBounds);
        });
    }, [mapInstance]);

    const onLoad = () => {
        const map = mapRef.current?.getMap();
        if (map) {
            setMapInstance(map);

            if (!map.getSource('mask')) {
                map.addSource('mask', {
                type: 'geojson',
                data: data 
                });

                map.addLayer({
                id: 'mask-fill',
                type: 'fill',
                source: 'mask',
                paint: {
                    'fill-color': '#ffffff',
                    'fill-opacity': 0.95
                }
                });

                map.addLayer({
                id: 'mask-outline',
                type: 'line',
                source: 'mask',
                paint: {
                    'line-color': '#BBBBBB',
                    'line-width': 3
                }
                });
            } else {
                map.getSource('mask').setData(data);
            }
        }
    };

    return (
    <main className="flex justify-center items-center w-screen h-screen">

        <Map
            ref={mapRef}
            mapLib={maplibregl}
            dragRotate={false}
            touchRotate={false}
            pitchWithRotate={false}
            touchZoomRotate={false}
            mapStyle="https://tiles.wewantwind.org/styles/openwind/style.json"
            onLoad={onLoad}
            style={{ width: '100%', height: '100%' }}
            attributionControl={false}
            >
            <AttributionControl compact position="bottom-right" style={{ right: isMobile ? 4 : 20}}/>

            {mapInstance && (
                <LayerTogglePanel map={mapInstance} />
            )}
        </Map>
    </main>
    )
}
