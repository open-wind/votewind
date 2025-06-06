'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useMemo } from 'react';
import maplibregl from 'maplibre-gl';
import Map, { AttributionControl, Marker } from 'react-map-gl/maplibre';
import { Video } from 'lucide-react'
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { Card, CardContent } from "@/components/ui/card";
import ScrollHint from '@/components/scrollhint'
import PartnerLogos from '@/components/partner-logos';
import SocialShareButtons from "@/components/social-share-buttons";
import CesiumModal from '@/components/cesium-modal';
import { APP_BASE_URL, API_BASE_URL, MAP_PLACE_ZOOM, VOTEWIND_MAPSTYLE } from '@/lib/config';

const assetPrefix = process.env.ASSET_PREFIX || '';

export default function Leaderboard({}) {
  const searchParams = useSearchParams();
  const panelRef = useRef(null)
  const [isReady, setIsReady] = useState(false);
  const [data, setData] = useState(null);
  const [viewerData, setViewerData] = useState(null);
  const mapRefs = useRef({});

  const rankStyles = {
    1: { size: 'w-14 h-14 text-4xl sm:w-24 sm:h-24 sm:text-7xl', bg: 'bg-blue-800', color: 'text-white'},
    2: { size: 'w-12 h-12 text-3xl sm:w-20 sm:h-20 sm:text-5xl', bg: 'bg-blue-500', color: 'text-white' },
    3: { size: 'w-11 h-11 text-2xl sm:w-16 sm:h-16 sm:text-4xl', bg: 'bg-blue-300', color: 'text-white' },
    default: { size: 'w-10 h-10 text-2xl sm:w-14 sm:h-14 sm:text-3xl', bg: 'bg-blue-100', color: 'text-gray-400' }
  };

  useEffect(() => {
    
    fetch(API_BASE_URL + `/api/leaderboard`)
      .then(res => res.json())
      .then((data) => {
        setData(data);
        setIsReady(true);
        console.log(data);
      })
      .catch((error) => {
        setIsReady(true);
        // console.error;
      }
    );
  }, []);

  if (!isReady) return null;

  return (
    <div>

    <main ref={panelRef} className="pt-20 sm:pt-20 h-screen overflow-y-auto bg-cover bg-center"
        style={{ backgroundImage: `url('${assetPrefix}/images/sunrise-3579931_1920.jpg')` }} >

        <ScrollHint targetRef={panelRef} />

        <section className="flex flex-col items-center px-3 mb-36">

            <div className="w-full max-w-[800px] mx-auto rounded-2xl mb-2 bg-white/70 p-4 sm:p-6 text-sm sm:text-medium">
              <div className="flex items-center">
                <img
                  src={`${assetPrefix}/icons/check-mark.svg`}
                  alt="Vote"
                  className="w-20 h-20 sm:w-[150px] sm:h-[150px] mr-2 sm:mr-6"
                />
                <h1 className="text-4xl sm:text-8xl font-extrabold sm:font-medium text-left">Leaderboard</h1>
              </div>

              <div className="space-y-2 mt-5">
                {data.features.map((feature, index) => {
                  const rank = index + 1;
                  const style = rankStyles[rank] || rankStyles.default;
                  const turbinePosition = {longitude: feature.geometry.coordinates[0], latitude: feature.geometry.coordinates[1]};
                  const zoom = MAP_PLACE_ZOOM;
                  const initialViewState={
                      longitude: turbinePosition.longitude,
                      latitude: turbinePosition.latitude,
                      zoom: zoom
                  };

                  return (
                    <div key={index} className="flex space-x-4">
                      {/* Fixed-width number column, centered circle */}
                      <div className="w-16 sm:w-[150px] flex justify-center mr-0 sm:mr-0">
                        <div
                          className={`flex items-center justify-center rounded-full font-bold ${style.color} ${style.size} ${style.bg} sm:ml-3 mr-0 sm:mr-3`}
                        >
                          {rank}
                        </div>
                      </div>

                      {/* Vote info */}
                      <div className="w-full text-sm sm:text-base">

                        <Card className="relative w-full max-w-[800px] mx-auto rounded-2xl mt-0">
                          <CardContent className="w-full flex flex-col items-center gap-3 px-4 pt-4 sm:px-6 sm:pt-6 pb-6 shadow-md shadow-[0_35px_60px_-15px_rgba(0,0,0,0.4)] rounded-lg">

                            {/* MAP */}
                            <div className="w-full h-[200px] sm:w-full sm:h-[350px] border-[4px] border-black overflow-hidden">
                              <div id="map" className="w-full h-full relative">

                                <div className="absolute left-2 top-2 z-10">
                                  <div className="bg-gray-100 rounded-md shadow p-1 flex flex-col items-center gap-1">

                                      <button type="button" onClick={() => mapRefs.current[index]?.zoomIn()} className="w-6 h-6 bg-white rounded active:bg-white focus:outline-none focus:ring-0">
                                      ➕
                                      </button>
                                      <button type="button" onClick={() => mapRefs.current[index]?.zoomOut()} className="w-6 h-6 bg-white rounded">
                                      ➖
                                      </button>

                                    </div>
                                </div>


                                <Map
                                  ref={(instance) => {if (instance) {mapRefs.current[index] = instance;}}}
                                  dragPan={false}
                                  dragRotate={false}
                                  scrollZoom={false}
                                  doubleClickZoom={true}
                                  boxZoom={false}
                                  keyboard={false}
                                  touchZoomRotate={true}
                                  interactive={false}
                                  touchRotate={false}
                                  pitchWithRotate={false}
                                  initialViewState={initialViewState}
                                  style={{ width: '100%', height: '100%' }}
                                  padding={{ top: 80, bottom: 0, left: 0, right: 0 }}
                                  mapStyle={VOTEWIND_MAPSTYLE}
                                >
                                  <Marker
                                    longitude={initialViewState.longitude}
                                    latitude={initialViewState.latitude}
                                    draggable={false}
                                    anchor="bottom"
                                    offset={[0, 0]}
                                  >
                                    <img
                                      alt="Wind turbine"
                                      width="80"
                                      height="80"
                                      src={`${assetPrefix}/icons/windturbine_blue.png`}
                                    />
                                  </Marker>
                                </Map>
                              </div>
                            </div>

                            {/* TEXT BELOW MAP */}
                            <div className="flex flex-col items-center text-center">
                              <h1 className="text-md sm:text-2xl font-medium sm:font-medium leading-snug mb-2">
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <a className="text-blue-700" href={APP_BASE_URL + "/" + String(turbinePosition.longitude) + "/" + String(turbinePosition.latitude) + "/12/"}>
                                        {turbinePosition.latitude.toFixed(5)}° N,&nbsp;
                                        {turbinePosition.longitude.toFixed(5)}° E
                                      </a>
                                    </TooltipTrigger>
                                    <TooltipContent
                                      side="left"
                                      sideOffset={10}
                                      className="bg-white text-black text-xs border shadow px-3 py-1 rounded-md hidden sm:block"
                                    >
                                      Click to goto position on main map
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>

                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button
                                        onClick={() => setViewerData(turbinePosition)}
                                        type="button"
                                        className="inline-flex ml-4 translate-y-[4px] sm:translate-y-[0px] relative items-center justify-center h-6 w-6 sm:h-6 sm:w-6 px-1 py-1 bg-blue-600 text-white rounded-full shadow-lg"
                                      >
                                        <Video className="w-5 h-5 sm:w-5 sm:h-5 fill-current text-white" />
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
                              </h1>

                              <h2 className="text-2xl font-light leading-snug mb-1">
                              </h2>

                              <div className="flex flex-wrap justify-center items-center text-center gap-x-3 gap-y-2 mb-4">
                                <div className="flex gap-2">
                                  {(feature.properties.confirmed !== 0) && (
                                  <div className="min-w-12 px-3 h-12 rounded-full bg-green-600 text-white flex items-center justify-center shadow-md text-xl font-extrabold">
                                    {feature.properties.confirmed}
                                  </div>
                                  )}
                                  {(feature.properties.unconfirmed !== 0) && (
                                  <div className="min-w-12 h-12 px-3 rounded-full bg-white text-black flex items-center justify-center shadow-md border text-xl font-extrabold">
                                    {feature.properties.unconfirmed}
                                  </div>
                                  )}
                                </div>

                                <p className="text-sm text-gray-700">
                                  {feature.properties.confirmed !== 0 && (
                                    <>{feature.properties.confirmed} confirmed vote{(feature.properties.confirmed > 1) && (<>s</>)}</>
                                  )}
                                  {feature.properties.confirmed !== 0 && feature.properties.unconfirmed !== 0 && ', '}
                                  {feature.properties.unconfirmed !== 0 && (
                                    <>{feature.properties.unconfirmed} unconfirmed vote{(feature.properties.unconfirmed > 1) && (<>s</>)}</>
                                  )}
                                </p>
                              </div>

                              <SocialShareButtons showstrap={false} title="Vote for this community wind turbine location!" suppliedurl={APP_BASE_URL + "/" + String(turbinePosition.longitude) + "/" + String(turbinePosition.latitude) + "/vote"} />
                            </div>
                          </CardContent>
                        </Card>


                      </div>

                    </div>
                  );
                })}
              </div>

            </div>



        </section>

{viewerData && (
  <CesiumModal
    isOpen={true}
    longitude={viewerData.longitude}
    latitude={viewerData.latitude}
    onClose={() => setViewerData(null)}
  />
)}

    {/* <CesiumModal longitude={turbinePosition.longitude} latitude={turbinePosition.latitude} isOpen={showCesiumViewer} onClose={()=>setShowCesiumViewer(false)} /> */}

    </main>

      <PartnerLogos />

    </div>
  );
}
