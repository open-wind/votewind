'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
const querystring = require('querystring');
import {
  Command,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipArrow, TooltipProvider } from "@/components/ui/tooltip";
import { LocateFixed } from 'lucide-react';
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { API_BASE_URL, MAP_PLACE_ZOOM } from '@/lib/config';

export default function AutocompleteInput() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [uselocation, setUselocation] = useState(true);
  const [results, setResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [justSelected, setJustSelected] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const timeoutRef = useRef(null);
  const inputRef = useRef(null);
  const showDropdownRef = useRef(showDropdown);

  // Automatically focus on input field as soon as page loads
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Track user input and hide 'Use my location' if anything in input
  useEffect(() => {
    if (query == '') setUselocation(true);
    else setUselocation(false);
  }, [query]);

  useEffect(() => {
    showDropdownRef.current = showDropdown;
  }, [showDropdown]);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Tab") {
        const focused = document.activeElement;
        if (focused?.hasAttribute("cmdk-input") && showDropdownRef.current) {
          e.preventDefault();
          focused.dispatchEvent(
            new KeyboardEvent("keydown", {
              key: "Enter",
              code: "Enter",
              bubbles: true,
            })
          );
        }
      }
    };

    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (results.length === 1 && showDropdown && !deleting) {
      setQuery(results[0]);
      setShowDropdown(false); // optional: hide dropdown
    }
  }, [results, showDropdown]);

  useEffect(() => {
    if (justSelected) {
      setJustSelected(false);
      return;
    }

    if (query.length < 3) {
      setResults([]);
      setShowDropdown(false);
      return;
    }

    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(async () => {
      try {
        // const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const res = await fetch(`${API_BASE_URL}/api/locationsearch?query=${encodeURIComponent(query)}`);
        const data = await res.json();
        setResults(data.results || []);
        setShowDropdown(data.results.length > 0);
      } catch (err) {
        console.error('fetch error:', err);
        setResults([]);
        setShowDropdown(false);
      }
    }, 300);

    return () => clearTimeout(timeoutRef.current);
  }, [query]);

  const resetInput = () => {
    setQuery('');
    setError('');
    inputRef.current?.focus();
  }

  const handleSelect = (value) => {
    setQuery(value);
    setShowDropdown(false);
    setJustSelected(true);
  };

  const handleSubmit = async () => {
    if (!query) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/locationget?query=${encodeURIComponent(query)}`);
      const data = await res.json();
      navigateToPosition(data.results);
    } catch (err) {
      setError("Unable to retrieve any information about that location");
    }
  };

  const handleUseMyLocation = () => {
    setError("");
    if (!navigator.geolocation) {
      setError("Geolocation not supported by your browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setQuery("Your location");
        navigateToPosition({latitude: latitude, longitude: longitude, type: 'gps'})
      },
      () => {
        setError("Unable to retrieve your location.");
      }
    );
  };

  const navigateToPosition = (position, type) => {
    var errortext = `Your location: ${position.latitude.toFixed(5)}, ${position.longitude.toFixed(5)}`;
    var zoom = MAP_PLACE_ZOOM;
    
    if (position.bounds !== undefined) {
      errortext += ' Bounds ' + position.bounds.join(', ');
    }
    setError(errortext)

    let url = `/${position.longitude.toFixed(5)}/${position.latitude.toFixed(5)}/${zoom}/`;
    var urlparameters = {};

    if (position.bounds) urlparameters.bounds = position.bounds.join(',');
    if (position.boundary) urlparameters.boundary = position.boundary;
    if (position.type) urlparameters.type = position.type;

    if(Object.keys(urlparameters).length) url += '?' + querystring.stringify(urlparameters);

    router.push(url);
  }

  return (

  <div className="w-full h-screen bg-[url('/images/sunrise-3579931_1920.jpg')] bg-cover bg-center" >
    <div className="fixed top-1/3 -translate-y-1/2 left-0 text-center w-full items-center">
      <header className="relative w-full sm:mt-0 text-center py-6">
          <h1 className="text-center text-5xl sm:text-4xl sm:text-[100px] font-bold text-gray-900 mb-2 sm:mb-10" style={{ textShadow: '0 0px 30px rgba(255,255,255,.65)' }}>
          <span className="text-blue-500 pr-[1px]">Vote</span><span className="text-blue-600 pr-[1px]">Wind!</span>
          </h1>
      </header>
      <div className="mx-auto w-full max-w-[640px]">
        <p className="font-medium text-gray-800 pl-10 pr-10 mb-5 text-xl sm:text-2xl text-center leading-tight">
          Have your say on where you'd like a community wind turbine with <b className="font-bold"><span className="text-blue-500 pr-[1px]">Vote</span><span className="text-blue-600 pr-[1px]">Wind</span></b>!
        </p>

        <p className="font-medium text-gray-800 pl-10 pr-10 mb-5 text-medium sm:text-xl text-center leading-tight">
          Community wind turbines generate cash for communities, reduce the need for costly grid upgrades and help tackle climate change...
        </p>
      </div>

  </div>

  <div className="fixed top-2/3 -translate-y-1/2 w-full pl-5 pr-5 pt-10 flex justify-center z-50">
    <div className="relative w-full max-w-[400px]">

      <Command shouldFilter={false} className="w-full rounded-md border shadow-md p-0 mb-0">
        <div className="relative w-full">

          {/* Actual user input field */}
          <CommandInput
            ref={inputRef}
            className="w-full pl-1 pr-6 text-lg placeholder:text-center" // <- adjust padding to fit both icons
            placeholder="Enter postcode or location..."
            value={query}
            onValueChange={setQuery}
            onKeyDown={(e) => {
              setError("");
              if (e.key === 'Escape')     setShowDropdown(false);
              if (e.key === 'Backspace')  setDeleting(true);
              if (e.key !== 'Backspace')  setDeleting(false);

              if (e.key === 'Enter') {
                if (showDropdown) return;
                handleSubmit(query);
              }
            }}
          />

          {/* Reset input button */}
          {query && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => {
                resetInput();
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              aria-label="Clear search"
              tabIndex={-1} 
              onKeyDown={(e) => {
                if (e.key === 'Enter') resetInput();
              }}
            >
              <X className="w-5 h-5 text-gray-400 hover:text-gray-600" />
            </button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={20} className="bg-white text-black text-lg border shadow px-3 py-1 rounded-md hidden sm:block">
                Clear input
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          )}

        </div>

        {/* Input autosuggestions dropdown */}
        {showDropdown && results.length > 0 && (
          <CommandList className="absolute top-full left-0 w-full mt-[-1px] bg-white shadow z-50 max-h-40 overflow-y-auto">
            {results.map((item) => (
              <CommandItem
                key={item}
                value={item}
                onSelect={() => handleSelect(item)}
                className="cursor-pointer"
              >
                {item}
              </CommandItem>
            ))}
          </CommandList>
        )}
      </Command>

      {/* Locate me / submit buttons: absolutely positioned under input */}
      <AnimatePresence mode="wait">
        {uselocation ? (
          <motion.button
            key="userlocation"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            onClick={handleUseMyLocation}
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
            onClick={handleSubmit}
            className="absolute top-full mt-[0.7rem] left-0 w-full bg-blue-600 text-white text-lg px-4 py-2 rounded-md hover:bg-blue-700 z-40 inline-flex items-center justify-center gap-2"
          >
            Go to location
          </motion.button>
        )}
      </AnimatePresence>

    </div>
  </div>


    </div>


  );
}
