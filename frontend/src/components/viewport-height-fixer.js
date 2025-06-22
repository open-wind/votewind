// src/components/ViewportHeightFixer.js
"use client";
import { useEffect } from "react";

export default function ViewportHeightFixer() {
  useEffect(() => {
    const setViewportHeight = () => {
      const vh = Math.floor(window.innerHeight * 100) / 10000;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };

    setViewportHeight();
    window.addEventListener('resize', setViewportHeight);
    return () => window.removeEventListener('resize', setViewportHeight);
  }, []);

  return null; // No visual output needed
}
