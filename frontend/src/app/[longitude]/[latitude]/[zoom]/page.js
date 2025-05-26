'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { useMemo } from 'react';
import VotewindMap from '@/components/votewind-map';

export default function Page() {
  const params = useParams();
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

  return (
    <div>
      <VotewindMap longitude={params.longitude} latitude={params.latitude} zoom={params.zoom} bounds={bounds} />
      {params.latitude} {params.longitude} {params.zoom} {bounds !== null ? bounds.join(", ") : ''}
    </div>
  );
}
