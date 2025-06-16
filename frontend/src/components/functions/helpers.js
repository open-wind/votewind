'use client';

import { useEffect, useState } from 'react';
import chroma from 'chroma-js';
import { 
    APP_BASE_URL,
    TURBINE_AR_DEFAULT_HUBHEIGHT,
    TURBINE_AR_DEFAULT_BLADERADIUS
} from '@/lib/config';

export function useIsMobile(bp = 640) {

  const [m, setM] = useState(
    typeof window !== 'undefined' && window.innerWidth <= bp
  );

  useEffect(() => {
    const fn = () => setM(window.innerWidth <= bp);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, [bp]);
  return m;
}

const colorStops = [
  [0.0, 'purple'],
  [0.31645, 'red'],
  [0.31646, 'darkorange'],
  [0.37975, 'orange'],
  [0.535, 'yellow'],
  [0.69, 'lightgreen'],
  [0.845, 'green'],
  [1.0, 'darkgreen'],
];

export const windspeedToInterpolatedColor = (windspeed) => {
  const value = Number(windspeed) / 15.8;

  // Find surrounding stops
  for (let i = 0; i < colorStops.length - 1; i++) {
    const [stop1, color1] = colorStops[i];
    const [stop2, color2] = colorStops[i + 1];

    if (value >= stop1 && value <= stop2) {
      const t = (value - stop1) / (stop2 - stop1); // 0..1
      return chroma.mix(color1, color2, t).hex(); // interpolated hex color
    }
  }

  // If above 1.0 or below 0
  return value <= 0 ? 'purple' : 'darkgreen';
};

export const windspeed2Classname = (windspeed) => {
    const convertedvalue = parseFloat(windspeed / 15.8);
    if (convertedvalue == 0) return 'text-white';
    if (convertedvalue <= 0.31645) return 'text-white';
    if (convertedvalue <= 0.31646) return 'text-gray-800';
    if (convertedvalue <= 0.37975) return 'text-gray-800';
    if (convertedvalue <= 0.535) return 'text-gray-800';
    if (convertedvalue <= 0.69) return 'text-gray-800';
    if (convertedvalue <= 0.845) return 'text-gray-800';
    return 'text-white';
}

export const createQRCode = (parameters) => {
    const hubheight = (parameters.hubheight) ? parameters.hubheight: TURBINE_AR_DEFAULT_HUBHEIGHT;
    const bladeradius = (parameters.bladeradius) ? parameters.bladeradius: TURBINE_AR_DEFAULT_BLADERADIUS;
    const qrcode_url = APP_BASE_URL + '/ar/' + String(parameters.longitude) + '/' + String(parameters.latitude) + '/' + String(hubheight) + '/' + String(bladeradius);
    return qrcode_url;
}
