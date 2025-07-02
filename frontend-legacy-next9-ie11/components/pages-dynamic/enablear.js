'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function EnableAR() {
  const router = useRouter();

  useEffect(() => {
    console.log("Setting session and redirecting...");
    sessionStorage.setItem('votewind-use-ar', 'true');
    router.replace('/');
  }, []);

  return <p>Enabling AR…</p>;
}
