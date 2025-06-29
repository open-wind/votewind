'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Default from '@/components/pages-dynamic/default';
import LongitudeLatitudeZoomPage from '@/components/pages-dynamic/longitude-latitude-zoom';
import LongitudeLatitude3DPage from '@/components/pages-dynamic/longitude-latitude-3d';
import AndroidIntent from '@/components/pages-dynamic/android-intent';
import LongitudeLatitudeVote from '@/components/pages-dynamic/longitude-latitude-vote';
import LongitudeLatitudeAnimation from '@/components/pages-dynamic/longitude-latitude-animation';
import Leaderboard from '@/components/pages-dynamic/leaderboard';
import ConfirmationError from '@/components/pages-dynamic/confirmation-error';
import EnableAR from '@/components/pages-dynamic/enablear';
import NotFound from '@/components/not-found';
import { MAP_OVERVIEW_PARAMETERS } from '@/lib/config';

export default function ClientRouter() {
  const pathname = usePathname();
  const router = useRouter();
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
  const isAnimation = pathSegments?.length === 3 && !isNaN(Number(pathSegments[0])) && !isNaN(Number(pathSegments[1])) && pathSegments[2] === 'animation';
  const isOverviewMap = pathSegments?.[0] === 'map';
  const isLeaderboard = pathSegments?.length === 1 && pathSegments[0] === 'leaderboard';
  const isConfirmationError = pathSegments?.length === 1 && pathSegments[0] === 'confirmationerror';
  const isEnableAR = pathSegments?.[0] === 'enablear';

  useEffect(() => {
    if (isOverviewMap && !hasRedirectedRef.current) {
      hasRedirectedRef.current = true;
      const url = `/${MAP_OVERVIEW_PARAMETERS.longitude}/${MAP_OVERVIEW_PARAMETERS.latitude}/${MAP_OVERVIEW_PARAMETERS.zoom}/?style=overview`;
      router.replace(url);
    }
  }, [isOverviewMap, router]);

  if (!hydrated || pathSegments === null) return null;

  return (
    <>
    {isDefault && <Default/>}
    {isMapRoute && <LongitudeLatitudeZoomPage longitude={pathSegments[0]} latitude={pathSegments[1]} zoom={pathSegments[2]} />}
    {is3D && <LongitudeLatitude3DPage longitude={pathSegments[0]} latitude={pathSegments[1]} />}
    {isAR && <AndroidIntent type="ar" longitude={pathSegments[1]} latitude={pathSegments[2]} hubheight={pathSegments[3]} bladeradius={pathSegments[4]} />}
    {isVote && <LongitudeLatitudeVote longitude={pathSegments[0]} latitude={pathSegments[1]} />}
    {isAnimation && <LongitudeLatitudeAnimation longitude={pathSegments[0]} latitude={pathSegments[1]} />}
    {isLeaderboard && <Leaderboard/>}
    {isConfirmationError && <ConfirmationError />}
    {isEnableAR && <EnableAR/>}
    {isOverviewMap && <p>Redirecting to overview map…</p>} 
    </>
  )

}
