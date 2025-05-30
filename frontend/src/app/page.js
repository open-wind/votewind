'use client';

import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { LocateFixed } from 'lucide-react';
import { motion, AnimatePresence } from "framer-motion";
import AutocompleteInput from '@/components/autocomplete-input';
import PartnerLogos from '@/components/partner-logos';

export default function Home() {
  const [query, setQuery] = useState('');
  const [uselocation, setUselocation] = useState(true);
  const inputRef = useRef(null);

  window.CESIUM_BASE_URL = '/static/cesium';
  
  // Automatically focus on input field as soon as page loads
  useLayoutEffect(() => {
    inputRef.current?.setFocus();
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

        <header className="relative w-full sm:mt-0 text-center py-3">
            <h1 className="text-center text-6xl sm:text-[70px] font-thin text-gray-900 mb-2 sm:mb-10" style={{ textShadow: '0 0px 30px rgba(255,255,255,.25)' }}>
            <span className="text-black tracking-wide pr-[1px]">VoteWind!</span>
            </h1>
        </header>

        <div className="mx-auto w-full max-w-[640px]">
          <p className="font-light text-zinc-600 pl-10 pr-10 mb-5 text-xl sm:text-2xl text-center leading-tight">
            Vote for where you'd like a community wind turbine.
          </p>

          <p className="font-light text-zinc-600 pl-5 pr-5 mb-5 text-medium sm:text-xl text-center leading-tight">
            Community wind projects generate cash for communities, reduce the need for grid upgrades and help tackle climate change...
          </p>
        </div>

      </div>

      <div className="fixed top-2/3 -translate-y-1/2 w-full pl-5 pr-5 pt-10 flex justify-center z-50">
        <div className="relative w-full max-w-[400px]">

          <AutocompleteInput ref={inputRef} query={query} setQuery={setQuery} useLocate={false} />

          {/* Locate me / submit buttons: absolutely positioned under input */}
          <AnimatePresence mode="wait">
            {uselocation ? (
              <motion.button
                key="userlocation"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                onClick={() => inputRef.current?.handleUseMyLocation()}
                className="absolute top-full mt-[0.7rem] left-0 w-full bg-blue-600 text-white text-lg px-4 py-2 rounded-md hover:bg-blue-700 z-40 inline-flex items-center justify-center gap-2"
              >
                  <LocateFixed className="w-6 h-6 animate-pulse " />

                Use my location
              </motion.button>
            ) : (
              <motion.button
                key="inputlocation"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                onClick={() => inputRef.current?.handleSubmit()}
                className="absolute top-full mt-[0.7rem] left-0 w-full bg-blue-600 text-white text-lg px-4 py-2 rounded-md hover:bg-blue-700 z-40 inline-flex items-center justify-center gap-2"
              >
                Go to location
              </motion.button>
            )}
          </AnimatePresence>

        </div>

      </div>

      <PartnerLogos />

    </div>

  </div>

  );
}
