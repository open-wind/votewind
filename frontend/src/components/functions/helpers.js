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

export function getWebGLInfo() {
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

  if (!gl) return null;

  return {
    maxTextureUnits: gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS),
    maxRenderBufferSize: gl.getParameter(gl.MAX_RENDERBUFFER_SIZE),
    maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
  };
}

export const isLowEndGPU = () => {
  const gpuInfo = getWebGLInfo();
  return gpuInfo && gpuInfo.maxTextureSize < 4096; // very rough threshold
}

/**
 * Checks if the current device is an iOS device and optionally matches a specific version.
 * @param {number} [majorVersion] - Optional. The major iOS version to check for (e.g., 14).
 * @param {number} [minorVersion] - Optional. The minor iOS version to check for (e.g., 0 for 14.0).
 * @returns {boolean} True if it's an iOS device (and matches version if specified), false otherwise.
 * @returns {object|null} If no version is specified, returns {major, minor} or null if not iOS.
 */
export function isIOS(majorVersion, minorVersion) {
    const userAgent = navigator.userAgent || '';

    let detectedMajor = null;
    let detectedMinor = null;
    let detectedPatch = 0;

    // Pattern 1: Standard iOS Device User-Agent (e.g., "iPhone OS 14_0", "iPad OS 14_0")
    if (/iPad|iPhone|iPod/.test(userAgent)) {
        const osVersionMatch = userAgent.match(/OS (\d+)_(\d+)(?:_(\d+))?/);
        if (osVersionMatch) {
            detectedMajor = parseInt(osVersionMatch[1], 10);
            detectedMinor = parseInt(osVersionMatch[2], 10);
            detectedPatch = osVersionMatch[3] ? parseInt(osVersionMatch[3], 10) : 0;
        }
    }
    // Pattern 2: BrowserStack's Peculiar macOS-like User-Agent for iOS Safari 14
    // "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) ... Version/14.0 Safari/605.1.15"
    else if (/Macintosh/.test(userAgent) && /Safari/.test(userAgent) && !/Chrome/.test(userAgent)) {
        const safariVersionMatch = userAgent.match(/Version\/(\d+)\.(\d+)(?:.(\d+))?\sSafari/);
        if (safariVersionMatch) {
            detectedMajor = parseInt(safariVersionMatch[1], 10);
            detectedMinor = parseInt(safariVersionMatch[2], 10);
            detectedPatch = safariVersionMatch[3] ? parseInt(safariVersionMatch[3], 10) : 0;
        }
    }

    // If no version was detected by either pattern, it's not an identified iOS platform
    if (detectedMajor === null) {
        return false; // Not an identified iOS platform
    }

    const iosInfo = {
        major: detectedMajor,
        minor: detectedMinor,
        patch: detectedPatch
    };

    // If no target version is specified, return the detected version info object
    if (majorVersion === undefined) {
        return iosInfo;
    }

    // If a target version is specified, compare it
    if (detectedMajor === majorVersion) {
        if (minorVersion !== undefined) {
            return detectedMinor === minorVersion;
        }
        return true; // Major version matches
    }

    return false; // Version doesn't match
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
