'use client';

import { useParams } from 'next/navigation';
import VotewindMap from '@/components/votewind-map';

export default function Page() {
  const params = useParams();
    
  return (
      <VotewindMap hideInfo={true}/>
  );
}
