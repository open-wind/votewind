import { useEffect, useState } from 'react';

export default function WebGLCheck({ children }) {
  const [webglOk, setWebglOk] = useState(true);

  useEffect(() => {
    let supported = false;
    try {
      const canvas = document.createElement('canvas');
      supported = !!(window.WebGLRenderingContext &&
        (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
    } catch (e) {
      supported = false;
    }
    setWebglOk(supported);
  }, []);

  if (!webglOk) {
return (
  <div style={{
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    backgroundColor: '#ccc',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999
  }}>
    <div style={{
      background: '#fff',
      padding: '2rem',
      borderRadius: '8px',
      boxShadow: '0 0 10px rgba(0,0,0,0.2)',
      maxWidth: '400px',
      textAlign: 'center'
    }}>
      <strong style={{ fontSize: '1.2rem', display: 'block', marginBottom: '0.5rem' }}>
        Your browser lacks WebGL support
      </strong>
      <div>
        Please upgrade your browser or enable WebGL to use VoteWind.org
      </div>
    </div>
  </div>
);
  }

  return children;
}
