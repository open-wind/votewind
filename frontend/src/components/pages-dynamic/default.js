'use client';

import { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import Home from "@/components/home";
import DetailedMap from "@/components/detailed-map";
import { API_BASE_URL } from '@/lib/config';

export const dynamic = 'force-static';

export default function Default() {
  const searchParams = useSearchParams();
  const [isReady, setIsReady] = useState(false);
  const [data, setData] = useState(null);
  const [subdomain, setSubdomain] = useState(null);

  useEffect(() => {
    const sd = getSubdomain();

    if (sd === null ) {
      setIsReady(true);
      return;
    }
    
    fetch(API_BASE_URL + `/api/boundary?query=${sd}`)
      .then(res => res.json())
      .then((data) => {
        setData(data);
        setSubdomain(sd);
        setIsReady(true);
      })
      .catch((error) => {
        setIsReady(true);
        // console.error;
      }
    );
  }, []);

  const longitude = useMemo(() => {
      const raw = searchParams.get('longitude');
      if (!raw) return null;
      return parseFloat(raw);
  }, [searchParams]);

  const latitude = useMemo(() => {
      const raw = searchParams.get('latitude');
      if (!raw) return null;
      return parseFloat(raw);
  }, [searchParams]);

  const getSubdomain = () => {
    return 'east-sussex';

    const host = window.location.hostname;
    const parts = host.split('.');
    if (parts.length > 2) {
      return parts[0]; // e.g., 'east-sussex'
    }
    return null;
  };

  if (!isReady) return null;

  return subdomain !== null
  ? <DetailedMap longitude={longitude} latitude={latitude} subdomain={subdomain} data={data} />
  : <Home />;

}
