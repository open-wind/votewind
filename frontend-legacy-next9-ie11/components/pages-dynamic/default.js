import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/router';
import Home from "@/components/home";
import DetailedMap from "@/components/detailed-map";
import { API_BASE_URL } from '@/lib/config';

export default function Default() {
  const router = useRouter();
  const searchParams = router.query;
  const [isReady, setIsReady] = useState(false);
  const [data, setData] = useState(null);
  const [subdomain, setSubdomain] = useState(null);

  useEffect(() => {
    const sd = getSubdomain();

    if (sd === null) {
      setIsReady(true);
      return;
    }

    fetch(`${API_BASE_URL}/api/boundary?query=${sd}`)
      .then(res => res.json())
      .then((data) => {
        setData(data);
        setSubdomain(sd);
        setIsReady(true);
      })
      .catch(() => {
        setIsReady(true);
      });
  }, []);

  const longitude = useMemo(() => {
    const raw = searchParams.longitude;
    if (!raw) return null;
    return parseFloat(Array.isArray(raw) ? raw[0] : raw);
  }, [searchParams.longitude]);

  const latitude = useMemo(() => {
    const raw = searchParams.latitude;
    if (!raw) return null;
    return parseFloat(Array.isArray(raw) ? raw[0] : raw);
  }, [searchParams.latitude]);

  const getSubdomain = () => {
    if (typeof window === 'undefined') return null;
    const host = window.location.hostname;
    const parts = host.split('.');
    if (parts.length > 2) {
      if (!isNaN(parts[0])) return null;
      return parts[0]; // e.g. 'east-sussex'
    }
    return null;
  };

  if (!isReady) return null;

  return subdomain !== null
    ? <DetailedMap longitude={longitude} latitude={latitude} subdomain={subdomain} data={data} />
    : <Home />;
}
