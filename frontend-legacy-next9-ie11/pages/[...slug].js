'use client';

import React from 'react';


import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Default from '@/components/pages-dynamic/default';
import LongitudeLatitudeZoomPage from '@/components/pages-dynamic/longitude-latitude-zoom';
import AndroidIntent from '@/components/pages-dynamic/android-intent';
import LongitudeLatitudeVote from '@/components/pages-dynamic/longitude-latitude-vote';
import Leaderboard from '@/components/pages-dynamic/leaderboard';
import ConfirmationError from '@/components/pages-dynamic/confirmation-error';
import NotFound from '@/components/not-found';
import { MAP_OVERVIEW_PARAMETERS } from '@/lib/config';

// export default function HomePage() {
//   const mapContainerRef = useRef(null);

//   useEffect(() => {
//     // Load MapLibre script + CSS dynamically
//     const link = document.createElement('link');
//     link.href = 'https://unpkg.com/maplibre-gl@1.14.0/dist/maplibre-gl.css';
//     link.rel = 'stylesheet';
//     document.head.appendChild(link);

//     const script = document.createElement('script');
//     script.src = 'https://unpkg.com/maplibre-gl@1.14.0/dist/maplibre-gl.js';
//     script.onload = () => {
//       const map = new window.maplibregl.Map({
//         container: mapContainerRef.current,
//         style: 'https://tiles.votewind.org/styles/openmaptiles/style.json',
//         center: [-0.1276, 51.5074], // London
//         zoom: 5
//       });
//     };
//     document.body.appendChild(script);

//     return () => {
//       // Clean up
//       document.head.removeChild(link);
//       document.body.removeChild(script);
//     };
//   }, []);

//   return (
//     <div
//       ref={mapContainerRef}
//       style={{ width: '100vw', height: '100vh' }}
//     />
//   );
// }

export default function ClientRouter() {
  const router = useRouter();
  const pathname = router.asPath.split('?')[0];
  const [pathSegments, setPathSegments] = useState(null);
  const [hydrated, setHydrated] = useState(false);
  const hasRedirectedRef = useRef(false);
  
  // Wait until client-side hydration completes
  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || typeof pathname !== 'string') return;

    try {
      const decoded = decodeURIComponent(pathname);
      const segments = decoded.split('/').filter(Boolean);
      setPathSegments(segments);
    } catch {
      setPathSegments([]);
    }
  }, [hydrated, pathname]);

  const isDefault = pathSegments?.length === 0;
  const isMapRoute = pathSegments?.length === 3 && pathSegments.every(seg => !isNaN(Number(seg)));
  const is3D = pathSegments?.length === 3 && !isNaN(Number(pathSegments[0])) && !isNaN(Number(pathSegments[1])) && pathSegments[2] === '3d';
  const isAR = pathSegments?.length === 5 && pathSegments[0] === 'ar' && !isNaN(Number(pathSegments[1])) && !isNaN(Number(pathSegments[2])) && !isNaN(Number(pathSegments[3])) && !isNaN(Number(pathSegments[4]));
  const isVote = pathSegments?.length === 3 && !isNaN(Number(pathSegments[0])) && !isNaN(Number(pathSegments[1])) && pathSegments[2] === 'vote';
  const isOverviewMap = pathSegments?.[0] === 'map';
  const isLeaderboard = pathSegments?.length === 1 && pathSegments[0] === 'leaderboard';
  const isConfirmationError = pathSegments?.length === 1 && pathSegments[0] === 'confirmationerror';

  useEffect(() => {
    if (isOverviewMap && !hasRedirectedRef.current) {
      hasRedirectedRef.current = true;
      const url = `/${MAP_OVERVIEW_PARAMETERS.longitude}/${MAP_OVERVIEW_PARAMETERS.latitude}/${MAP_OVERVIEW_PARAMETERS.zoom}/?style=overview`;
      router.replace(url);
    }
  }, [isOverviewMap, router]);

  if (!hydrated || pathSegments === null) return null;

  
  if (isDefault) return <Default/>;
  if (isMapRoute) return <LongitudeLatitudeZoomPage longitude={pathSegments[0]} latitude={pathSegments[1]} zoom={pathSegments[2]} />;
  if (isAR) return <AndroidIntent type="ar" longitude={pathSegments[1]} latitude={pathSegments[2]} hubheight={pathSegments[3]} bladeradius={pathSegments[4]} />;
  if (isVote) return <LongitudeLatitudeVote longitude={pathSegments[0]} latitude={pathSegments[1]} />;
  if (isLeaderboard) return <Leaderboard/>;
  if (isConfirmationError) return <ConfirmationError />;
  if (isOverviewMap) return <p>Redirecting to overview map…</p>; 

  return <NotFound />;

}
