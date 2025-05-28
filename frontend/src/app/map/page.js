'use client';

import { useParams } from 'next/navigation';
import VoteWindMap from '@/components/votewind-map';

export default function Page() {
  const params = useParams();
    
  return (
      <VoteWindMap hideInfo={true} type="overview"/>
  );
}
