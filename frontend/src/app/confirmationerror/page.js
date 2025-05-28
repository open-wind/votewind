'use client';

import { useState, useEffect, useRef } from 'react';
import { LocateFixed } from 'lucide-react';
import { motion, AnimatePresence } from "framer-motion";
import AutocompleteInput from '@/components/autocomplete-input';

export default function Home() {
  const [query, setQuery] = useState('');
  const [uselocation, setUselocation] = useState(true);
  const inputRef = useRef(null);

  // Automatically focus on input field as soon as page loads
  useEffect(() => {
    inputRef.current?.setFocus()
  }, []);

  // Track user input and hide 'Use my location' if anything in input
  useEffect(() => {
    if (query == '') setUselocation(true);
    else setUselocation(false);
  }, [query]);

  return (
  <div className="mx-auto mt-0">

    <div className="w-full h-screen bg-[url('/images/sunrise-3579931_1920.jpg')] bg-cover bg-center" >

      <div className="fixed top-1/3 -translate-y-1/2 left-0 text-center w-full items-center">

        <header className="relative w-full sm:mt-0 text-center py-6">
            <h1 className="text-center text-5xl sm:text-4xl sm:text-[100px] font-bold text-gray-900 mb-2 sm:mb-10" style={{ textShadow: '0 0px 30px rgba(255,255,255,.65)' }}>
            <span className="text-blue-500 pr-[1px]">Vote</span><span className="text-blue-600 pr-[1px]">Wind</span>
            </h1>
        </header>

        <div className="mx-auto w-full max-w-[640px]">
          <p className="font-medium text-zinc-600 pl-5 pr-5 mb-5 text-xl sm:text-xl text-center leading-tight">
            There was a problem processing your vote confirmation
          </p>

          <p className="font-medium text-zinc-500 pl-5 pr-5 mb-5 text-medium sm:text-lg text-center leading-tight">
            This may be because the confirmation link you clicked on has expired. Please try to cast your vote again or email us at <a className="font-bold hover:text-blue-600" href="mailto:voting@votewind.org">voting@votewind.org</a>
          </p>
        </div>

      </div>

    </div>

  </div>

  );
}
