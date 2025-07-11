'use client';

import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { LocateFixed } from 'lucide-react';
import AutocompleteInput from '@/components/autocomplete-input';
import PartnerLogos from '@/components/partner-logos';

const assetPrefix = process.env.ASSET_PREFIX || '';

export default function Home() {
  const [query, setQuery] = useState('');
  const [uselocation, setUselocation] = useState(true);
  const [locating, setLocating] = useState(false);
  const [showLogos, setShowLogos] = useState(false);
  const inputRef = useRef(null);
  
  // Automatically focus on input field as soon as page loads
  useLayoutEffect(() => {
    inputRef.current?.setFocus();
  }, []);

  // Track user input and hide 'Use my location' if anything in input
  useEffect(() => {
    if (query == '') setUselocation(true);
    else setUselocation(false);
  }, [query]);

  useEffect(() => {
    const timer = setTimeout(() => setShowLogos(true), 150);
    return () => clearTimeout(timer);
  }, []);

  return (
  <div className="min-h-screen flex flex-col bg-cover bg-center"
    style={{ backgroundImage: `url('${assetPrefix}/images/sunrise-3579931_1920.jpg')` }}>
    <main className="flex-grow overflow-auto">

        <div className="pt-[15vh] lg:mt-10 text-center w-full items-center">

          <header className="relative w-full sm:mt-0 text-center py-0">
              <h1 className="text-center text-6xl sm:text-[70px] font-thin text-gray-900 mb-8 md:mb-10" style={{ textShadow: '0 0px 30px rgba(255,255,255,.25)' }}>
              <span className="text-black tracking-wide pr-[1px]">VoteWind!</span>
              </h1>
          </header>

          <div className="mx-auto w-full max-w-[640px]">
            <p className="font-light text-zinc-600 pl-10 pr-10 mb-5 text-xl sm:text-2xl text-center leading-tight">
              Vote for where you'd like a community wind turbine.
            </p>

            <p className="font-light text-zinc-600 pl-5 pr-5 mb-[1.5em] md:mb-6 text-medium sm:text-xl text-center leading-tight">
              Community wind projects generate cash for communities, reduce the need for grid upgrades and help tackle climate change...
            </p>

          </div>

          <div className="pl-5 pt-0 pb-10 sm:pb-14 pr-5 flex justify-center ">
            <a target="_blank" href="https://www.youtube.com/watch?v=eRbuQ96wwAc">
              <div
                  className="
                  inline-flex items-center
                  bg-blue-600 text-white
                  py-2 px-4 rounded-3xl
                  shadow-[0_4px_12px_rgba(255,255,255,0.5)]
                  "
              >
                <p className="text-sm pl-5 pr-5">View demo</p>
              </div>
            </a>
          </div>

          <div className="pl-5 pr-5 text-center mx-auto max-w-md">
            <div className="relative">

            <AutocompleteInput ref={inputRef} query={query} setQuery={setQuery} locating={locating} setLocating={setLocating} useLocate={false} />

            </div>

            {uselocation ? (
              <button
                key="userlocation"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                onClick={() => inputRef.current?.handleUseMyLocation()}
                className="relative mt-[0.7rem] left-0 w-full bg-blue-600 text-white text-lg px-4 py-2 rounded-md hover:bg-blue-700 inline-flex items-center justify-center space-x-2"
              >
                {locating ? (
                  <>
                  <svg
                    className="animate-spin w-5 h-5"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  <span>Finding your location</span>
                  </>
                  ) : (
                  <>
                    <LocateFixed className="w-6 h-6 animate-pulse " />
                    <span>Use my location</span>
                  </>
                  )}
              </button>
            ) : (
              <button
                key="inputlocation"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                onClick={() => inputRef.current?.handleSubmit()}
                className="mt-[0.7rem] left-0 w-full bg-blue-600 text-white text-lg px-4 py-2 rounded-md hover:bg-blue-700 inline-flex items-center justify-center gap-2"
              >
                Go to location
              </button>
            )}

          </div>

          
      </div>

    </main>

    <footer>
      {showLogos && <PartnerLogos />}
    </footer>
  </div>
  )

}
