'use client';

import { forwardRef, useImperativeHandle, useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
const querystring = require('querystring');
import clsx from 'clsx';

import {
  Command,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { LocateFixed } from 'lucide-react';
import { X } from "lucide-react";
import { API_BASE_URL, MAP_PLACE_ZOOM } from '@/lib/config';

const AutocompleteInput = forwardRef(function AutocompleteInput({ query, setQuery, locating, setLocating, useLocate=null, placeholder=null, submitOnSuggestionSelect=false, className='', centralInput=false }, ref) {
  const inputRef = useRef(null);
  const router = useRouter();
  const [results, setResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [justSelected, setJustSelected] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const timeoutRef = useRef(null);
  const showDropdownRef = useRef(showDropdown);
  const [showGPSError, setShowGPSError] = useState(false);

  if (placeholder === null) placeholder = "Enter postcode or location...";

  useImperativeHandle(
    ref,
    () => ({
      setFocus: setFocus,
      handleUseMyLocation: handleUseMyLocation,
      handleSubmit: handleSubmit,
    }),
    [setQuery, query]
  );

  const setFocus = () => {
    inputRef.current?.focus();
  }

  // Automatically focus on input field as soon as page loads
  useEffect(setFocus, []);

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
      setShowDropdown(false);
    }
  }, [results, showDropdown]);

  useEffect(() => {
    if (justSelected) {
      setJustSelected(false);
      if (submitOnSuggestionSelect) handleSubmit();
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
        const res = await fetch(`${API_BASE_URL}/api/locationsearch?query=${encodeURIComponent(query)}`);
        const data = await res.json();
        // To avoid slow query results coming back after user has changed their input,
        // compare latest user input with user input that triggered current query
        if (data.query) {
          const queryinput = query.toUpperCase();
          const queryoutput = data.query.toUpperCase();
          if (queryinput === queryoutput) {
            setResults(data.results || []);
            setShowDropdown(data.results.length > 0);
          }
        }
      } catch (err) {
        console.error('fetch error:', err);
        setResults([]);
        setShowDropdown(false);
      }
    }, 300);

    return () => clearTimeout(timeoutRef.current);
  }, [query, justSelected]);

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
      console.error("Geolocation not supported by your browser.");
      return;
    }

    setLocating(true);

    const isDev = process.env.NODE_ENV === "development";

    const runPositioning = () => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocating(false);
          const { latitude, longitude } = position.coords;
          setQuery("");
          navigateToPosition({latitude: latitude, longitude: longitude, type: 'gps'})
        },
        (err) => {
          setLocating(false);
          setShowGPSError(true);
          console.error("Geolocation error:", err);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }

    isDev ? setTimeout(runPositioning, 5000) : runPositioning();
  };

  if ((useLocate !== null) && (useLocate)) useLocate = handleUseMyLocation;
  else useLocate = null;

  const navigateToPosition = (position) => {
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
    if (position.properties) urlparameters.properties = querystring.stringify(position.properties);

    if(Object.keys(urlparameters).length) url += '?' + querystring.stringify(urlparameters);

    router.push(url);
  }

  return (
  <Command shouldFilter={false} 
  
    className={clsx(
    "w-full p-0 shadow-none",
    !centralInput && "border rounded-md bg-white",
    centralInput && "border-none rounded-none bg-transparent",
    className // let parent pass background, shadow, padding, etc.
  )}
  
  >

      {/* GPS error modal */}
      {showGPSError && (
      <div className="fixed inset-0 z-[1001] flex items-center justify-center">
        <div className="bg-white border border-gray-300 shadow-lg rounded-lg p-6 max-w-sm w-full mx-4">
            <div className="mb-3 text-center">
                <strong className="font-bold block">GPS Error</strong>
            </div>
            <p className="text-sm text-gray-700">
            There was an error retrieving your GPS position - please use your postcode instead.
            </p>
            <div className="mt-4 flex justify-center gap-2">
                <button
                    onClick={() => setShowGPSError(false)}
                    className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                >
                    OK
                </button>
            </div>
        </div>
      </div>
      )}

    <div className="relative w-full">


      {/* Actual user input field */}
      <CommandInput
        ref={inputRef}
        className={`w-full bg-transparent ${ centralInput ? 'h-8' : 'h-11'} px-4 py-0 text-lg placeholder:text-center border-none outline-none shadow-none rounded-none`}
        placeholder={placeholder}
        spellCheck={false}
        autoCorrect="off"
        autoCapitalize="off"
        autoComplete="off"
        value={query}
        onValueChange={setQuery}
        showMagnifier={(useLocate === null)}
        onLocate={useLocate}
        locating={locating}
        onKeyDown={(e) => {
          setError("");
          if (e.key === 'Escape')     setShowDropdown(false);
          if (e.key === 'Backspace')  setDeleting(true);
          if (e.key !== 'Backspace')  setDeleting(false);

          if (e.key === 'Enter') {
            // if (showDropdown) return;
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
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 bg-white"
          aria-label="Clear search"
          tabIndex={-1} 
          onKeyDown={(e) => {
            if (e.key === 'Enter') resetInput();
          }}
        >
          <X className="w-5 h-5 text-gray-400 hover:text-gray-600 bg-transparent" />
        </button>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={20} className="bg-white text-black text-sm border shadow px-3 py-1 rounded-md hidden sm:block">
            Clear input
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      )}

    </div>

    {/* Input autosuggestions dropdown */}
    {showDropdown && results.length > 0 && (
    <div className="absolute top-full left-0 right-0 mt-1 z-50">
      <CommandList className="bg-white shadow rounded-md max-h-40 overflow-y-auto">

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
    </div>
    )}

  </Command>
  );

});

export default AutocompleteInput;


