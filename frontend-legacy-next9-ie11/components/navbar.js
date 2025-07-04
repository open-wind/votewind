'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Menu, X } from 'lucide-react'; // icons from lucide-react (shadcn uses it)
import { APP_BASE_URL, CONTENT_BASE_URL } from '@/lib/config';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [pathname, setPathname] = useState('');
  const router = useRouter();

  useEffect(() => {
    if (router && router.asPath) {
      setPathname(router.asPath.split('?')[0]);
    }
  }, []);

useEffect(() => {
  const el = document.querySelector('.hamburger-button');
  if (el) {
    el.addEventListener('click', () => console.log('Native DOM click fired'));
  }
}, []);

  // List or pattern of routes where Navbar should be hidden
  const hideNavbarOn = [
    /^\/-?\d+(\.\d+)?\/-?\d+(\.\d+)?\/animation\/?$/
  ];

  const shouldHide = hideNavbarOn.some((pattern) =>
    typeof pattern === 'string' ? pattern === pathname : pattern.test(pathname)
  );

  if (shouldHide) return null;

  return (
  <nav className="fixed top-0 h-20 left-0 w-full z-50 bg-gradient-to-b from-white/80 to-white/0 text-black px-4 py-2 flex justify-between items-center pointer-events-none">

    <div
      className="absolute left-0 top-0 w-full h-full p-0 inset-0 -z-10 pointer-events-none nav-fallback-bg backdrop-blur-lg mask-fade-top " style={{
        WebkitMaskImage: 'linear-gradient(black 50%, transparent 100%)',
        maskImage:       'linear-gradient(black 50%, transparent 100%)',
      }}
    ></div>

   <div className="absolute inset-x-0 top-0 h-14 flex items-center justify-between px-4 sm:px-6 font-bold pointer-events-auto">

      <div className="text-xl pl-1" style={{ textShadow: '0 0px 20px rgba(255,255,255,0)' }}>
        <a href={APP_BASE_URL}><span className="text-black font-light sm:font-light tracking-wide sm:tracking-normal pr-[1px]">VoteWind.org</span></a>
      </div>

      {/* Desktop links */}
      <div className="space-x-6 hidden pr-2 md:flex items-right text-sm text-black font-medium tracking-wider pl-1" style={{ textShadow: '0 0px 30px rgba(255,255,255,1)' }}>
        <a href={APP_BASE_URL} className="hover:underline">START</a>
        <a href={APP_BASE_URL + "/map"} className="hover:underline">MAP</a>
        <a href={APP_BASE_URL + "/leaderboard"} className="hover:underline">LEADERBOARD</a>
        <a href={CONTENT_BASE_URL + "/about"} className="hover:underline">ABOUT</a>
        <a href={CONTENT_BASE_URL + "/resources"} className="hover:underline">RESOURCES</a>
        <a href={CONTENT_BASE_URL + "/news"} className="hover:underline">NEWS</a>
        <span style={{fontSize: "7px", color: "#333333", textAlign: "center"}}>LEGACY<br/>VERSION 1.0</span>
      </div>

      {/* Mobile toggle button */}
      <div
        className="md:hidden text-gray-700 pointer-events-auto"
          onClick={() => {
            console.log("Click received");
              setIsOpen(!isOpen);
          }}
          aria-label="Toggle menu"
        >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </div>

      {/* Mobile menu dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 w-full bg-white font-light shadow-md flex flex-col items-start px-4 py-2 md:hidden z-50">
          <a href={APP_BASE_URL} className="py-2 w-full hover:underline">Home</a>
          <a href={APP_BASE_URL + "/map"} className="py-2 w-full hover:underline">Map</a>
          <a href={APP_BASE_URL + "/leaderboard"} className="py-2 w-full hover:underline">Leaderboard</a>
          <a href={CONTENT_BASE_URL + "/about"} className="py-2 w-full hover:underline">About</a>
          <a href={CONTENT_BASE_URL + "/resources"} className="py-2 w-full hover:underline">Resources</a>
          <a href={CONTENT_BASE_URL + "/news"} className="py-2 w-full hover:underline">News</a>
          <span style={{fontSize: "8px", color: "#333333", textAlign: "center"}}>Legacy Browser Version 1.0</span>
        </div>
      )}

    </div>

  </nav>
  );
}
