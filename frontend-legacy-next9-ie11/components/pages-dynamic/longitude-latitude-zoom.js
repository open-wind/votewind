const querystring = require('querystring');
import { useRouter } from 'next/router';
import { useMemo } from 'react';
import VoteWindMap from '@/components/votewind-map';

export default function LongitudeLatitudeZoomPage({ longitude = null, latitude = null, zoom = null }) {
  const router = useRouter();
  const searchParams = router.query;

  const bounds = useMemo(() => {
    const raw = searchParams.bounds;
    if (!raw) return null;

    const str = Array.isArray(raw) ? raw[0] : raw;
    const parts = str.split(',').map(Number);
    if (parts.length !== 4 || parts.some(isNaN)) return null;

    // Convert to MapLibre format: [[west, south], [east, north]]
    return [
      [parts[0], parts[1]], // southwest
      [parts[2], parts[3]], // northeast
    ];
  }, [searchParams.bounds]);

  const type = useMemo(() => {
    const raw = searchParams.type;
    if (!raw) return '';
    return Array.isArray(raw) ? raw[0] : raw;
  }, [searchParams.type]);

  const properties = useMemo(() => {
    const raw = searchParams.properties;
    if (!raw) return '';
    const str = Array.isArray(raw) ? raw[0] : raw;
    const props = querystring.parse(str);

    if (longitude && latitude) {
      props.longitude = parseFloat(longitude);
      props.latitude = parseFloat(latitude);
    }

    return props;
  }, [searchParams.properties, longitude, latitude]);

  const turbineAtCentre = useMemo(() => {
    const raw = searchParams.selectturbine;
    return raw ? true : false;
  }, [searchParams.selectturbine]);

  const style = useMemo(() => {
    const raw = searchParams.style;
    if (!raw) return null;
    return Array.isArray(raw) ? raw[0] : raw;
  }, [searchParams.style]);

  return (
    <div>
      <VoteWindMap
        longitude={longitude}
        latitude={latitude}
        zoom={zoom}
        bounds={bounds}
        type={type}
        properties={properties}
        turbineAtCentre={turbineAtCentre}
        style={style}
      />
    </div>
  );
}
