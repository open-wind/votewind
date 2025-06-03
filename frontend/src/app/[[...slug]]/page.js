'use client';

import { usePathname } from 'next/navigation';
import Default from '@/components/pages-dynamic/default';
import LongitudeLatitudeZoomPage from '@/components/pages-dynamic/longitude-latitude-zoom';
import LongitudeLatitude3DPage from '@/components/pages-dynamic/longitude-latitude-3d';
import LongitudeLatitudeVote from '@/components/pages-dynamic/longitude-latitude-vote';
import NotFound from '@/components/not-found';

export default function ClientRouter() {
  const pathname = usePathname();
  const pathSegments = decodeURIComponent(pathname).split('/').filter(Boolean);
  
  const isDefault = (pathSegments.length === 0);
  const isMapRoute = (pathSegments.length === 3) && pathSegments.every(seg => !isNaN(Number(seg)));
  const is3D = (pathSegments.length === 3) && !isNaN(Number(pathSegments[0])) && !isNaN(Number(pathSegments[1])) && (pathSegments[2] === '3d');
  const isVote = (pathSegments.length === 3) && !isNaN(Number(pathSegments[0])) && !isNaN(Number(pathSegments[1])) && (pathSegments[2] === 'vote');

  if (isDefault) return <Default/>;
  if (isMapRoute) return <LongitudeLatitudeZoomPage longitude={pathSegments[0]} latitude={pathSegments[1]} zoom={pathSegments[2]} />;
  if (is3D) return <LongitudeLatitude3DPage longitude={pathSegments[0]} latitude={pathSegments[1]} />;
  if (isVote) return <LongitudeLatitudeVote longitude={pathSegments[0]} latitude={pathSegments[1]} />;

  // Fallback for unmatched routes
  return <NotFound />;
}
