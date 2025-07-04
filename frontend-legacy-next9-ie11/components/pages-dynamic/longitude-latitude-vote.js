'use client';

import { useRouter } from 'next/router';
import { useMemo } from 'react';
import VoteCastMap from '@/components/votecast-map';

export default function LongitudeLatitudeVote({longitude=null, latitude=null}) {
  const router = useRouter();
  const searchParams = router.query;

  const type = useMemo(() => {
    const raw = searchParams.type;
    if (!raw) return null;
    return raw;
  }, [searchParams.type]);

  const emailused = useMemo(() => {
    const raw = searchParams.emailused;
    if (!raw) return null;
    return raw;
  }, [searchParams.emailused]);

  return (
    <VoteCastMap longitude={longitude} latitude={latitude} type={type} emailused={emailused} />
  );
}
