"use client";

import { useEffect, useState } from "react";

export default function ErrorOverlay({ children }) {
  const [error, setError] = useState(null);

  useEffect(() => {
    const onError = (e) => setError(e.message);
    const onRejection = (e) => setError(String(e.reason?.message || e.reason));

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);

    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return (
    <>
      {error && (
        <div style={{
          background: 'red',
          color: 'white',
          fontSize: '14px',
          padding: '10px',
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          zIndex: 9999,
          fontFamily: 'monospace',
        }}>
          💥 Client error: {error}
        </div>
      )}
      {children}
    </>
  );
}
