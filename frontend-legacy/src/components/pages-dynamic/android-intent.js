'use client';

import { useEffect } from 'react';
import { createQRCode } from '@/components/functions/helpers';

export default function AndroidIntent({ type = null, longitude = null, latitude = null, hubheight = null, bladeradius = null }) {
  const intent_data = createQRCode({ longitude, latitude, hubheight, bladeradius });

  useEffect(() => {
    const android_intent = `intent://#Intent;S.data=${intent_data};scheme=votewind-ar;package=org.votewind.viewer;end`;
    console.log("Redirecting to:", android_intent);
    window.location.href = android_intent;
  }, [intent_data]);

  return (
    <div className="flex items-center justify-center h-screen">
      <h1 className="text-center">Redirecting to Android app...</h1>
    </div>
  );
}
