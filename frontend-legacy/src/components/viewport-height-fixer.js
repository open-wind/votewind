// src/components/ViewportHeightFixer.js
"use client";
import { useEffect } from "react";

export default function ViewportHeightFixer() {
  useEffect(() => {
    const setViewportHeight = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };

    setViewportHeight();

    window.addEventListener('resize', setViewportHeight);
    window.addEventListener('orientationchange', setViewportHeight);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) setTimeout(setViewportHeight, 300); // settle after returning
    });

    return () => {
      window.removeEventListener('resize', setViewportHeight);
      window.removeEventListener('orientationchange', setViewportHeight);
    };
  }, []);

  return null; // No visual output needed
}
