'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/components/session-context';

export default function EnableAR() {
  const { setSessionValue } = useSession();
  const router = useRouter();

  useEffect(() => {
      console.log("Setting session and redirecting...");

    setSessionValue('ar-is-enabled');
    router.replace('/');
  }, [setSessionValue, router]);

  return <p>Enabling AR…</p>;
}
