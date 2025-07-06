'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import maplibregl from 'maplibre-gl';
import Map, { Marker } from 'react-map-gl/maplibre';
import debounce from 'lodash.debounce';
import { Share2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Search, Video } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { useIsMobile, isIOS } from "@/components/functions/helpers"
import PulsingSubstationMarker from '@/components/pulsing-substation';
import ViewportHeightFixer from "@/components/viewport-height-fixer";
import BodyClassSetter from '@/components/body-class-setter';

import { 
  API_BASE_URL, 
  MAP_PLACE_ZOOM,
  MAP_MAXBOUNDS,
  MAP_DEFAULT_CENTRE,
  MAP_DEFAULT_ZOOM,
  TILESERVER_BASEURL
} from '@/lib/config';
import TempUserAgentDisplay from '../user-agent';

const assetPrefix = process.env.ASSET_PREFIX || '';

export default function MobileApp({}) {
    const router = useRouter();
    const mapRef = useRef();
    const markerRef = useRef();
    const [isBouncing, setIsBouncing] = useState(false);
    const [turbinePosition, setTurbinePosition] = useState({'longitude': null, 'latitude': null});
    const [userposition, setUserposition] = useState({'longitude': null, 'latitude': null});
    const isReady = useRef(false);
    const [isCentred, setIsCentred] = useState(true);
    const isInteractingRef = useRef(false);
    const moveEndTimeout = useRef(null);

    const onMoveStart = () => {
        if (moveEndTimeout.current) {
            clearTimeout(moveEndTimeout.current);
            moveEndTimeout.current = null;
            }
        isInteractingRef.current = true;
        // console.log('User interaction started');
    };

    const onMoveEnd = () => {
        moveEndTimeout.current = setTimeout(() => {
            isInteractingRef.current = false;
            // console.log('User interaction ended');
        }, 250); // debounce delay
    };
    
    const isMobile = useIsMobile();

    useEffect(() => {

        const debouncedFlyTo = debounce((map, options) => {
            map.flyTo(options);
        }, 100); // wait 100ms after last call

        function setCentre(param) {
            console.log('setCentre: Called with:', param);
            if ((param.longitude === undefined) || (param.latitude === undefined) || (param.heading === undefined)) return;

            const map = mapRef?.current.getMap?.();

            if (map) {
                setUserposition({longitude: param.longitude, latitude: param.latitude});
                if (!(isReady.current)) {
                    map.jumpTo({center: [param.longitude, param.latitude], bearing: param.heading});
                    isReady.current = true;
                }

                if (isCentred && isReady.current && !isInteractingRef.current) {
                    debouncedFlyTo(map, {center: [param.longitude, param.latitude], bearing: param.heading});
                }
            }
        }

        function setIsCentred(param) {
            setIsCentred(param);
        }

        function setTurbine(param) {
            console.log('setTurbine: Called with:', param);
            if ((param.longitude === undefined) || (param.latitude === undefined)) return;

            setTurbinePosition({longitude: param.longitude, latitude: param.latitude});
        }

        window.setCentre = setCentre;
        window.setIsCentred = setIsCentred;
        window.setTurbine = setTurbine;

        return () => {
            if (moveEndTimeout.current) clearTimeout(moveEndTimeout.current);
            debouncedFlyTo.cancel();
            delete window.setCentre;
            delete window.setIsCentred;
            delete window.setTurbine;
        };

    }, []);

    const triggerBounce = () => {
        setIsBouncing(true);
        setTimeout(() => setIsBouncing(false), 500); // match animation duration
    };

    const incorporateBaseDomain = (tileserver_baseurl, api_baseurl, json) => {

        let newjson = JSON.parse(JSON.stringify(json));
        const sources_keys = Object.keys(newjson['sources'])
        for (let i = 0; i < sources_keys.length; i++) {
            const sources_key = sources_keys[i];
            if ('url' in newjson['sources'][sources_key]) {
                if (!(newjson['sources'][sources_key]['url'].startsWith('http'))) {
                    newjson['sources'][sources_key]['url'] = tileserver_baseurl + newjson['sources'][sources_key]['url'];
                }
            }
            if ('data' in newjson['sources'][sources_key]) {
                if ((typeof newjson['sources'][sources_key]['data'] === 'string') && 
                    (!(newjson['sources'][sources_key]['data'].startsWith('http')))) {
                    newjson['sources'][sources_key]['data'] = api_baseurl + newjson['sources'][sources_key]['data'];
                }
            }
        }  

        newjson['glyphs'] = tileserver_baseurl + newjson['glyphs'];
        newjson['sprite'] = tileserver_baseurl + newjson['sprite'];

        return newjson;
    }

    const mapStyle = useMemo(() => {
        const defaultStyle = require('../stylesheets/openmaptiles_mobile.json');
        return incorporateBaseDomain(TILESERVER_BASEURL, API_BASE_URL, defaultStyle);
    }, []);

    const initialViewState={
        longitude: MAP_DEFAULT_CENTRE.longitude,
        latitude: (MAP_DEFAULT_CENTRE.latitude - (isMobile ? 3 : 0)),
        zoom: MAP_PLACE_ZOOM
    };

    const onLoad = () => {
        const map = mapRef.current?.getMap();
        if (!map) return;

        map.touchZoomRotate.disableRotation();
        if (isIOS(14)) map.setMaxZoom(12); // iOS14 stops rendering custom layers when zoom > 12

        const message = JSON.stringify({method: 'MapLoaded'});
        window.Unity.call(message);
    }

    const onClick = (event) => {
        var acceptableposition = true;

        var turbineposition_new = {'longitude': event.lngLat.lng, 'latitude': event.lngLat.lat};
        
        if (event.features.length > 0) {
            var id = event.features[0]['layer']['id'];
            const map = mapRef.current?.getMap?.();

            if (id == 'water') {
                acceptableposition = false;
                toastOnshoreOnly();
            }
        } 

        if (acceptableposition) {
            setTurbinePosition(turbineposition_new);
            triggerBounce();

            // Return turbine position to Unity container
            const message = JSON.stringify({method: 'SetTurbinePosition', data: { longitude: turbineposition_new.longitude, latitude: turbineposition_new.latitude }});
            window.Unity.call(message);
        }
    }

    const onIdle = () => {
        isReady.current = true;
        const message = JSON.stringify({method: 'MapLoaded'});
        window.Unity.call(message);
    }

    const onDragStart = () => {
        onInteractionStart();
        console.log('drag started');
    };

    const onDragEnd = () => {
        onInteractionEnd();
        console.log('drag ended');
    };

    const onZoomStart = () => {
        onInteractionStart();
        console.log('zoom started');
    };

    const onZoomEnd = () => {
        onInteractionEnd();
        console.log('zoom ended');
    };
    
    return (
    <div className="">

      {/* Main map */}
      <ViewportHeightFixer />
      <BodyClassSetter className="overflow-hidden" />

      <div id="map-container" className="relative w-full overflow-hidden" style={{ height: 'calc(var(--vh, 1vh) * 100)' }}>
          <Map
            ref={mapRef}
            mapLib={maplibregl}
            dragRotate={false}
            touchRotate={false}
            pitchWithRotate={false}
            touchZoomRotate={true}
            initialViewState={initialViewState}
            onLoad={onLoad}
            onMoveStart={onMoveStart}
            onMoveEnd={onMoveEnd}
            interactive={true}
            onClick={onClick}
            style={{ width: '100%', height: '100%' }}
            mapStyle={mapStyle}
            interactiveLayerIds={['votes-default', 'votes-leaderboard']}
            attributionControl={true}
            maxBounds={MAP_MAXBOUNDS}
            crossOrigin="anonymous"
            transformRequest={(url, resourceType) => {
                if (resourceType === 'Tile') {
                return {
                    url,
                    credentials: 'omit', // Ensures browser caching works cross-origin
                };
                }
                return { url };
            }}
            >

              {((turbinePosition.longitude !== null) && (turbinePosition.latitude !== null)) &&
              <Marker longitude={turbinePosition.longitude} latitude={turbinePosition.latitude} draggable={false} anchor="bottom" offset={[0, 0]}>
                  <img ref={markerRef} className={`${isBouncing ? 'bounce' : ''}`} alt="Wind turbine" width="80" height="80" src={`${assetPrefix}/icons/windturbine_blue.png`} />
              </Marker>              
              }

          </Map>

      </div>

        {(userposition.longitude !== null) && (userposition.latitude !== null) &&
        <>
        test
        <PulsingSubstationMarker
            map={mapRef.current?.getMap()}
            longitude={userposition.longitude}
            latitude={userposition.latitude}
        />

        </>
        }

    </div>

  );
}
