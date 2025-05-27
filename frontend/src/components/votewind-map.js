'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import * as React from 'react';
const querystring = require('querystring');
import toast, { Toaster } from 'react-hot-toast';
import Map, { AttributionControl, Marker, GeolocateControl } from 'react-map-gl/maplibre';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipArrow, TooltipProvider } from "@/components/ui/tooltip";
import maplibregl from 'maplibre-gl';
import debounce from 'lodash.debounce';

import { VOTEWIND_MAPSTYLE, MAP_DEFAULT_CENTRE, MAP_DEFAULT_BOUNDS, MAP_DEFAULT_ZOOM, API_BASE_URL } from '@/lib/config';

import 'maplibre-gl/dist/maplibre-gl.css';

export default function VoteWindMap({ longitude=null, latitude=null, zoom=null, type='', bounds=null, hideInfo=false }) {
    const router = useRouter();
    const mapRef = useRef();
    const markerRef = useRef();
    const isFittingBounds = useRef(false);
    const isRecentering = useRef(false);
    const [initialPosition, setInitialPosition] = useState({longitude: parseFloat(longitude), latitude: parseFloat(latitude), type: type})
    const [mapLoaded, setMapLoaded] = useState(false);
    const [showInfo, setShowInfo] = useState(!hideInfo);
    const [turbineAdded, setTurbineAdded] = useState(false);
    const [turbinePosition, setTurbinePosition] = useState({'longitude': null, 'latitude': null});
    const [isBouncing, setIsBouncing] = useState(false);
    const [email, setEmail] = useState('');
    const [alertMessage, setAlertMessage] = useState('');
    const [hasConsent, setHasConsent] = useState(null); // null = still loading
    const [showConsentBanner, setShowConsentBanner] = useState(false);
    const [error, setError] = useState('');

    const email_explanation = '<b>Votes confirmed by email are highlighted on VoteWind.org map</b>. <span className="font-light">We will never publish your email address and will only use your email to contact you about relevant community wind events / resources.</span>';
    const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

    const triggerBounce = () => {
        setIsBouncing(true);
        setTimeout(() => setIsBouncing(false), 500); // match animation duration
    };

    useEffect(() => {
        if (!showConsentBanner) return;

        const tryRender = setInterval(() => {
            if (window.grecaptcha && document.getElementById('recaptcha-container')) {
            window.grecaptcha.render('recaptcha-container', {
                sitekey: process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY,
            });
            clearInterval(tryRender);
            }
        }, 300);

        return () => clearInterval(tryRender);
    }, [showConsentBanner]);

    useEffect(() => {
        const map = mapRef.current?.getMap?.();
        if (!map || !bounds) return;

        isFittingBounds.current = true;

        map.fitBounds(bounds, {
            padding: 40,
            duration: 1000,
        });

        // After the move ends, reset the flag
        const onMoveEnd = () => {
            isFittingBounds.current = false;
            map.off('moveend', onMoveEnd);
        };

        map.on('moveend', onMoveEnd);
        
    }, [bounds, mapLoaded]);

    if (zoom === null) zoom = MAP_DEFAULT_ZOOM;
    if ((latitude === null) || (longitude === null)) {
        bounds = [
            [MAP_DEFAULT_BOUNDS.left, MAP_DEFAULT_BOUNDS.bottom], // southwest
            [MAP_DEFAULT_BOUNDS.right, MAP_DEFAULT_BOUNDS.top],  // northeast
        ];
        latitude = MAP_DEFAULT_CENTRE.latitude;
        longitude = MAP_DEFAULT_CENTRE.longitude;
    }

    const initialViewState={
        longitude: longitude,
        latitude: latitude,
        zoom: zoom
    };

    const onLoad = () => {
        setMapLoaded(true);
    }

    const updateURL = debounce((view) => {
        const longitude = view.longitude.toFixed(5);
        const latitude = view.latitude.toFixed(5);
        const zoom = view.zoom.toFixed(2)
        window.history.replaceState(null, '', `/${longitude}/${latitude}/${zoom}`)
    }, 300);

    const onMoveEnd = (e) => {
        if (isFittingBounds.current === false) updateURL(e.viewState);
        if (isRecentering.current) {
            triggerBounce();
            isRecentering.current = false;
        }
    }

    const toastOnshoreOnly = () => {
        toast.dismiss();
        toast.error('Onshore wind only');
    }
    const onTurbineMarkerDragEnd = (event) => {
        var acceptableposition = true;
        const lngLat = event.lngLat;
        const map = mapRef.current?.getMap?.();
        if (map) {
            const point = map.project(lngLat);
            const features = map.queryRenderedFeatures(point);
            if (features.length > 0) {
                if (features[0]['sourceLayer'] === 'water') {
                    acceptableposition = false;
                    toastOnshoreOnly();
                }
            }
        }

        if (acceptableposition) {
            setTurbinePosition({'longitude': lngLat.lng, 'latitude': lngLat.lat});
        }
        else setTurbinePosition({'longitude': turbinePosition.longitude, 'latitude': turbinePosition.latitude});
    }

    useEffect(() => {
        if (!turbinePosition || !turbineAdded) return;
        requestAnimationFrame(mapCentreOnTurbine);
    }, [turbinePosition, turbineAdded]);

    const onClick = (event) => {
        var acceptableposition = true;

        if (event.features.length > 0) {
            var id = event.features[0]['layer']['id'];
            if (id == 'water') {
                acceptableposition = false;
                toastOnshoreOnly();
            }
        }

        if (acceptableposition) {
            setTurbinePosition({'longitude': event.lngLat.lng, 'latitude': event.lngLat.lat});
            setTurbineAdded(true);
        }
    }

    const resetSettings = () => {
        setTurbineAdded(false);
        setError("");
        setEmail("");
    }
    const closeVotingPanel = () => {
        resetSettings();
    }

    const mapCentreOnTurbine = () => {
        const map = mapRef.current?.getMap?.();
        if (!map) return;
        if (!turbinePosition) return;
        isRecentering.current = true;
        map.flyTo({center: {lng: turbinePosition.longitude, lat: turbinePosition.latitude}, padding: {top: 100, bottom: turbineAdded ? window.innerHeight / 3 : 0}});
    }

    const mapZoomIn = (e) => {
          e.target.blur(); // 👈 Removes lingering focus highlight

        const map = mapRef.current?.getMap?.();
        if (!map) return;
        map.zoomIn();
    }

    const mapZoomOut = () => {
        const map = mapRef.current?.getMap?.();
        if (!map) return;
        map.zoomOut();
    }

    const submitVote = async () => {
        if (!turbineAdded) return;

        const voteparameters = {
            position: turbinePosition,
            initialposition: initialPosition
        }

        if ((email) && (email !== '')) voteparameters.email = email;

        const res = await fetch(API_BASE_URL + '/api/vote', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(voteparameters),
            credentials: 'include',
        });

        const data = await res.json();
        if (!data.success) {
            setError("CAPTCHA verification failed. Please try again.");
            return;
        }

        resetSettings();

        let url = `/${turbinePosition.longitude.toFixed(5)}/${turbinePosition.latitude.toFixed(5)}/vote`;
        var urlparameters = {'type': 'votesubmitted'};
        if (email !== '') urlparameters.emailused = 'true';
        if(Object.keys(urlparameters).length) url += '?' + querystring.stringify(urlparameters);

        router.push(url);
    }

    const handleAccept = async () => {
        const token = window.grecaptcha.getResponse();

        if (!token) {
            setError("Please confirm you're not a robot:");
            return;
        }

        const res = await fetch(API_BASE_URL + '/api/setcookie', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token }),
            credentials: 'include',
        });

        const data = await res.json();

        if (!data.success) {
            setError("CAPTCHA verification failed. Please try again.");
            return;
        }

        setError('');
        setShowConsentBanner(false);
        submitVote();
    };

    const isValidEmail = (email) => {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    };

    const checkCookie = async () => {
        try {
            const res = await fetch(API_BASE_URL + '/api/hascookie', {
            credentials: 'include',
            });
            const data = await res.json();
            return data.valid; 
        } catch (err) {
            console.error("Consent check failed", err);
            return false; 
        }
    };

    const handleVote = async () => {
        if (!email) {
            const cookieset = await checkCookie();
            if (cookieset) {
                submitVote();
            } else {
                setError("");
                setShowConsentBanner(true);
                return;
            }
        } else {
            if (isValidEmail(email)) submitVote();
            else setAlertMessage('Please enter a valid email address - or delete your input to use no email address.');
        }
    }

    return (
    <main className="flex justify-center items-center w-screen h-screen">

        {alertMessage && (
        <>
            {/* Backdrop (prevents background interaction) */}
            <div className="fixed inset-0 bg-black bg-opacity-50 z-[1000]"></div>

            <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[9999] w-[90%] max-w-md">
                <div className="rounded-md border border-gray-300 bg-white px-5 py-4 text-base text-gray-800 shadow-xl text-center">
                <div className="mb-3">
                    <strong className="font-bold block">Invalid email</strong>
                </div>
                <div className="mb-3 text-sm">
                    {alertMessage}
                </div>
                <div className="flex justify-center">
                    <button
                    onClick={() => setAlertMessage('')}
                    className="bg-gray-200 text-gray-800 text-sm px-4 py-2 rounded hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400"
                    >
                    Close
                    </button>
                </div>
                </div>
            </div>
        </>
        )}

        {/* Cookie consent banner */}
        {showConsentBanner && (
        <>
            {/* Backdrop (prevents background interaction) */}
            <div className="fixed inset-0 bg-black bg-opacity-50 z-[1000]"></div>

            {/* Modal */}
            <div className="fixed inset-0 z-[1001] flex items-center justify-center">
            <div className="bg-white border border-gray-300 shadow-lg rounded-lg p-6 max-w-sm w-full mx-4">
                <div className="mb-3 text-center">
                    <strong className="font-bold block">Set cookie</strong>
                </div>
                <p className="text-sm text-gray-700">
                We'd like to store a cookie to track who you are and prevent repeat voting. Is that okay?
                </p>
                {/* Recaptcha error message */}
                <div className="w-full flex justify-start mt-4">
                    {error && (<p className="text-red-600 text-sm font-medium mb-2">{error}</p>)}
                </div>
                {/* Recaptcha - to prevent spam voting */}
                <div className="w-full flex justify-start mt-0">
                    <div id="recaptcha-container" className="recaptcha-wrapper" />
                </div>
                <div className="mt-4 flex justify-end gap-2">
                    <button
                        onClick={() => setShowConsentBanner(false)}
                        className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                    >
                        Decline
                    </button>
                    <button
                        onClick={handleAccept}
                        className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                    >
                        Accept
                    </button>
                </div>
            </div>
            </div>
        </>
        )}

        {/*  Voting panel */}
        {turbineAdded && (
        <div className="fixed bottom-0 left-0 w-full h-1/3 overflow-y-auto bg-white shadow-lg border-t z-50 flex flex-col justify-between px-2 pt-1 pb-2 sm:px-10 sm:pt-0 sm:pb-6">

            <div className="max-w-screen-xl mx-auto h-full flex flex-col justify-between px-0 sm:px-4 pb-4">

                {/* Close button */}
                <button
                onClick={closeVotingPanel}
                className="absolute top-1 right-4 text-gray-500 hover:text-gray-700 text-2xl leading-none"
                aria-label="Close vote panel"
                >
                &times;
                </button>

                <form
                onSubmit={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleVote();
                }}
                >

                    {/* Content: Icon + Text */}
                    <div className="flex mt-1 sm:mt-0">
                        <div className="flex-shrink-0 w-20 h-20 sm:w-60 sm:h-60">
                            <img
                            alt="Vote"
                            src="/icons/check-mark.svg"
                            className="block"
                            />
                        </div>

                        <div className="ml-4 flex flex-col justify-start mt-0 sm:mt-4">
                            <h2 className="text-xl sm:text-[24px] font-semibold mb-0">Wind Turbine Vote</h2>
                            {/* Coordinates */}
                            <p className="text-xs text-gray-700 mt-2 sm:mt-4">
                                <b>Position: </b>
                            {turbinePosition.latitude.toFixed(5)}° N, {turbinePosition.longitude.toFixed(5)}° E
                            </p>

                            <p className="text-xs text-gray-500 sm:mb-8">
                            <b>Planning constraints: </b>Footpaths (120m turbine) 
                            </p>

                            <div className="mt-1 hidden sm:block">
                                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                                    Email confirmation:
                                </label>
                                <input
                                    type="email"
                                    id="email"
                                    name="email"
                                    placeholder="Optional: Enter email address to confirm vote"
                                    autoCorrect="off"
                                    autoCapitalize="none"
                                    autoComplete="off"
                                    spellCheck="false"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full max-w-[400px] px-3 py-2 border border-gray-300 rounded text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                                <div className="w-full max-w-[600px] text-[9px] leading-tight sm:text-xs text-gray-800 mt-2 mb-2" dangerouslySetInnerHTML={{ __html: email_explanation }} />
                            </div>

                        </div>
                    </div>

                    <div className="mt-1 sm:hidden">
                        <input
                            type="email"
                            id="email"
                            name="email"
                            placeholder="Optional: Enter email to confirm vote"
                            autoCorrect="off"
                            autoCapitalize="none"
                            autoComplete="off"
                            spellCheck="false"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full sm:w-[400px] px-3 py-1 border border-gray-300 rounded text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <div className="w-full sm:w-[400px] text-[9px] leading-tight sm:text-xs text-gray-800 mt-1" dangerouslySetInnerHTML={{ __html: email_explanation }} />
                    </div>

                    {/* Buttons: Side-by-side, full width combined */}
                    <div className="mt-2 flex justify-end gap-3">
                    <button type="button"
                        onClick={closeVotingPanel}
                        className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300"
                    >
                        Cancel
                    </button>
                    <button type="submit" className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                        Cast your vote!
                    </button>
                    </div>
                </form>
            </div>

        </div>
        )}

        <div className="w-full h-full sm:h relative">
            <Toaster position="top-center" containerStyle={{top: 50}}/>

            {/* Vertical toolbar */}
            <div className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-40">
            <div className="bg-gray-100 rounded-md shadow p-1 sm:p-2 flex flex-col items-center gap-1 sm:gap-2">

                <TooltipProvider>
                    <Tooltip>
                    <TooltipTrigger asChild>
                        <button type="button" onClick={(e) => mapZoomIn(e)} className="w-8 h-8 sm:w-10 sm:h-10 bg-white rounded active:bg-white focus:outline-none focus:ring-0">
                        ➕
                        </button>
                    </TooltipTrigger>
                    <TooltipContent side="right" sideOffset={20} className="bg-white text-black text-lg border shadow px-3 py-1 rounded-md hidden sm:block">
                        Zoom into map
                    </TooltipContent>
                    </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                    <Tooltip>
                    <TooltipTrigger asChild>
                        <button onClick={mapZoomOut} className="w-8 h-8 sm:w-10 sm:h-10 bg-white rounded">
                        ➖
                        </button>
                    </TooltipTrigger>
                    <TooltipContent side="right" sideOffset={20} className="bg-white text-black text-lg border shadow px-3 py-1 rounded-md hidden sm:block">
                        Zoom out of map
                    </TooltipContent>
                    </Tooltip>
                </TooltipProvider>

                {turbineAdded ? (
                <TooltipProvider>
                    <Tooltip>
                    <TooltipTrigger asChild>
                        <button onClick={mapCentreOnTurbine} className="w-8 h-8 sm:w-10 sm:h-10  bg-white rounded flex items-center justify-center">
                        <img
                            alt="Wind turbine"
                            src="/icons/windturbine_black.png"
                            width="20"
                            height="20"
                            className="block"
                        />
                        </button>
                    </TooltipTrigger>
                    <TooltipContent side="right" sideOffset={20} className="bg-white text-black text-lg border shadow px-3 py-1 rounded-md hidden sm:block">
                        Centre map on added turbine
                    </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
                ) : null}
            </div>
            </div>

            {!turbineAdded && showInfo && (
            <div className="absolute bottom-5 left-0 w-full px-4 z-30">
                <div className="relative bg-blue-600 text-white py-4 px-4 rounded-md shadow-[0_-4px_12px_rgba(255,255,255,0.2)] max-w-screen-sm mx-auto text-center">
                <p className="text-sm sm:text-base font-medium animate-fade-loop pr-4">
                    Click on map to place <b>your wind turbine</b>
                </p>
                <button
                    onClick={() => setShowInfo(false)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white text-sm hover:text-gray-300"
                    aria-label="Dismiss"
                >
                    ×
                </button>
                </div>
            </div>
            )}

            {/* Main map */}
            <Map
                ref={mapRef}
                mapLib={maplibregl}
                dragRotate={false}
                touchRotate={false}
                pitchWithRotate={false}
                touchZoomRotate={false}
                initialViewState={initialViewState}
                onLoad={onLoad}
                onMoveEnd={onMoveEnd}
                onClick={onClick}
                style={{ width: '100%', height: '100%' }}
                mapStyle={VOTEWIND_MAPSTYLE}
                interactiveLayerIds={['water']}
                attributionControl={false}
            >
                  <AttributionControl compact position="top-right" style={{ top: '40px' }}/>

                {turbineAdded ? (
                <Marker onDragEnd={onTurbineMarkerDragEnd} longitude={turbinePosition.longitude} latitude={turbinePosition.latitude} draggable={true} anchor="bottom" offset={[0, 0]}>
                    <img ref={markerRef} className={`${isBouncing ? 'bounce' : ''}`} alt="Wind turbine" width="80" height="80" src="/icons/windturbine_black.png" />
                </Marker>
                ) : null}
            </Map>

        </div>
    </main>

  );
}
