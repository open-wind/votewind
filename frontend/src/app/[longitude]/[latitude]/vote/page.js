'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { useMemo } from 'react';
import VoteCastMap from '@/components/votecast-map';
import PartnerLogos from '@/components/partner-logos';

export default function Page() {
  const params = useParams();
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
      <VoteCastMap longitude={params.longitude} latitude={params.latitude} type={type} emailused={emailused} />
      <PartnerLogos />

    </div>
  );
}
