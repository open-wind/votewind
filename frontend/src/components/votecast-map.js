'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
const querystring = require('querystring');
import Image from "next/image";
import maplibregl from 'maplibre-gl';
import Map, { AttributionControl, Marker } from 'react-map-gl/maplibre';
import { Video } from 'lucide-react'
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button"; 
import SocialShareButtons from "@/components/social-share-buttons";
import NumberedAction from './numbered-action';
import ScrollHint from '@/components/scrollhint'
import CesiumModal from './cesium-modal';
import PartnerLogos from '@/components/partner-logos';
import { VOTEWIND_MAPSTYLE, EMAIL_EXPLANATION, MAP_PLACE_ZOOM, API_BASE_URL } from '@/lib/config';
import 'maplibre-gl/dist/maplibre-gl.css';

const assetPrefix = process.env.ASSET_PREFIX || '';

export default function VoteCastMap({ longitude=null, latitude=null, type='', emailused='' }) {
    const router = useRouter();
    const mapRef = useRef();
    const markerRef = useRef();
    const panelRef = useRef(null)
    const [localgroups, setLocalGroups] = useState([]);
    const [turbineAdded, setTurbineAdded] = useState(false);
    const [turbinePosition, setTurbinePosition] = useState({'longitude': parseFloat(longitude), 'latitude': parseFloat(latitude)});
    const [showCesiumViewer, setShowCesiumViewer] = useState(false);
    const [isBouncing, setIsBouncing] = useState(false);
    const [email, setEmail] = useState('');
    const [alertMessage, setAlertMessage] = useState('');
    const [hasConsent, setHasConsent] = useState(null); // null = still loading
    const [showConsentBanner, setShowConsentBanner] = useState(false);
    const [error, setError] = useState('');

    const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

    const zoom = MAP_PLACE_ZOOM;
    const initialViewState={
        longitude: longitude,
        latitude: latitude,
        zoom: zoom
    };

    const mapZoomIn = (e) => {
        const map = mapRef.current?.getMap?.();
        if (!map) return;
        map.zoomIn();
    }

    const mapZoomOut = () => {
        const map = mapRef.current?.getMap?.();
        if (!map) return;
        map.zoomOut();
    }

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch(API_BASE_URL + '/organisations', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({position: {longitude: longitude, latitude: latitude} }),
                });
                const result = await response.json();
                setLocalGroups(result.features);
            } catch (error) {
                console.error('Fetch failed:', error);
            }
        };

        fetchData();
    }, [longitude, latitude]); 
    
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

    const resetSettings = () => {
        setError("");
        setEmail("");
    }

    const submitVote = async () => {

        const voteparameters = {
            position: turbinePosition,
            initialposition: {longitude: null, latitude: null, type: 'direct'}
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

    <div className="min-h-screen flex flex-col bg-cover bg-center "
        style={{ backgroundImage: `url('${assetPrefix}/images/sunrise-3579931_1920.jpg')` }}>
        <main className="flex-grow overflow-auto">

        <ScrollHint targetRef={panelRef} />

        <section className="flex flex-col items-center pt-[7rem] px-3">
            {/* centred text above */}
            {((type === 'votesubmitted') || (type === 'voteconfirmed')) && (
                <>

                    {/* Content: Icon + Text */}
                    <div className="w-full max-w-[800px] mx-auto rounded-2xl mb-2 bg-white/70 p-4 sm:p-6 text-sm sm:text-medium">
                        <img
                            src={`${assetPrefix}/icons/check-mark.svg`}
                            alt="Vote"
                            className="float-left w-20 h-20 sm:w-[150px] sm:h-[150px] mr-2 sm:mr-6 mb-0"
                        />

                        <h1 className="text-2xl sm:text-4xl font-extrabold text-left mb-4">
                            Congratulations!
                        </h1>

                        <h2 className="text-medium sm:text-xl font-semibold text-left mb-4">
                            {(type == 'votesubmitted') && (<>Your vote has been received</>)}
                            {(type == 'voteconfirmed') && (<>Your vote has been confirmed</>)}
                        </h2>

                        {(emailused === null) && 
                        (
                            <p className="font-light mb-2">Your turbine position vote will now be included on the <a className="font-medium hover:text-blue-600" target="_new" href="/map">VoteWind.org Voting Map</a>.</p>
                        )}

                        {(emailused !== null) && 
                        (
                            <>
                                <p className="font-light mb-2">You'll receive an email shortly so you can confirm your vote. Click on the link in the email and your vote will appear on the <a className="font-medium hover:text-blue-600" target="_new" href="/map">VoteWind.org Voting Map</a>.</p>
                                <p className="font-light mb-2">If you don't receive an email in the next few minutes, check your spam folder or drop us an email at <a className="font-medium hover:text-blue-600" href="mailto:voting@votewind.org">voting@votewind.org</a>.</p>
                                <p className="font-light mb-2">Note: <i>your email address will not be visible on the map</i>. We'll never publish your email address and will only contact you about community wind related events and resources.</p> 
                            </>
                        )}

                        <p className="font-light mb-0">
                            Details about the turbine position you voted for are provided below:
                        </p>

                        <div className="clear-left"></div>
                    </div>

                </>
            )}


            <Card className="relative w-full max-w-[800px] mx-auto rounded-2xl mt-0">

                <CardContent className="flex flex-col sm:flex-row items-center sm:items-start space-x-0 sm:space-x-8 space-y-5 sm:space-y-0 pt-6 pb-6 shadow-md shadow-[0_35px_60px_-15px_rgba(0,0,0,0.4)] rounded-lg">
                {/* Map thumbnail */}
                    <div className="w-[250px] h-[250px] sm:w-[350px] sm:h-[350px] border-[4px] border-black overflow-hidden">


                        <div id="map" className="w-full h-full relative" >

                            <div className="absolute left-2 top-2 z-40">
                                <div className="bg-gray-100 rounded-md shadow p-1 flex flex-col items-center space-y-1">

                                    <button type="button" onClick={mapZoomIn} className="w-6 h-6 bg-white rounded active:bg-white focus:outline-none focus:ring-0">
                                    ➕
                                    </button>
                                    <button type="button" onClick={mapZoomOut} className="w-6 h-6 bg-white rounded">
                                    ➖
                                    </button>

                                </div>
                            </div>

                            {/* Main map */}
                            <Map
                                ref={mapRef}
                                mapLib={maplibregl}
                                dragPan={false}
                                dragRotate={false}
                                scrollZoom={false}
                                doubleClickZoom={true}
                                boxZoom={false}
                                keyboard={false}
                                touchZoomRotate={true}
                                interactive={false}
                                touchRotate={false}
                                pitchWithRotate={false}
                                initialViewState={initialViewState}
                                style={{ width: '100%', height: '100%' }}
                                padding={{top: 80, bottom: 0, left: 0, right: 0}}
                                mapStyle={VOTEWIND_MAPSTYLE}
                                attributionControl={false}
                            >
                                <AttributionControl compact position="bottom-right" />

                                <Marker longitude={initialViewState.longitude} latitude={initialViewState.latitude} draggable={false} anchor="bottom" offset={[0, 0]}>
                                    <img ref={markerRef} className={`${isBouncing ? 'bounce' : ''}`} alt="Wind turbine" width="80" height="80" src={`${assetPrefix}/icons/windturbine_blue.png`} />
                                </Marker>
                            </Map>

                        </div>
                    </div>

                    {/* Text block */}

                    <div className="flex flex-col justify-between self-stretch text-center sm:text-left">
                        {/* Top-of-column text */}
                        <div>
                            <h1 className="text-2xl sm:text-4xl font-bold leading-snug mt-0 mb-1 whitespace-nowrap">{(type === null) ? (<span>Vote for Turbine</span>): (<span>Turbine Position</span>)}
                            <TooltipProvider>
                                <Tooltip>
                                <TooltipTrigger asChild>
                                    <button onClick={() => setShowCesiumViewer(true)} type="button" className="inline-flex ml-4 -translate-y-[2px] relative items-center justify-center sm:bottom-0 h-8 w-8 sm:h-10 sm:w-10 px-1 py-1 bg-blue-600 text-white sm:text-sm rounded-full shadow-lg">
                                        <Video className="w-5 h-5 sm:w-6 sm:h-6 fill-current text-white" />
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent side="right" sideOffset={10} className="bg-white text-black text-xs border shadow px-3 py-1 rounded-md hidden sm:block">
                                    3D view of turbine
                                </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                            </h1>

                            <h2 className="text-2xl font-light leading-snug">{turbinePosition.latitude.toFixed(5)}° N, {turbinePosition.longitude.toFixed(5)}° E</h2>
                            {/* <p className="mt-1 text-sm text-gray-600">Planning constraints</p> */}
                        </div>

                        {(type === null) && (
                        <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleVote();
                        }}
                        >

                            <div className="mt-4">

                                <div className="mt-1">
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
                                        className="w-full sm:w-[400px] px-3 py-2 border border-gray-300 rounded text-md text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    />
                                    <div className="w-full sm:w-[400px] text-[9px] leading-tight sm:text-xs text-gray-800 mt-2" dangerouslySetInnerHTML={{ __html: EMAIL_EXPLANATION }} />
                                </div>

                                <Button
                                    type="submit"
                                    variant="default"
                                    className="w-full h-[3rem] flex items-center justify-center bg-blue-600 text-white text-lg px-4 mt-4 rounded-lg hover:bg-blue-700"
                                    >
                                    <div className="w-4 h-4 flex items-center justify-center">
                                        <Image
                                        src={`${assetPrefix}/icons/check-mark-blue.svg`}
                                        alt=""
                                        width={30}
                                        height={30}
                                        className="w-8 h-8 mr-4"
                                        />
                                    <span className="leading-none">Cast vote!</span>
                                    </div>
                                </Button>

                                <p className="mt-1 font-light text-sm text-gray-600 mt-4">Don't want to vote for this site? <a className="font-bold text-blue-800" href="/">Choose your own site!</a></p>

                            </div>
                        </form>
                        )}


                        {/* Share panel, pushed to the bottom by flex layout */}
                        {((type === 'votesubmitted') || (type === 'voteconfirmed')) && (
                        <div className="mt-4 sm:mt-0">
                            <SocialShareButtons title="I just voted for a community wind turbine location!" />
                        </div>
                        )}

                    </div>

                </CardContent>
            </Card>

            {((type === 'votesubmitted') || (type === 'voteconfirmed')) && (

            <div className="max-w-[800px] md:w-[800px] mx-auto mb-4 bg-white/80 p-5 p-4 sm:p-6 text-sm sm:text-medium mt-4 rounded-2xl">


                <h1 className="text-4xl font-bold text-left mb-8">
                    Next steps...
                </h1>

                <div className="grid grid-cols-[auto_1fr] gap-x-0">
                    <div>
                        <NumberedAction content="1" />
                    </div>

                    <div>
                        <h2 className="text-xl font-semibold mb-2">
                        Share vote on social media
                        </h2>
                        <p className="font-light mb-2">
                        Share your vote with others via social media — the more public support there is for a turbine location, the more likely it will receive planning permission.</p>
                        <p className="font-bold mb-4">Can your turbine position get enough votes to get elected?</p>
                        <div className="hidden sm:block">
                        <SocialShareButtons title="I just voted for a community wind turbine location!" showstrap={false} />
                        </div>

                    </div>
                </div>

                <div className="sm:hidden">
                <SocialShareButtons title="I just voted for a community wind turbine location!" showstrap={false} />
                </div>

                <div className="grid grid-cols-[auto_1fr] gap-x-0 mt-8">
                    <div>
                        <NumberedAction content="2" />
                    </div>

                    <div>
                        <h2 className="text-xl font-semibold mb-2">
                        Join local community energy group
                        </h2>
                        <p className="font-light mb-2">
                        Community energy groups rely on motivated volunteers to make projects happen - and are positive and fun places too! 
                        Reach out to your local community energy group and help make a community wind project happen in your area.</p>
                        <p className="font-light mb-4">The following community energy groups are close to the turbine you voted for:
                        </p>

                        <div className="hidden sm:block space-y-4">
                            {localgroups.map((feature) => (
                            <div key={feature.id} className="p-4 bg-white shadow">
                                {(feature.properties.url !== '') ? (
                                <a
                                href={feature.properties.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 underline text-sm"
                                >
                                <h3 className="text-lg font-semibold">{feature.properties.name}</h3>
                                </a>
                                ) : (
                                <h3 className="text-lg font-semibold">{feature.properties.name}</h3>
                                )}
                                <p className="text-xs">
                                Distance: {feature.properties.distance.toFixed(1)} km
                                </p>
                            </div>
                            ))}
                        </div>

                    </div>
                </div>

                <div className="sm:hidden space-y-4">
                    {localgroups.map((feature) => (
                    <div key={feature.id} className="p-4 bg-white shadow">
                        {(feature.properties.url !== '') ? (
                        <a
                        href={feature.properties.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 underline text-sm"
                        >
                        <h3 className="text-lg font-semibold">{feature.properties.name}</h3>
                        </a>
                        ) : (
                        <h3 className="text-lg font-semibold">{feature.properties.name}</h3>
                        )}
                        <p className="text-xs">
                        Distance: {feature.properties.distance.toFixed(1)} km
                        </p>
                    </div>
                    ))}
                </div>

                <div className="grid grid-cols-[auto_1fr] gap-x-0 mt-6">
                    <div>
                        <NumberedAction content="3" />
                    </div>

                    <div>
                        <h2 className="text-xl font-semibold mb-2">
                        Start a community energy group
                        </h2>
                        <p className="font-light mb-2">
                        If there are no community energy groups near you, use our simple guide below to get started creating your own community energy group. It's super easy and is an ideal way of building an effective team of people to make community wind projects happen.  
                        </p>
                        <p className="font-bold mb-2">
                            Warning: you may make friends for life!
                        </p>
                        <a className="hidden sm:block" href="https://openwind.energy">
                            <Button className="text-md mt-[0.7rem] left-0 bg-blue-600 text-white sm:text-md px-4 py-2 rounded-md hover:bg-blue-700 z-40 inline-flex items-center justify-center gap-2">
                            Guide to creating community energy group
                            </Button>
                        </a>

                    </div>
                </div>

                <a className="sm:hidden" href="https://openwind.energy">
                    <Button className="w-full sm:w-auto text-xs mt-[0.7rem] left-0 bg-blue-600 text-white sm:text-md px-4 py-2 rounded-md hover:bg-blue-700 z-40 gap-2">
                    Guide to creating community energy group
                    </Button>
                </a>

                <div className="clear-left"></div>

            </div>

            )}


        </section>

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
            <div className="fixed w-full h-full top-0 left-0 inset-0 bg-black bg-opacity-50 z-[1000]"></div>

            {/* Modal */}
            <div className="fixed w-full h-full top-0 left-0 inset-0 z-[1001] flex items-center justify-center">
            <div className="bg-white border border-gray-300 shadow-lg rounded-lg p-6 max-w-sm w-full mx-4">
                <div className="mb-3 text-center">
                    <strong className="font-bold block">Set cookie</strong>
                </div>
                <p className="text-sm text-gray-700">
                We'd like to store a cookie to track who you are and prevent fraudulent voting. Is that okay?
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

    {/* Cesium viewer */}
    <CesiumModal longitude={turbinePosition.longitude} latitude={turbinePosition.latitude} isOpen={showCesiumViewer} onClose={()=>setShowCesiumViewer(false)} />

    </main>

    <footer>
          <PartnerLogos />
    </footer>

    </div>

  );
}
