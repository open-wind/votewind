'use client';

import { useState } from 'react';
import { Menu, X } from 'lucide-react'; // icons from lucide-react (shadcn uses it)

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
<nav className="fixed top-0 backdrop-blur-sm left-0 w-full z-50 bg-transparent text-black px-4 py-2 flex justify-between items-center">
      <div className="text-lg text-black font-semibold"><a href="/">VoteWind!</a></div>

      {/* Desktop links */}
      <div className="hidden md:flex gap-6">
        <a href="/" className="hover:underline">Home</a>
        <a href="/map" className="hover:underline">Map</a>
        <a href="/about" className="hover:underline">About</a>
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
        <div className="absolute top-full left-0 w-full bg-white shadow-md flex flex-col items-start px-4 py-2 md:hidden z-50">
          <a href="/" className="py-2 w-full hover:underline">Home</a>
          <a href="/map" className="py-2 w-full hover:underline">Map</a>
          <a href="/about" className="py-2 w-full hover:underline">About</a>
        </div>
      )}
    </nav>
  );
}
