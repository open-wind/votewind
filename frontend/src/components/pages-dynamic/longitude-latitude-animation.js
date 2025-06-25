'use client';

import { useSearchParams } from 'next/navigation';
import { useMemo } from 'react';
import CesiumViewer from '../cesium-viewer';

export default function LongitudeLatitudeAnimation({longitude=null, latitude=null}) {
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
    <div className="fixed top-0 left-0 w-full h-full inset-0 z-[9999] bg-black bg-opacity-50 flex items-center justify-center pointer-events-auto">
      <div className="relative w-full h-full bg-white overflow-hidden">
        <div className="w-full h-full">
          <CesiumViewer longitude={parseFloat(longitude)} latitude={parseFloat(latitude)} showui={false} animate={true} />
        </div>
      </div>
    </div>
  );
}
