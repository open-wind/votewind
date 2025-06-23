// src/components/ClientPolyfills.js
"use client"; // <<< This directive is CRUCIAL

import { useEffect } from 'react'; // Not strictly needed for this polyfill, but good practice for client components

// Polyfill ResizeObserver if it's not natively available
if (typeof window !== 'undefined' && !window.ResizeObserver) {
  import('@juggle/resize-observer')
    .then(({ ResizeObserver }) => {
      window.ResizeObserver = ResizeObserver;
      console.log('ResizeObserver polyfill loaded successfully on client.');
    })
    .catch(error => {
      console.error('Failed to load ResizeObserver polyfill:', error);
    });
}

// This component doesn't render anything visually, it just ensures the polyfill runs.
export default function ClientPolyfills() {
  // You could use a useEffect here for more complex polyfill logic
  // that needs to run after mount, but for simple window.global assignments,
  // it's often fine directly at the top level of the client component.
  return null;
}