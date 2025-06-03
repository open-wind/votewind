'use client';

import { useEffect, useState } from 'react';
import Home from "@/components/home";
import DetailedMap from "@/components/detailed-map";
import { API_BASE_URL } from '@/lib/config';

export const dynamic = 'force-static';

export default function Default() {
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

  const getSubdomain = () => {
    const host = window.location.hostname;
    const parts = host.split('.');
    if (parts.length > 2) {
      return parts[0]; // e.g., 'east-sussex'
    }
    return null;
  };

  return (
    isReady && (
      subdomain !== null ? (
        <DetailedMap subdomain={subdomain} data={data} />
      ) : (
        <Home/>
      )
    )
  );

}
