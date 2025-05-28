import { useEffect, useState } from 'react';

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