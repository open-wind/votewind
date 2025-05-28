'use client';

import { useState } from 'react';
import { Menu, X } from 'lucide-react'; // icons from lucide-react (shadcn uses it)

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
  <nav className="fixed top-0 h-20 left-0 w-full z-50 bg-transparent text-black px-4 py-2 flex justify-between items-center pointer-events-none">

    <div
      className="absolute inset-0 -z-10 pointer-events-none backdrop-blur-lg mask-fade-top" style={{
      WebkitMaskImage: 'linear-gradient(black 50%, transparent 100%)',
      maskImage:       'linear-gradient(black 50%, transparent 100%)',
    }}
    ></div>

   <div className="absolute inset-x-0 top-0 h-14 flex items-center justify-between px-4 sm:px-6 font-bold pointer-events-auto">
  
      <div className="text-2xl text-black font-bold pl-1" style={{ textShadow: '0 0px 20px rgba(255,255,255,0.8)' }}>
        <a href="/"><span className="text-blue-600 pr-[1px]">Vote</span><span className="text-blue-800 pr-[1px]">Wind</span></a>
      </div>

      {/* Desktop links */}
      <div className="gap-6 hidden pr-2 md:flex items-right text-sm text-blue-900 font-bold tracking-wider pl-1" style={{ textShadow: '0 0px 30px rgba(255,255,255,1)' }}>
        <a href="/" className="hover:underline">HOME</a>
        <a href="/map" className="hover:underline">MAP</a>
        <a href="/about" className="hover:underline">ABOUT</a>
      </div>

      {/* Mobile toggle button */}
      <div
        className="md:hidden text-gray-700"
        onClick={() => {
            setIsOpen(!isOpen);
        }}
        aria-label="Toggle menu"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </div>

      {/* Mobile menu dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 w-full bg-white font-light shadow-md flex flex-col items-start px-4 py-2 md:hidden z-50">
          <a href="/" className="py-2 w-full hover:underline">Home</a>
          <a href="/map" className="py-2 w-full hover:underline">Map</a>
          <a href="/about" className="py-2 w-full hover:underline">About</a>
        </div>
      )}

    </div>

  </nav>
  );
}
