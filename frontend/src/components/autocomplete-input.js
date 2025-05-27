'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
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
        navigateToPosition({latitude: latitude, longitude: longitude})
      },
      () => {
        setError("Unable to retrieve your location.");
      }
    );
  };

  const navigateToPosition = (position) => {
    var errortext = `Your location: ${position.latitude.toFixed(5)}, ${position.longitude.toFixed(5)}`;
    var zoom = MAP_PLACE_ZOOM;
    
    if (position.bounds !== undefined) {
      errortext += ' Bounds ' + position.bounds.join(', ');
    }
    setError(errortext)

    let url = `/${position.longitude.toFixed(5)}/${position.latitude.toFixed(5)}/${zoom}/`;

    if (position.bounds) {
      const boundsParam = position.bounds.join(',');
      url += `?bounds=${boundsParam}`;
      if (position.boundary) {
        url += `&boundary=${position.boundary}`;
      }
    }

    router.push(url);
  }

  return (

  <div className="w-full" >
        <header className="w-full mt-20 text-center py-6">
            <h1 className="text-center text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            VoteWind!
            </h1>
        </header>

      <p className="pl-5 pr-5 mb-5 text-sm sm:text-lg text-center">
        Community wind generates cash for communities, lessens the need for costly grid upgrades and helps tackle climate change.</p>
      <p className="pl-5 pr-5 mb-5 text-sm sm:text-lg text-center">
        So cast your vote on where you'd like a community wind turbine with <b>VoteWind.org</b>!</p>
      {/* <p className="pl-5 pr-5 mb-5 text-sm sm:text-lg text-center">
        Once you've voted, <b>VoteWind.org</b> then offers useful resources and links to organisations if you want to help build a community wind project in your area. 
        </p> */}


  <div className="fixed left-1/2 transform -translate-x-1/2 w-full max-w-md px-5 z-50">
    <div className="relative">
      <p className="mb-5 text-sm sm:text-lg text-center">To get started, enter your postcode or location, or click <b>Use my location</b></p>

      <Command shouldFilter={false} className="rounded-md border shadow-md p-0">
        <div className="relative">

          {/* Actual user input field */}
          <CommandInput
            ref={inputRef}
            className="pl-1 pr-6 text-lg placeholder:text-center" // <- adjust padding to fit both icons
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
              tabIndex={-1} // 👈 Skip this element when tabbing
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
          <CommandList className="absolute top-full left-0 w-full mt-[-1px] bg-white shadow z-50 max-h-64 overflow-y-auto">
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
            className="absolute top-full mt-[1rem] left-0 w-full bg-blue-600 text-white text-lg px-4 py-2 rounded-md hover:bg-blue-700 z-40 inline-flex items-center justify-center gap-2"
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
            className="absolute top-full mt-[1rem] left-0 w-full bg-blue-600 text-white text-lg px-4 py-2 rounded-md hover:bg-blue-700 z-40 inline-flex items-center justify-center gap-2"
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
