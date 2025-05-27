'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import toast, { Toaster } from 'react-hot-toast';
import Map, { AttributionControl, Marker, GeolocateControl } from 'react-map-gl/maplibre';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipArrow, TooltipProvider } from "@/components/ui/tooltip";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import SocialShareButtons from "@/components/social-share-buttons";
import ScrollHint from '@/components/scrollhint'

import maplibregl from 'maplibre-gl';
import debounce from 'lodash.debounce';
import { Check } from 'lucide-react';

import { VOTEWIND_MAPSTYLE, VOTEWIND_COOKIE, MAP_DEFAULT_CENTRE, MAP_DEFAULT_BOUNDS, MAP_PLACE_ZOOM, API_BASE_URL } from '@/lib/config';

import 'maplibre-gl/dist/maplibre-gl.css';

export default function VoteCastMap({ longitude=null, latitude=null, type='', emailused='' }) {
    const mapRef = useRef();
    const markerRef = useRef();
    const panelRef = useRef(null)
    const [turbineAdded, setTurbineAdded] = useState(false);
    const [turbinePosition, setTurbinePosition] = useState({'longitude': parseFloat(longitude), 'latitude': parseFloat(latitude)});
    const [isBouncing, setIsBouncing] = useState(false);
    const [email, setEmail] = useState('');
    const [alertMessage, setAlertMessage] = useState('');
    const [hasConsent, setHasConsent] = useState(null); // null = still loading
    const [showConsentBanner, setShowConsentBanner] = useState(false);
    const [error, setError] = useState('');

    const zoom = MAP_PLACE_ZOOM;
    const initialViewState={
        longitude: longitude,
        latitude: latitude,
        zoom: zoom
    };

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
    <main ref={panelRef} className="pt-14 sm:pt-20 overflow-y-auto">
            <ScrollHint />

        <section className="flex flex-col items-center px-4 ">
            {/* centred text above */}
            {(type === 'votesubmitted') && (
                <>

                    {/* Content: Icon + Text */}
                    <div className="flex mt-1 sm:mt-0 max-w-[800px] mb-4">
                        <div className="flex-shrink-0 w-20 h-20 sm:w-60 sm:h-60">
                            <img
                            alt="Vote"
                            src="/icons/check-mark.svg"
                            className="block"
                            />
                        </div>

                        <div className="ml-4 flex flex-col justify-start mt-0 sm:mt-4">

                            <h1 className="text-2xl font-semibold text-left mb-4">
                                Congratulations!
                            </h1>


                            <h2 className="text-xl font-semibold text-left mb-4">
                                Your vote has been received
                            </h2>

                            <div className="text-sm space-y-2">

                                {(emailused === null) && 
                                (
                                    <p className="font-light">Your turbine position vote will now be included on the <a className="font-medium hover:text-blue-600" target="_new" href="/map">VoteWind.org Voting Map</a>.</p>
                                )}

                                {(emailused !== null) && 
                                (
                                    <>
                                        <p className="font-light">You'll receive an email shortly confirming your vote. Click on the link in the email to confirm your vote and it will appear on the <a className="font-medium hover:text-blue-600" target="_new" href="/map">VoteWind.org Voting Map</a>.</p>
                                        <p className="font-light">Note: <i>your email address will not be visible on the map</i>. We'll never publish your email address and will only contact you about community wind related events and resources.</p> 

                                        <p className="font-light">If you don't receive an email in the next few minutes, check your spam folder or drop us an email at <a className="font-medium hover:text-blue-600" href="mailto:voting@votewind.org">voting@votewind.org</a>.</p>
                                    </>
                            )}

                            <p className="font-light">Details about the turbine position you voted for are provided below.</p>
                            <p className="font-extrabold justify-end">Share your turbine position on social media so others can vote for it!</p>

                            </div>

                        </div>
                    </div>




                </>
            )}


            <Card className="relative w-full max-w-[800px] mx-auto rounded-2xl mt-8 mb-20">

                <CardContent className="flex flex-col sm:flex-row items-center sm:items-start gap-8 pt-6 pb-6 shadow-2xl ">
                {/* Map thumbnail */}
                    <div className="w-[300px] h-[300px] sm:w-[350px] sm:h-[350px] border-[4px] border-black overflow-hidden">
                        <div id="map" className="w-full h-full" >

                            {/* Main map */}
                            <Map
                                ref={mapRef}
                                mapLib={maplibregl}
                                dragPan={false}
                                dragRotate={false}
                                scrollZoom={false}
                                doubleClickZoom={false}
                                boxZoom={false}
                                keyboard={false}
                                touchZoomRotate={false}
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
                                    <img ref={markerRef} className={`${isBouncing ? 'bounce' : ''}`} alt="Wind turbine" width="80" height="80" src="/icons/windturbine_black.png" />
                                </Marker>
                            </Map>

                        </div>
                    </div>

                    {/* Text block */}

                    <div className="flex flex-col justify-between self-stretch text-center sm:text-left">
                        {/* Top-of-column text */}
                        <div>
                            <h1 className="text-4xl font-bold leading-snug mt-0 mb-1">Turbine Position</h1>
                            <h2 className="text-2xl font-light leading-snug">{turbinePosition.latitude.toFixed(5)}° N, {turbinePosition.longitude.toFixed(5)}° E</h2>
                            <p className="mt-1 text-sm text-gray-600">Planning constraints</p>

                        </div>

                        {/* Share panel, pushed to the bottom by flex layout */}
                        {(type === 'votesubmitted') && (
                        <div className="mt-4 sm:mt-0">
                            <SocialShareButtons title="I just voted for a community wind turbine location!" />
                        </div>
                        )}

                    </div>

                </CardContent>
            </Card>

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

            <div className="max-w-screen-xl mx-auto h-full flex flex-col justify-between px-0 sm:px-4 py-1">

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
                    <div className="flex mt-1">
                        <div className="flex-shrink-0 w-20 h-20 sm:w-60 sm:h-60">
                            <img
                            alt="Vote"
                            src="/icons/check-mark.svg"
                            className="block"
                            />
                        </div>

                        <div className="ml-4 flex flex-col justify-start mt-0 sm:mt-4">
                            <h2 className="text-xl sm:text-[24px] font-semibold mb-0">Cast turbine vote</h2>
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





    </main>

  );
}
