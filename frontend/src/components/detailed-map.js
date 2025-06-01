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
    const [mapReady, setMapReady] = useState(false);

    const padding = {
        top: 100,
        bottom: 100,
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
        console.log(data);
        const map = mapRef.current?.getMap();
        if (map) {
            setMapInstance(map);

            if (!map.getSource('mask')) {
                // Add your main vector tile overlay
                map.addSource('osm-boundaries-overlays', {
                    type: 'vector',
                    url: 'http://localhost:8080/data/osm-boundaries-overlays.json'
                });

                // Add your polygon overlay
                map.addSource('mask', {
                    type: 'geojson',
                    data: data
                });

                // Fill layer for the polygon
                map.addLayer({
                    id: 'osm-boundaries-overlays',
                    type: 'fill',
                    source: 'osm-boundaries-overlays',
                    'source-layer': 'osm-boundaries-overlays',
                    paint: {
                    'fill-color': '#f0f0f0',
                    'fill-opacity': 1,
                    'fill-outline-color': '#000000'
                    },
                    filter: ['==', ['get', 'slug'], data.features[0].properties.slug],
                });

                // Add white donut frame mask
                const outerRing = [
                    [-180, -90],
                    [180, -90],
                    [180, 90],
                    [-180, 90],
                    [-180, -90]
                ];

                const innerRing = [
                    [-9.95, 48.95],
                    [2.95, 48.95],
                    [2.95, 61.75],
                    [-9.95, 61.75],
                    [-9.95, 48.95]
                ];

                const frameMaskGeoJSON = {
                    type: 'FeatureCollection',
                    features: [{
                    type: 'Feature',
                    properties: {},
                    geometry: {
                        type: 'Polygon',
                        coordinates: [outerRing, innerRing]
                    }
                    }]
                };

                map.addSource('frame-mask', {
                    type: 'geojson',
                    data: frameMaskGeoJSON
                });

                map.addLayer({
                    id: 'frame-mask-fill',
                    type: 'fill',
                    source: 'frame-mask',
                    paint: {
                    'fill-color': '#f0f0f0',
                    'fill-opacity': 1
                    }
                });

                map.on('idle', () => {
                    const hasMaskLayer = map.getLayer('frame-mask-fill');
                    if (hasMaskLayer) {
                        setMapReady(true);
                    }
                });
            } 
        }
    };


    return (
    <main className={`flex justify-center items-center w-screen h-screen`}>

        {!mapReady && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-white">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-700"></div>
        </div>
        )}

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

        {data && (
        <div className="absolute bottom-14 left-1/2 transform -translate-x-1/2 z-50 bg-gray-300 text-black text-sm px-4 py-1 rounded-full shadow-2xl pointer-events-none">
            {!mapReady && (<span>Loading... </span>)} <span className="font-bold">{data.features[0].properties.boundary}</span>
        </div>
        )}

    </main>
    )
}
