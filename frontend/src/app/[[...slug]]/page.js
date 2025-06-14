'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Default from '@/components/pages-dynamic/default';
import LongitudeLatitudeZoomPage from '@/components/pages-dynamic/longitude-latitude-zoom';
import LongitudeLatitude3DPage from '@/components/pages-dynamic/longitude-latitude-3d';
import LongitudeLatitudeVote from '@/components/pages-dynamic/longitude-latitude-vote';
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
  const isVote = pathSegments?.length === 3 && !isNaN(Number(pathSegments[0])) && !isNaN(Number(pathSegments[1])) && pathSegments[2] === 'vote';
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

  if (isDefault) return <Default/>;
  if (isMapRoute) return <LongitudeLatitudeZoomPage longitude={pathSegments[0]} latitude={pathSegments[1]} zoom={pathSegments[2]} />;
  if (is3D) return <LongitudeLatitude3DPage longitude={pathSegments[0]} latitude={pathSegments[1]} />;
  if (isVote) return <LongitudeLatitudeVote longitude={pathSegments[0]} latitude={pathSegments[1]} />;
  if (isLeaderboard) return <Leaderboard/>;
  if (isConfirmationError) return <ConfirmationError />;
  if (isEnableAR) return <EnableAR/>;
  if (isOverviewMap) return <p>Redirecting to overview map…</p>; 

  return <NotFound />;

}
