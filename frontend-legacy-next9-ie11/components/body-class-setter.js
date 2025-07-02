"use client";
import { useEffect } from "react";

export default function BodyClassSetter({ className }) {
  useEffect(() => {
    if (!className) return;

    document.body.classList.add(className);
    return () => {
      document.body.classList.remove(className);
    };
  }, [className]);

  return null;
}
