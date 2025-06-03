'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import Default from '@/components/pages-dynamic/default';
import LongitudeLatitudeZoomPage from '@/components/pages-dynamic/longitude-latitude-zoom';
import LongitudeLatitude3DPage from '@/components/pages-dynamic/longitude-latitude-3d';
import LongitudeLatitudeVote from '@/components/pages-dynamic/longitude-latitude-vote';
import VoteWindMap from '@/components/votewind-map';
import ConfirmationError from '@/components/pages-dynamic/confirmation-error';
import NotFound from '@/components/not-found';

export default function ClientRouter() {
  const pathname = usePathname();
  const [pathSegments, setPathSegments] = useState(null);
  const [hydrated, setHydrated] = useState(false);

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

  // Wait until hydrated AND segments are ready
  if (!hydrated || pathSegments === null) return null;

  const isDefault = pathSegments.length === 0;
  const isMapRoute = (pathSegments.length === 3) && pathSegments.every(seg => !isNaN(Number(seg)));
  const is3D = (pathSegments.length === 3) && !isNaN(Number(pathSegments[0])) && !isNaN(Number(pathSegments[1])) && (pathSegments[2] === '3d');
  const isVote = (pathSegments.length === 3) && !isNaN(Number(pathSegments[0])) && !isNaN(Number(pathSegments[1])) && (pathSegments[2] === 'vote');
  const isOverviewMap = (pathSegments.length === 1) && (pathSegments[0] === 'map');
  const isConfirmationError = (pathSegments.length === 1) && (pathSegments[0] === 'confirmationerror');

  if (isDefault) return <Default/>;
  if (isMapRoute) return <LongitudeLatitudeZoomPage longitude={pathSegments[0]} latitude={pathSegments[1]} zoom={pathSegments[2]} />;
  if (is3D) return <LongitudeLatitude3DPage longitude={pathSegments[0]} latitude={pathSegments[1]} />;
  if (isVote) return <LongitudeLatitudeVote longitude={pathSegments[0]} latitude={pathSegments[1]} />;
  if (isOverviewMap) return <VoteWindMap hideInfo={true} type="overview"/>;
  if (isConfirmationError) return <ConfirmationError />;

  return <NotFound />;

}
