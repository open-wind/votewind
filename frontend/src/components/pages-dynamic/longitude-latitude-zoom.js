'use client';

import { useSearchParams } from 'next/navigation';
import { useMemo } from 'react';
import VoteWindMap from '@/components/votewind-map';

export default function LongitudeLatitudeZoomPage({ longitude=null, latitude=null, zoom=null}) {
  const searchParams = useSearchParams();

  const bounds = useMemo(() => {
    const raw = searchParams.get('bounds');
    if (!raw) return null;

    const parts = raw.split(',').map(Number);
    if (parts.length !== 4 || parts.some(isNaN)) return null;

    // Convert to MapLibre format: [[west, south], [east, north]]
    return [
      [parts[0], parts[1]], // southwest
      [parts[2], parts[3]], // northeast
    ];
  }, [searchParams]);

  const type = useMemo(() => {
    const raw = searchParams.get('type');
    if (!raw) return '';
    return raw;
  }, [searchParams]);

  const turbineAtCentre = useMemo(() => {
    const raw = searchParams.get('selectturbine');
    if (!raw) return '';
    return true;
  }, [searchParams]);

  const style = useMemo(() => {
    const raw = searchParams.get('style');
    if (!raw) return null;
    return raw;
  }, [searchParams]);

  return (
    <div>
      <VoteWindMap longitude={longitude} latitude={latitude} zoom={zoom} bounds={bounds} type={type} turbineAtCentre={turbineAtCentre} style={style} />
    </div>
  );
}
