'use client';

import { useSearchParams } from 'next/navigation';
import { useMemo } from 'react';
import VoteCastMap from '@/components/votecast-map';
import PartnerLogos from '@/components/partner-logos';

export default function LongitudeLatitudeVote({longitude=null, latitude=null}) {
  const searchParams = useSearchParams();

  const type = useMemo(() => {
    const raw = searchParams.get('type');
    if (!raw) return null;
    return raw;
  }, [searchParams]);

  const emailused = useMemo(() => {
    const raw = searchParams.get('emailused');
    if (!raw) return null;
    return raw;
  }, [searchParams]);

  return (
    <div>
      <VoteCastMap longitude={longitude} latitude={latitude} type={type} emailused={emailused} />
      <PartnerLogos />

    </div>
  );
}
