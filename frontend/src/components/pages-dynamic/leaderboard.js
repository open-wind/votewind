'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import maplibregl from 'maplibre-gl';
import Map, { Popup } from 'react-map-gl/maplibre';
import { Share2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Search, Video } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { useIsMobile } from "@/components/functions/helpers"
import SocialMediaModal from '../social-media-modal';
import CesiumModal from '@/components/cesium-modal';
import ViewportHeightFixer from "@/components/viewport-height-fixer";

import { 
  API_BASE_URL, 
  MAP_PLACE_ZOOM,
  MAP_MAXBOUNDS,
  MAP_DEFAULT_CENTRE,
  MAP_DEFAULT_ZOOM,
  TILESERVER_BASEURL
} from '@/lib/config';

const assetPrefix = process.env.ASSET_PREFIX || '';

export default function Leaderboard({}) {
  const router = useRouter();
  const mapRef = useRef();
  const [popupInfo, setPopupInfo] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [data, setData] = useState(null);
  const [viewerData, setViewerData] = useState(null);
  const [socialmedia, setSocialmedia] = useState(null);
  const [page, setPage] = useState(null);
  const [firstPage, setFirstPage] = useState(1);
  const [prevPage, setPrevPage] = useState(1);
  const [nextPage, setNextPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const mapRefs = useRef({});

  const isMobile = useIsMobile();

  useEffect(() => {
    if (!page) return;

    setData(null);
    const url_to_fetch = API_BASE_URL + `/api/leaderboard?page=` + String(page);
    fetch(url_to_fetch)
      .then(res => res.json())
      .then((data) => {
        setData(data);

        const lastpage = data.features[0].properties.lastpage;
        setLastPage(lastpage);
        if (page !== 1) setPrevPage(page - 1);
        else setPrevPage(1);
        if (page < lastpage) setNextPage(page + 1);
        else setNextPage(lastpage);

        const map = mapRef.current?.getMap();
        if (map) map.getSource('votes-leaderboard').setData(data);

        setIsReady(true);
      })
      .catch((error) => {
        setIsReady(true);
        // console.error;
      }
    );
  }, [page]);

  useEffect(() => {
    setPage(1);
  }, []);

  if (!isReady) return null;

  const topPadding = 100;

  const onZoomTo = (item) => {
    const position_lnglat = {lng: item.geometry.coordinates[0], lat: item.geometry.coordinates[1]};
    const map = mapRef.current?.getMap?.();
    if (!map) return;
    const padding = {top: topPadding, bottom: isMobile ? window.innerHeight / 3 : 0};
    if (map.getZoom() < MAP_PLACE_ZOOM) {
        map.flyTo({center: position_lnglat, zoom: MAP_PLACE_ZOOM, animate: false, padding: padding});
    } else {
        map.flyTo({center: position_lnglat, animate: false, padding: padding});
    }
  }

  const initialViewState={
      longitude: MAP_DEFAULT_CENTRE.longitude,
      latitude: (MAP_DEFAULT_CENTRE.latitude - (isMobile ? 3 : 0)),
      zoom: isMobile ? 4.1 : MAP_DEFAULT_ZOOM
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

      newjson['sources']['votes-leaderboard'] = {
        "type": "geojson",
        "data": {
          "type": "FeatureCollection", 
          "features": []
        }
      }

      // Add voting stylesheet
      var votes_style = require('../stylesheets/leaderboard.json');
      for (let i = 0; i < votes_style.length; i++) newjson['layers'].push(votes_style[i]);

      newjson['glyphs'] = tileserver_baseurl + newjson['glyphs'];
      newjson['sprite'] = tileserver_baseurl + newjson['sprite'];

      return newjson;
  }
  
  const onLoad = () => {
      const map = mapRef.current?.getMap();
      if (!map) return;

      map.touchZoomRotate.disableRotation();

      // Load any images that are too fiddly to incorporate into default images
      const images_to_load = [    'mappin-badge',
                                  'mappin-badge-disabled' ];

      for(let i = 0; i < images_to_load.length; i++) {
          const image_id = images_to_load[i];
          if (!map.hasImage(image_id)) {
              const img = new window.Image();
              img.src = `${assetPrefix}/icons/${image_id}.png`;
              img.onload = () => map.addImage(image_id, img, { sdf: image_id.endsWith('-sdf')});

          }
      }

      const defaultStyle = require('../stylesheets/openmaptiles.json');
      const mapStyle = incorporateBaseDomain(TILESERVER_BASEURL, API_BASE_URL, defaultStyle);
      map.setStyle(mapStyle);

      if (data) map.getSource('votes-leaderboard').setData(data);
  }

  const onClick = (event) => {
      
      if (event.features.length > 0) {
          var id = event.features[0]['layer']['id'];

          if (id.startsWith('votes-')) {
              const turbineposition = {'longitude': event.features[0]['properties']['lng'], 'latitude': event.features[0]['properties']['lat']};
              const new_url = window.location.origin + '/' + String(turbineposition.longitude) + '/' + String(turbineposition.latitude) + '/12?selectturbine=true';
              router.push(new_url);
          } 
      } 
  }

  const onMouseMove = (e) => {
      const feature = e.features?.[0];
      if (!isMobile && feature) {
        setPopupInfo({lngLat: {lng: e.features[0].properties.lng, lat: e.features[0].properties.lat}});
      }
      else setPopupInfo(null);
  }

  return (
    <div>

      {/* Main map */}
      <ViewportHeightFixer />

      <div id="map-container" className="relative w-full" style={{ height: 'calc(var(--vh, 1vh) * 100)' }}>
          <Map
              ref={mapRef}
              mapLib={maplibregl}
              dragRotate={false}
              touchRotate={false}
              pitchWithRotate={false}
              touchZoomRotate={true}
              initialViewState={initialViewState}
              onLoad={onLoad}
              interactive={true}
              onClick={onClick}
              onMouseMove={onMouseMove}
              style={{ width: '100%', height: '100%' }}
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

              {popupInfo && (
              <Popup
                  longitude={popupInfo.lngLat.lng}
                  latitude={popupInfo.lngLat.lat}
                  closeButton={false}
                  closeOnClick={false}
                  anchor="bottom"
                  offset={50}
                  className="no-padding-popup px-0 py-0 m-0"

              >
                  <div className="text-sm font-medium px-2 py-2 leading-normal">
                    <p className="font-md text-xs">Click for site info & voting</p>
                  </div>
              </Popup>
              )}

          </Map>

          <div className="absolute bottom-10 sm:top-10 w-full sm:right-0 lg:right-10 flex flex-col items-center justify-end sm:px-4 pb-[14px] sm:pb-0 sm:items-end sm:justify-start sm:pt-[50px] pointer-events-none">
            <div className="w-full max-w-md sm:max-w-3xl sm:w-[400px] p-2 overflow-x-auto">

              <div className="sm:border-4 w-full overflow-hidden rounded-lg border border-white shadow-md pointer-events-auto">

                <div className="hidden sm:block py-2 text-center text-gray-600 bg-gray-300">
                  <h2 className="text-lg font-light">
                    Leaderboard
                  </h2>
                </div>

                <table className="min-w-full table-fixed border-separate border-spacing-0">
                  <thead className="bg-gray-200 text-gray-700 uppercase text-[9px] sm:text-xs font-semibold">
                    <tr>
                      <th className="px-2 py-1 sm:py-3 text-center align-middle">Rank</th>
                      <th className="px-1 py-1 sm:py-3 text-left align-middle">Location</th>
                      <th className="px-1 py-1 sm:py-3 text-left align-middle">Votes</th>
                      <th className="px-1 py-1 sm:py-3 text-center align-middle">Zoom</th>
                      <th className="px-1 py-1 sm:py-3 text-center align-middle">3D</th>
                      <th className="px-1 pr-3 py-1 sm:py-3 text-center align-middle">Share</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {data && (
                    <>
                    {data.features.map((item, index) => (
                      <tr
                        key={index}
                        className={`${
                          index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                        } ${index === data.length - 1 ? 'rounded-b-lg overflow-hidden' : ''}`}
                      >
                        <td className="px-1 py-1 sm:py-3 text-[11px] sm:text-sm font-extrabold text-gray-800 text-center align-middle">{item.properties.positionordinal}</td>
                        <td className="px-1 py-1 sm:py-3 text-[11px] sm:text-sm text-left align-left">{item.properties.area}</td>
                        <td className="px-1 py-1 sm:py-3 text-[11px] sm:text-sm text-left font-extrabold align-middle"> 
                          {item.properties.numvotes}&nbsp;
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="text-gray-300 font-md">
                                (
                                {(item.properties.votes_confirmed !== 0) && <span className="text-green-400">{item.properties.votes_confirmed}</span>}
                                {(item.properties.votes_confirmed !== 0) && (item.properties.votes_unconfirmed !== 0) && "/"}
                                {(item.properties.votes_unconfirmed !== 0) && <span >{item.properties.votes_unconfirmed}</span>}
                                )
                                </span>
                              </TooltipTrigger>
                              <TooltipContent
                                side="right"
                                sideOffset={10}
                                className="bg-white text-black text-xs border shadow px-3 py-1 rounded-md hidden sm:block"
                              >
                                {item.properties.votes_confirmed} confirmed vote{(item.properties.votes_confirmed == 1) ? '': 's'}, {item.properties.votes_unconfirmed} unconfirmed vote{(item.properties.votes_unconfirmed == 1) ? '': 's'}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          </td>
                        <td className="px-1 py-1 sm:py-3 text-[11px] sm:text-sm text-center align-middle">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  onClick={() => onZoomTo(item)}
                                  type="button"
                                >
                                  <Search className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent
                                side="right"
                                sideOffset={10}
                                className="bg-white text-black text-xs border shadow px-3 py-1 rounded-md hidden sm:block"
                              >
                                Zoom to position
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </td>
                        <td className="px-1 py-1 sm:py-3 text-[11px] sm:text-sm text-center align-middle">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  onClick={() => setViewerData({longitude: item.geometry.coordinates[0], latitude: item.geometry.coordinates[1]})}
                                  type="button"
                                >
                                  <Video className="w-5 h-5 sm:w-5 sm:h-5 fill-current text-blue-600" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent
                                side="right"
                                sideOffset={10}
                                className="bg-white text-black text-xs border shadow px-3 py-1 rounded-md hidden sm:block"
                              >
                                3D view of turbine
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </td>
                        <td className="px-2 py-1 pr-3 sm:py-3 text-[11px] sm:text-sm text-center align-middle">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  onClick={() => setSocialmedia(item)}
                                  type="button"
                                >
                                  <Share2 className="w-3 h-3 sm:w-4 sm:h-4 fill-current text-blue-600" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent
                                side="right"
                                sideOffset={10}
                                className="bg-white text-black text-xs border shadow px-3 py-1 rounded-md hidden sm:block"
                              >
                                Share this vote on social media
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </td>
                      </tr>
                    ))}
                    </>

                    )}
                  </tbody>
                </table>

                {(firstPage !== lastPage) &&
                <div className="bg-gray-100">
                  <div className="flex justify-center gap-3 sm:gap-6 items-center pt-1 pb-1 sm:pt-3 sm:pb-3">
                    <button disabled={page === firstPage} onClick={() => setPage(firstPage)} className="p-2 rounded-full border bg-white border-gray-300 text-blue-600 disabled:text-gray-600 sm:hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed">
                      <ChevronsLeft className="w-3 h-3" strokeWidth={3.5}/>
                    </button>

                    <button disabled={page === prevPage} onClick={() => setPage(prevPage)} className="p-2 rounded-full border bg-white border-gray-300 text-blue-600 disabled:text-gray-600 sm:hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed">
                      <ChevronLeft className="w-3 h-3" strokeWidth={5}/>
                    </button>

                    <span className="text-[11px] sm:text-sm font-md text-black">
                      Page {page}
                    </span>

                    <button disabled={page === nextPage} onClick={() => setPage(nextPage)} className="p-2 rounded-full border bg-white border-gray-300 text-blue-600 disabled:text-gray-600 sm:hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed">
                      <ChevronRight className="w-3 h-3" strokeWidth={5}/>
                    </button>

                    <button disabled={page === lastPage} onClick={() => setPage(lastPage)} className="p-2 rounded-full border bg-white border-gray-300 text-blue-600 disabled:text-gray-600 sm:hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed">
                      <ChevronsRight className="w-3 h-3" strokeWidth={3.5}/>
                    </button>
                  </div>
                </div>
                }

              </div>

              {socialmedia && (
                <SocialMediaModal
                  open={true}
                  data={socialmedia}
                  onClose={() => setSocialmedia(null)}
                />
              )}

              {viewerData && (
                <CesiumModal
                  isOpen={true}
                  longitude={viewerData.longitude}
                  latitude={viewerData.latitude}
                  onClose={() => setViewerData(null)}
                />
              )}

            </div>
          </div>

      </div>

    </div>

  );
}
