'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useMemo } from 'react';
import maplibregl from 'maplibre-gl';
import Map, { AttributionControl, Marker } from 'react-map-gl/maplibre';
import { SquaresIntersect, SquaresIn } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { useIsMobile } from "@/components/functions/helpers"
import 'maplibre-gl/dist/maplibre-gl.css';
import LayerTogglePanel from './map-layer-panel';
import { TILESERVER_BASEURL, APP_BASE_URL } from '@/lib/config';

const assetPrefix = process.env.ASSET_PREFIX || '';

export default function DetailedMap({ subdomain=null, data=null }) {
    const mapRef = useRef();
    const isMobile = useIsMobile();
    const [mapInstance, setMapInstance] = useState(null);
    const [mapReady, setMapReady] = useState(false);
    const [showOverlay, setShowOverlay] = useState(true);
    const searchParams = useSearchParams();

    const padding = {
        top: 300,
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

    const longitude = useMemo(() => {
        const raw = searchParams.get('longitude');
        if (!raw) return null;
        return parseFloat(raw);
    }, [searchParams]);

    const latitude = useMemo(() => {
        const raw = searchParams.get('latitude');
        if (!raw) return null;
        return parseFloat(raw);
    }, [searchParams]);

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
            map.touchZoomRotate.disableRotation();
            setMapInstance(map);
            map.on('idle', () => {
                setMapReady(true);
            });
        }
    };

    const incorporateBaseDomain = (baseurl, json, slug) => {

        let newjson = JSON.parse(JSON.stringify(json));

        // Prepend baseurl to all source urls
        const sources_keys = Object.keys(newjson['sources'])
        for (let i = 0; i < sources_keys.length; i++) {
            const sources_key = sources_keys[i];
            if ('url' in newjson['sources'][sources_key]) {
                if (!(newjson['sources'][sources_key]['url'].startsWith('http'))) {
                    newjson['sources'][sources_key]['url'] = baseurl + newjson['sources'][sources_key]['url'];
                }
            }
        }  

        // Set area-specific filter on osm-boundaries-overlays
        for (const [index, layer] of newjson['layers'].entries()) {
            const layer_id = layer['id'];
            if (layer_id.startsWith('osm-boundaries-overlays')) {
                newjson['layers'][index]['filter'] = ["==", ["get", "slug"], slug];
            }
        }

        newjson['glyphs'] = baseurl + newjson['glyphs'];
        newjson['sprite'] = baseurl + newjson['sprite'];
        
        return newjson;
    }

    const retrieveMapStyle = () => {
        var maskedStyle = require('./stylesheets/votewind-masked.json');
        var newStyle = incorporateBaseDomain(TILESERVER_BASEURL, maskedStyle, data.features[0].properties.slug);
        return newStyle;
    }

    const toggleOverlay = () => {
        const map = mapRef.current?.getMap();
        if (!map) return;

        if (showOverlay) {
            map.setPaintProperty('osm-boundaries-overlays-fill', 'fill-opacity', 0.3);
        } else {
            map.setPaintProperty('osm-boundaries-overlays-fill', 'fill-opacity', 1);
        }

        setShowOverlay(!showOverlay);
    }

    const mapStyle = useMemo(() => retrieveMapStyle(), []);

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
            touchZoomRotate={true}
            mapStyle={mapStyle}
            onLoad={onLoad}
            style={{ width: '100%', height: '100%' }}
            attributionControl={false}
            >
            <AttributionControl compact position="bottom-right" style={{ right: isMobile ? 4 : 20}}/>

            {mapInstance && (
                <LayerTogglePanel map={mapInstance} />
            )}

            {((longitude !== null) && (latitude !== null)) && (
                <Marker title="Click to cast vote for this position" longitude={longitude.toFixed(5)} latitude={latitude.toFixed(5)} draggable={false} anchor="bottom" offset={[0, 0]}>
                    <TooltipProvider>
                        <Tooltip>
                        <TooltipTrigger asChild>
                            <a href={`${APP_BASE_URL}/${longitude.toFixed(5)}/${latitude.toFixed(5)}/15?selectturbine=true`}>
                                <img alt="Wind turbine" width="80" height="80" src={`${assetPrefix}/icons/windturbine_blue.png`} />
                            </a>
                        </TooltipTrigger>
                        <TooltipContent side="right" sideOffset={10} className="bg-white text-black text-xs border shadow px-3 py-1 rounded-md hidden sm:block">
                            Click to vote for turbine
                        </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </Marker>
            )}

        </Map>

        {data && (
        <div 
            className="absolute bottom-16 sm:bottom-14 left-1/2 transform -translate-x-1/2 z-50 bg-gray-300 text-black text-sm px-4 py-1 rounded-full shadow-2xl pointer-events-none" 
            style={{ boxShadow: '0 0px 15px rgba(255, 255, 255, 0.9)' }} 
            >
            {!mapReady && (<span>Loading... </span>)} <span className="font-bold whitespace-nowrap">{data.features[0].properties.boundary}</span>
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                    <button
                        onClick={() => toggleOverlay()}
                        className="text-gray-500 hover:text-gray-700 pointer-events-auto pl-2"
                        aria-label="Change turbine height"
                    >
                        {showOverlay ? <SquaresIntersect fill="#000000" className="w-4 h-4"/>: <SquaresIntersect className="w-4 h-4"/>}
                    </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" sideOffset={10} className="bg-white text-black text-xs border shadow px-3 py-1 rounded-md hidden sm:block">
                        {showOverlay ? <>Disable area mask</>: <>Enable area mask</>}
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>

        </div>
        )}

    </main>
    )
}
