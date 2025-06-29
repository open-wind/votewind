'use client';

import CesiumViewer from '@/components/cesium-viewer';

export default function LongitudeLatitude3DPage({ longitude=null, latitude=null }) {
  return (
    <div>
      <CesiumViewer longitude={longitude} latitude={latitude}/>
    </div>
  );
}

