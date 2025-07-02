'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import debounce from 'lodash.debounce';
import Map from '@/components/react-map-gl/map';
import Marker from '@/components/react-map-gl/marker';
import { Wind, SquaresIntersect } from 'lucide-react';
// import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
// import { faBinoculars } from '@fortawesome/free-solid-svg-icons';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import { point as turfPoint } from '@turf/helpers';
import { useIsMobile, windspeed2Classname, windspeedToInterpolatedColor } from "@/components/functions/helpers"
import LayerTogglePanel from './map-layer-panel';
import {
    API_BASE_URL, 
    TILESERVER_BASEURL, 
    APP_BASE_URL } from '@/lib/config';

const assetPrefix = process.env.ASSET_PREFIX || '';

export default function DetailedMap({ longitude=null, latitude=null, subdomain=null, data=null }) {
    const mapRef = useRef();
    const isMobile = useIsMobile();
    const [mapInstance, setMapInstance] = useState(null);
    const [mapReady, setMapReady] = useState(false);
    const [markerDragging, setMarkerDragging] = useState(false);
    const [showOverlay, setShowOverlay] = useState(true);
    const [showWindspeeds, setShowWindspeeds] = useState(false);
    const showWindspeedsRef = useRef(showWindspeeds);
    const [turbinePosition, setTurbinePosition] = useState({longitude: longitude, latitude: latitude});
    const [turbineAdded, setTurbineAdded] = useState(false);
    const [windspeed, setWindspeed] = useState(null);
    const [positionWindspeed, setPositionWindspeed] = useState(null);
    const [showCesiumViewer, setShowCesiumViewer] = useState(false);
    const [showViewshed, setShowViewshed] = useState(false);

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

    const updateURL = debounce(() => {
        if (!turbinePosition) return;
        if ((!turbinePosition.longitude) || (!turbinePosition.latitude)) return;
        const longitude = turbinePosition.longitude.toFixed(5);
        const latitude = turbinePosition.latitude.toFixed(5);
        const params = new URLSearchParams();
        params.set('longitude', longitude);
        params.set('latitude', latitude);
        const query = params.toString();
        if (query) window.history.replaceState(null, '', `/?${query}`);
    }, 300);

    useEffect(() => {
        updateURL();

        if ((!turbinePosition.longitude) || (!turbinePosition.latitude)) setTurbineAdded(false);
        else setTurbineAdded(true);

    }, [turbinePosition]);

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
        updateTurbineWindspeed(turbinePosition);
        const map = mapRef.current?.getMap();
        if (map) {
            map.touchZoomRotate.disableRotation();
            setMapInstance(map);
                setMapReady(true);

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
            map.setPaintProperty('mask-global-fill', 'fill-color', "#b9dde5"); // Sea color plus 0.3 of #f0f0f0
        } else {
            map.setPaintProperty('osm-boundaries-overlays-fill', 'fill-opacity', 1);
            map.setPaintProperty('mask-global-fill', 'fill-color', "#f0f0f0");
        }

        setShowOverlay(!showOverlay);
    }

    const toggleWindspeeds = () => {
        const map = mapRef.current?.getMap();
        if (!map) return;
        const new_windspeed_visibility = (!showWindspeeds) ? 'visible' : 'none';
        if (map.getLayer('windspeed')) {
            map.setLayoutProperty('windspeed', 'visibility', new_windspeed_visibility);
        }

        if (showWindspeeds) setPositionWindspeed(null);
        setShowWindspeeds(!showWindspeeds);
    }

    useEffect(() => {
        showWindspeedsRef.current = showWindspeeds;
    }, [showWindspeeds]);

    const toastOnshoreOnly = () => {
        toast.dismiss();
        toast.error('Onshore wind only');
    }

    const updateTurbineWindspeed = async (position) => {

        if (!position) return;
        if (!(position.longitude) || !(position.latitude)) return;

        const res_windspeed = await fetch(API_BASE_URL + '/api/windspeed', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({position: position})
        });

        if (!res_windspeed.ok) {
            setError("Unable to retrieve windspeed data");
            return;
        }

        const data_windspeed = await res_windspeed.json();
        setWindspeed(data_windspeed.windspeed);
    }

    const onTurbineMarkerDragStart = (event) => {
        setWindspeed(null);
        setMarkerDragging(true);
    }

    const onTurbineMarkerDragEnd = (event) => {
        setMarkerDragging(false);
        var acceptableposition = true;
        const lngLat = event.lngLat;
        const map = mapRef.current?.getMap?.();
        if (map) {
            const point = map.project(lngLat);
            const features_initial = map.queryRenderedFeatures(point);
            const features = features_initial.filter((feature) => booleanPointInPolygon(turfPoint([lngLat.lng, lngLat.lat]), feature));
            if (features.length > 0) {
                for (const feature of features) {
                    if (feature['sourceLayer'] === 'water') {
                        acceptableposition = false;
                        toastOnshoreOnly();
                    }
                    if (['osm-boundaries-overlays', 'mask-global'].includes(feature['sourceLayer'])) acceptableposition = false;
                }
            }
        }

        if (acceptableposition) {
            setTurbinePosition({'longitude': lngLat.lng, 'latitude': lngLat.lat});
            updateTurbineWindspeed({'longitude': lngLat.lng, 'latitude': lngLat.lat});
        }
        else {
            if ((turbinePosition !== null) && (turbinePosition.longitude !== null) && (turbinePosition.latitude !== null)) {
                setTurbinePosition({'longitude': turbinePosition.longitude, 'latitude': turbinePosition.latitude});
                updateTurbineWindspeed({'longitude': turbinePosition.longitude, 'latitude': turbinePosition.latitude});
            }
        }
    }

    const onMouseMove = (event) => {
        if (!showWindspeedsRef.current) return;
        const map = mapRef.current?.getMap?.();
        if (map) {
            const features = map.queryRenderedFeatures(event.point, {layers: ['windspeed']});
            if (features.length > 0) {
                const speed = features[0].properties.DN;
                if (markerDragging) {
                    setPositionWindspeed(null);
                } else {
                    setPositionWindspeed((parseFloat(speed) / 10).toFixed(1));
                }
            } else {
                setPositionWindspeed(null);
            }
        }
    }

    const onClick = (event) => {
        onTurbineMarkerDragEnd(event);
    }

    useEffect(() => {

        if(!turbineAdded) return;

        const retrieveViewshed = async () => {
            const res_viewshed = await fetch(API_BASE_URL + '/api/viewshed', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({longitude: turbinePosition.longitude, latitude: turbinePosition.latitude})
            });

            if (!res_viewshed.ok) {
                setError("Unable to retrieve viewshed");
                return;
            }

            const data_viewshed = await res_viewshed.json();
            const map = mapRef.current?.getMap?.();
            if (!map) return
            map.getSource('viewshed').setData(data_viewshed);
        }

        if (showViewshed) retrieveViewshed();

    }, [turbinePosition, showViewshed])

    const clearViewshed = () => {
        const map = mapRef.current?.getMap?.();
        if (!map) return
        map.getSource('viewshed').setData({type: 'FeatureCollection', features: []});
    }

    const toggleViewshed = () => {
        // Switch off layers when activating viewshed
        if (showViewshed) {
            clearViewshed();
        } 
        
        setShowViewshed(!showViewshed);
    }

    const mapStyle = useMemo(() => retrieveMapStyle(), []);

    return (
    <main className={`flex justify-center items-center w-screen h-screen`}>

        <ToastContainer autoClose={2000} position="top-center" closeButton={false} containerStyle={{top: 50}} toastClassName="hot-toast-style"/>

        {!mapReady && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-white">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-700"></div>
        </div>
        )}

        <Map
            ref={mapRef}
            dragRotate={false}
            touchRotate={false}
            pitchWithRotate={false}
            touchZoomRotate={true}
            mapStyle={mapStyle}
            onLoad={onLoad}
            onClick={onClick}
            onMouseMove={onMouseMove}
            style={{ width: '100%', height: '100%' }}
            interactiveLayerIds={[
                'water' ]}
            >

            {mapInstance && (
                <LayerTogglePanel map={mapInstance} />
            )}

            {mapRef?.current && (turbinePosition !== null) && (turbinePosition.longitude !== null) && (turbinePosition.latitude !== null) && (
                <Marker map={mapRef?.current.getMap()} title="Click to cast vote for this position" onDragStart={onTurbineMarkerDragStart} onDragEnd={onTurbineMarkerDragEnd} longitude={turbinePosition.longitude.toFixed(5)} latitude={turbinePosition.latitude.toFixed(5)} draggable={true} anchor="bottom" offset={[0, 0]}>
                    <TooltipProvider>
                        <Tooltip>
                        <TooltipTrigger asChild>
                            <a href={`${APP_BASE_URL}/${turbinePosition.longitude.toFixed(5)}/${turbinePosition.latitude.toFixed(5)}/15?selectturbine=true`}>
                                <img alt="Wind turbine" width="80" height="80" src={`${assetPrefix}/icons/windturbine_blue.png`} />
                            </a>
                        </TooltipTrigger>
                        <TooltipContent side="right" sideOffset={10} className="bg-white text-black text-xs border shadow px-3 py-1 rounded-md hidden sm:block">
                            Click to vote for turbine
                        </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>


                    {windspeed && (
                    <>
                        {(windspeed < 5) 
                        ? 
                        <TooltipProvider>
                            <Tooltip>
                            <TooltipTrigger asChild>
                                <div style={{ backgroundColor: windspeedToInterpolatedColor(windspeed) }} className={`${windspeed2Classname(windspeed)} absolute top-3 left-1 translate-x-12 translate-y-16 min-w-7 pl-2 pr-2 h-7 border-2 sm:border-2 border-white rounded-full flex flex-col items-center justify-center shadow-lg`}>
                                    <div className="text-[8pt] leading-none"><span className="font-extrabold">{windspeed}</span></div>
                                </div>
                            </TooltipTrigger>
                            <TooltipContent side="right" sideOffset={10} className="bg-white text-black text-xs border shadow px-3 py-1 rounded-md hidden sm:block">
                                Wind speed at this position too low for wind turbine
                            </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                        : 
                        <TooltipProvider>
                            <Tooltip>
                            <TooltipTrigger asChild>
                                <div style={{ backgroundColor: windspeedToInterpolatedColor(windspeed) }} className={`${windspeed2Classname(windspeed)} absolute top-3 left-1 translate-x-12 translate-y-16 min-w-7 pl-2 pr-2 h-7 border-2 sm:border-2 border-white rounded-full flex flex-col items-center justify-center shadow-lg`}>
                                    <div className="text-[8pt] leading-none"><span className="font-extrabold">{windspeed}</span></div>
                                </div>
                            </TooltipTrigger>
                            <TooltipContent side="right" sideOffset={10} className="bg-white text-black text-xs border shadow px-3 py-1 rounded-md hidden sm:block">
                                Wind speed at this position is {windspeed} metres / second
                            </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                        }
                        </>
                    )}

                </Marker>
            )}

        </Map>

        {data && (
        <div 
            className="absolute bottom-10 sm:bottom-14 left-1/2 transform -translate-x-1/2 bg-gray-300 text-black text-sm px-4 py-1 rounded-full shadow-2xl pointer-events-none whitespace-nowrap" 
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

        {/* Vertical toolbar */}
        <div className="absolute right-4 sm:right-8 top-16 z-40">
            <div className="bg-gray-100 rounded-full shadow p-2 sm:p-2 flex flex-col items-center space-y-2 sm:space-y-2">

            <TooltipProvider>
                <Tooltip>
                <TooltipTrigger asChild>
                    <button
                    onClick={toggleWindspeeds}
                    className={`w-8 h-8 sm:w-10 sm:h-10 p-1 ${(showWindspeeds) ? "mb-5 sm:mb-3 bg-blue-100": "bg-white"} text-blue-700 rounded-full shadow transition flex items-center justify-center`}
                    >
                        {showWindspeeds ? (
                            <Wind className="w-6 h-6" />
                        ) : (
                            <div className="relative w-6 h-6 flex items-center justify-center rounded-full">
                                <Wind className="w-6 h-6 text-gray-400 relative top-[1px]" />
                            </div>
                        )}

                        {showWindspeeds && positionWindspeed && (
                        <div style={{ backgroundColor: windspeedToInterpolatedColor(positionWindspeed) }} className={`${windspeed2Classname(positionWindspeed)} absolute top-0 left-0 -translate-x-3 sm:translate-x-8 translate-y-9 min-w-7 pl-2 pr-2 h-7 border-2 sm:border-2 border-white rounded-full flex flex-col items-center justify-center shadow-lg`}>
                            <div className="text-[8pt] leading-none"><span className="font-extrabold">{positionWindspeed}</span></div>
                        </div>
                        )}

                    </button>
                </TooltipTrigger>
                <TooltipContent side="left" sideOffset={20} className="font-light text-sm bg-white text-black border shadow px-3 py-1 rounded-md hidden sm:block">
                    {showWindspeeds ? <div>Hide wind speeds</div> : <div>Show wind speeds</div>}
                </TooltipContent>
                </Tooltip>
            </TooltipProvider>

            {turbineAdded && (
            <>
            <TooltipProvider>
                <Tooltip>
                <TooltipTrigger asChild>
                    <button
                    onClick={toggleViewshed}
                    className={`w-8 h-8 sm:w-10 sm:h-10 p-1 ${(showViewshed) ? ("bg-blue-100") : ("bg-white")} text-blue-700 rounded-full shadow hover:bg-gray-100 transition flex items-center justify-center`}
                    >
                        {showViewshed ? (
                            <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 576 512"
                            fill="currentColor"
                            className="w-5 h-5 text-blue-600"
                            >
                            <path d="M128 32l32 0c17.7 0 32 14.3 32 32l0 32L96 96l0-32c0-17.7 14.3-32 32-32zm64 96l0 320c0 17.7-14.3 32-32 32L32 480c-17.7 0-32-14.3-32-32l0-59.1c0-34.6 9.4-68.6 27.2-98.3C40.9 267.8 49.7 242.4 53 216L60.5 156c2-16 15.6-28 31.8-28l99.8 0zm227.8 0c16.1 0 29.8 12 31.8 28L459 216c3.3 26.4 12.1 51.8 25.8 74.6c17.8 29.7 27.2 63.7 27.2 98.3l0 59.1c0 17.7-14.3 32-32 32l-128 0c-17.7 0-32-14.3-32-32l0-320 99.8 0zM320 64c0-17.7 14.3-32 32-32l32 0c17.7 0 32 14.3 32 32l0 32-96 0 0-32zm-32 64l0 160-64 0 0-160 64 0z"/>
                            </svg>

                        ) : (
                            <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 576 512"
                            fill="currentColor"
                            className="w-5 h-5 text-gray-400"
                            >
                            <path d="M128 32l32 0c17.7 0 32 14.3 32 32l0 32L96 96l0-32c0-17.7 14.3-32 32-32zm64 96l0 320c0 17.7-14.3 32-32 32L32 480c-17.7 0-32-14.3-32-32l0-59.1c0-34.6 9.4-68.6 27.2-98.3C40.9 267.8 49.7 242.4 53 216L60.5 156c2-16 15.6-28 31.8-28l99.8 0zm227.8 0c16.1 0 29.8 12 31.8 28L459 216c3.3 26.4 12.1 51.8 25.8 74.6c17.8 29.7 27.2 63.7 27.2 98.3l0 59.1c0 17.7-14.3 32-32 32l-128 0c-17.7 0-32-14.3-32-32l0-320 99.8 0zM320 64c0-17.7 14.3-32 32-32l32 0c17.7 0 32 14.3 32 32l0 32-96 0 0-32zm-32 64l0 160-64 0 0-160 64 0z"/>
                            </svg>
                        )}

                    </button>
                </TooltipTrigger>
                <TooltipContent side="left" sideOffset={20} className="font-light text-sm bg-white text-black border shadow px-3 py-1 rounded-md hidden sm:block">
                    {showViewshed ? <div>Hide visibility estimate</div> : <div>Show visibility estimate</div>}
                </TooltipContent>
                </Tooltip>
            </TooltipProvider>
            </>
            )}

            </div>

        </div>

    </main>
    )
}
