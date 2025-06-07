'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import maplibregl from 'maplibre-gl';
import debounce from 'lodash.debounce';
import toast, { Toaster } from 'react-hot-toast';
import Map, { AttributionControl, Marker, Popup } from 'react-map-gl/maplibre';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import Image from "next/image";
import { Wind, Video } from 'lucide-react'
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/solid';
const querystring = require('querystring');
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/components/functions/helpers"
import CesiumModal from './cesium-modal';
import AutocompleteInput from './autocomplete-input';
import PlanningConstraints from './planningconstraints';
import PercentageSlider from "@/components/percentage-slider";
import SessionInstructionPopup from '@/components/session-instruction-popup';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import { point as turfPoint } from '@turf/helpers';
import { 
    EMAIL_EXPLANATION, 
    MAP_DEFAULT_CENTRE, 
    MAP_DEFAULT_BOUNDS, 
    MAP_MAXBOUNDS, 
    MAP_DEFAULT_ZOOM, 
    MAP_PLACE_ZOOM, 
    MAP_SUBSTATION_ZOOM,
    MAP_MINZOOM_CONSTRAINTS,
    API_BASE_URL, 
    TILESERVER_BASEURL,
    LAYERS_ALLCONSTRAINTS, 
    LAYERS_COLOR, 
    LAYERS_OPACITY 
} from '@/lib/config';

import 'maplibre-gl/dist/maplibre-gl.css';

const assetPrefix = process.env.ASSET_PREFIX || '';

export default function VoteWindMap({ longitude=null, latitude=null, zoom=null, type='', bounds=null, style=null, turbineAtCentre=false }) {
    const router = useRouter();
    const mapRef = useRef();
    const markerRef = useRef();
    const isFittingBounds = useRef(false);
    const isRecentering = useRef(false);
    const inputRef = useRef(null);
    const [query, setQuery] = useState('');
    const [initialPosition, setInitialPosition] = useState({longitude: parseFloat(longitude), latitude: parseFloat(latitude), type: type})
    const [processing, setProcessing] = useState(false);
    const [mapLoaded, setMapLoaded] = useState(false);
    const [showInfo, setShowInfo] = useState(!(style === 'overview'));
    const [showCesiumViewer, setShowCesiumViewer] = useState(false);
    const [showToggleContraints, setShowToggleConstraint] = useState(false);
    const [turbineAdded, setTurbineAdded] = useState(false);
    const [displayTurbine, setDisplayTurbine] = useState(true);
    const [turbinePosition, setTurbinePosition] = useState({'longitude': null, 'latitude': null});
    const [containingAreas, setContainingAreas] = useState(null);
    const [votesCast, setVotesCast] = useState(null);
    const [votesText, setVotesText] = useState('');
    const [organisation, setOrganisation] = useState(null);
    const [isBouncing, setIsBouncing] = useState(false);
    const [email, setEmail] = useState('');
    const [alertMessage, setAlertMessage] = useState('');
    const [hasConsent, setHasConsent] = useState(null); // null = still loading
    const [showConsentBanner, setShowConsentBanner] = useState(false);
    const [showSearch, setShowSearch] = useState(false);
    const [error, setError] = useState('');
    const [popupInfo, setPopupInfo] = useState(null);
    const [locating, setLocating] = useState(false);
    const [layersVisible, setLayersVisible] = useState(true);
    const [layersOpacityValue, setLayersOpacityValue] = useState(LAYERS_OPACITY);
    const [layersClicked, setLayersClicked] = useState(null);
    const [markerDragging, setMarkerDragging] = useState(false);
    const [substation, setSubstation] = useState(null);
    const [windspeed, setWindspeed] = useState(null);

    const isMobile = useIsMobile();
    const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
    const popupLayers = ['osm-substations-circle', 'votes-confirmed', 'votes-unconfirmed', 'organisations-default'];

    // **********************************************************************
    // Functions relating to showing/hiding planning constraint layers
    // **********************************************************************

    const layersHide = (map) => {
        // We set 'fill-opacity' = 0 so we can still query planning constraints even if not visible
        for (const id of LAYERS_ALLCONSTRAINTS) {
            if (map.getLayer(id)) {
                map.setPaintProperty(id, 'fill-opacity', 0);
            }
        }
    }

    const layersShow = (map) => {
        for (const id of LAYERS_ALLCONSTRAINTS) {
            if (map.getLayer(id)) {
                map.setPaintProperty(id, 'fill-opacity', layersOpacityValue);
            }
        }
    }

    const layersOpacity = (map, opacity) => {
        for (const id of LAYERS_ALLCONSTRAINTS) {
            const layer = map.getLayer(id);
            if (!layer) continue;

            const type = layer.type;

            if (type === 'fill') {
                const layer_opacity = id.includes('other-technical-constraints') ? (opacity / 1) : opacity; 
                map.setPaintProperty(id, 'fill-opacity', layer_opacity);
            } 
            
        }
    }

    // **********************************************************************
    // Functions converting between internal opacity and opacity slider
    // **********************************************************************

    const opacity2slider = (opacity) => {
        const factor = Math.pow(opacity, 1 / 3);
        return factor * 100;
    }

    const slider2opacity = (slider) => {
        const factor = slider / 100;
        return Math.pow(factor, 3); // 2.0 = gentle curve, 3.0 = steeper
    }

    // **********************************************************************
    // Function to animate turbine marker
    // **********************************************************************

    const triggerBounce = () => {
        setIsBouncing(true);
        setTimeout(() => setIsBouncing(false), 500); // match animation duration
    };
    
    const incorporateBaseDomain = (baseurl, json) => {

        let newjson = JSON.parse(JSON.stringify(json));
        const sources_keys = Object.keys(newjson['sources'])
        for (let i = 0; i < sources_keys.length; i++) {
            const sources_key = sources_keys[i];
            if ('url' in newjson['sources'][sources_key]) {
                if (!(newjson['sources'][sources_key]['url'].startsWith('http'))) {
                    newjson['sources'][sources_key]['url'] = baseurl + newjson['sources'][sources_key]['url'];
                }
            }
        }  

        // Add planning constraints sources and stylesheets
        for (const layer_id of LAYERS_ALLCONSTRAINTS) {
            newjson['sources'][layer_id] = {
                'type': 'vector',
                'buffer': 512,
                'url': TILESERVER_BASEURL + '/data/' + layer_id + '.json',
                'attribution': 'Source data copyright of multiple organisations. For all data sources, see <a href="https://data.openwind.energy" target="_blank">data.openwind.energy</a>'
            }

            const isTechnicalConstraint = layer_id.includes('other-technical-constraints'); 

            let constraint_layer_style = null;
            if (isTechnicalConstraint) {
                constraint_layer_style = {
                    id: layer_id,
                    type: 'fill',
                    source: layer_id,
                    "source-layer": "latest--other-technical-constraints",
                    minzoom: MAP_MINZOOM_CONSTRAINTS,
                    paint: {
                        'fill-color': LAYERS_COLOR,
                        'fill-opacity': (LAYERS_OPACITY),
                        'fill-outline-color': '#FFFFFF00'
                    },
                    "layout": {
                        "visibility": "visible"
                    }
                }
            } else {
                constraint_layer_style = {
                    id: layer_id,
                    type: 'fill',
                    source: layer_id,
                    "source-layer": layer_id,
                    minzoom: MAP_MINZOOM_CONSTRAINTS,
                    paint: {
                        'fill-color': LAYERS_COLOR,
                        'fill-opacity': LAYERS_OPACITY,
                        'fill-outline-color': '#00000000'
                    },
                    "layout": {
                        "visibility": "visible"
                    }
                }
            }

            if (constraint_layer_style) newjson['layers'].push(constraint_layer_style);
        }

        // Add substations stylesheet
        var substations_style = require('./stylesheets/substations.json');
        for (let i = 0; i < substations_style.length; i++) newjson['layers'].push(substations_style[i]);

        // Add voting stylesheet
        var votes_style = require('./stylesheets/votes.json');
        for (let i = 0; i < votes_style.length; i++) newjson['layers'].push(votes_style[i]);

        // Add organisations stylesheet
        var organisations_style = require('./stylesheets/organisations.json');
        for (let i = 0; i < organisations_style.length; i++) newjson['layers'].push(organisations_style[i]);

        newjson['glyphs'] = baseurl + newjson['glyphs'];
        newjson['sprite'] = baseurl + newjson['sprite'];

        return newjson;
    }

    const capitalizeFirst = (str) => {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    const onMouseMove = (e) => {
        if (markerDragging) return;

        const feature = e.features?.[0];
        if (!isMobile && feature && popupLayers.includes(feature.layer.id)) {
            var content = '';
            var heading = '';
            if (feature.layer.id.startsWith('votes-')) {
                const votes_confirmed = parseInt(feature.properties.votes_confirmed);
                const votes_unconfirmed = parseInt(feature.properties.votes_unconfirmed);
                heading = 'Votes';
                content = getVoteText(votes_confirmed, votes_unconfirmed) + ' ';
                content = content.replaceAll(' votes', '').replaceAll(' vote', '').replaceAll(' and ', ', ');
            }
            if (feature.layer.id.startsWith('organisations-')) {
                heading = 'Community Energy Organisation';
                content = feature.properties.name;
            }
            if (feature.layer.id.startsWith('osm-substations-')) {
                heading = 'Substation';
                content = [];
                const possible_elements = ['name', 'substation', 'voltage', 'operator']
                for (const element of possible_elements) {
                    if (feature.properties[element] !== undefined) {
                        var content_item = capitalizeFirst(feature.properties[element].replaceAll("_", " "));
                        if (element === 'voltage') content_item += ' volts';
                        content.push(content_item);
                    }
                }
            }

            setPopupInfo({
                lngLat: e.lngLat,
                properties: {heading: heading, content: content}
            });
        } else {
            setPopupInfo(null);
        }
    }

    const toggleLayersVisibility = () => {
        const map = mapRef.current?.getMap?.();
        if (!map) return;

        if (layersVisible) layersHide(map);
        else layersShow(map);
        setLayersVisible(!layersVisible);
    }

    const onOpacitySliderChange = (slider) => {
        setLayersOpacityValue(slider2opacity(slider));
    }

    useEffect(() => {
        const map = mapRef.current?.getMap?.();
        if ((!map) || (!layersOpacityValue)) return;
        layersOpacity(map, layersOpacityValue);
    }, [layersOpacityValue]);

    useEffect(() => {
        if (!showConsentBanner) return;

        const tryRender = setInterval(() => {
            if (window.grecaptcha && document.getElementById('recaptcha-container')) {
            window.grecaptcha.render('recaptcha-container', {
                sitekey: process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY,
            });
            clearInterval(tryRender);
            }
        }, 300);

        return () => clearInterval(tryRender);
    }, [showConsentBanner]);

    useEffect(() => {

        if(!turbineAdded) return;

        // Reset planning constraint layers as these will be set onIdle
        setLayersClicked(null);

        const retrieveTurbinePositionData = async () => {
            const res_boundaries = await fetch(API_BASE_URL + '/api/containingboundaries', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({position: turbinePosition})
            });

            const data_boundaries = await res_boundaries.json();
            if (!data_boundaries.success) {
                setError("Unable to retrieve containing boundaries");
                return;
            }

            setContainingAreas(data_boundaries.results);

            const res_substation = await fetch(API_BASE_URL + '/api/substation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({position: turbinePosition})
            });

            const data_substation = await res_substation.json();
            if (!data_substation.success) {
                setError("Unable to retrieve substation data");
                return;
            }

            setSubstation(data_substation.results);

            const res_windspeed = await fetch(API_BASE_URL + '/api/windspeed', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({position: turbinePosition})
            });

            if (!res_windspeed.ok) {
                setError("Unable to retrieve windspeed data");
                return;
            }

            const data_windspeed = await res_windspeed.json();
            setWindspeed(data_windspeed.windspeed);
        }

        retrieveTurbinePositionData();

    }, [turbinePosition])

    const isPointOnScreen = (map, lng, lat) => {
        const screenPos = map.project([lng, lat]);

        // Get the canvas container’s actual screen position
        const rect = map.getContainer().getBoundingClientRect();

        return (
            screenPos.x >= 0 &&
            screenPos.y >= 0 &&
            screenPos.x <= rect.width &&
            screenPos.y <= rect.height
        );
    }

    const onIdle = (e) => {
        // Planning constraint layers may not be accessible at low zooms so wait until 'idle' 
        // and get planning constraints for turbine using a combination of queryRenderedFeatures
        // and turfjs booleanPointInPolygon (for better accuracy)

        if(!turbineAdded) return;

        const map = mapRef.current?.getMap?.();
        if (!map) return;
        
        // Don't derive planning constraints if zoom is too low
        if (map.getZoom() < MAP_MINZOOM_CONSTRAINTS) return;
        
        // Don't derive planning constraints if turbine position off screen
        if (!isPointOnScreen(map, turbinePosition.longitude, turbinePosition.latitude)) return;

        const screenPoint = map.project({'lng': turbinePosition.longitude, 'lat': turbinePosition.latitude});
        const features = map.queryRenderedFeatures(screenPoint, { layers: LAYERS_ALLCONSTRAINTS });
        const clickedPoint = turfPoint([turbinePosition.longitude, turbinePosition.latitude]);
        const filtered = features.filter((feature) => booleanPointInPolygon(clickedPoint, feature));
        var clicked_features = [];
        for (const clicked_feature of filtered) {
            clicked_features.push(formatLayerName(clicked_feature.layer.id));
        }
        setLayersClicked(clicked_features.reverse());
    }

    useEffect(() => {
        const map = mapRef.current?.getMap?.();
        if (!map || !bounds) return;

        isFittingBounds.current = true;

        map.fitBounds(bounds, {
            padding: 40,
            duration: 1000,
        });

        // After the move ends, reset the flag
        const onMoveEnd = () => {
            isFittingBounds.current = false;
            map.off('moveend', onMoveEnd);
        };

        map.on('moveend', onMoveEnd);
        
    }, [bounds, mapLoaded]);

    if (zoom === null) zoom = MAP_DEFAULT_ZOOM;
    if ((latitude === null) || (longitude === null)) {
        bounds = [
            [MAP_DEFAULT_BOUNDS.left, MAP_DEFAULT_BOUNDS.bottom], 
            [MAP_DEFAULT_BOUNDS.right, MAP_DEFAULT_BOUNDS.top],
        ];
        latitude = MAP_DEFAULT_CENTRE.latitude;
        longitude = MAP_DEFAULT_CENTRE.longitude;
    }

    const initialViewState={
        longitude: longitude,
        latitude: latitude,
        zoom: zoom
    };

    const onLoad = () => {
        const map = mapRef.current?.getMap();
        if (!map) return;

        if (turbineAtCentre && (longitude !== null) && (latitude !== null)) {
            // Wait for map to go idle before setting turbine position as this relies 
            // on queryRenderedFeatures to get planning constraints for turbine position
            map.once('idle', () => {
                setTurbinePosition({'longitude': parseFloat(longitude), 'latitude': parseFloat(latitude)});
                setTurbineAdded(true);
            });
        }

        map.touchZoomRotate.disableRotation();

        // Load any images that are too fiddly to incorporate into default images
        const images_to_load = [    'check-mark-circle-dropshadow',
                                    'check-mark-circle-desaturated-dropshadow', 
                                    'check-mark-circle-outline', 
                                    'check-mark-circle-outline-sdf', 
                                    'check-mark-blue',
                                    'check-mark-person'];

                                    for(let i = 0; i < images_to_load.length; i++) {
            const image_id = images_to_load[i];
            if (!map.hasImage(image_id)) {
                const img = new window.Image();
                img.src = `${assetPrefix}/icons/${image_id}.png`;
                img.onload = () => map.addImage(image_id, img, { sdf: image_id.endsWith('-sdf')});

            }
        }

        const defaultStyle = require('./stylesheets/openmaptiles.json');
        const mapStyle = incorporateBaseDomain(TILESERVER_BASEURL, defaultStyle);
        map.setStyle(mapStyle);
        setMapLoaded(true);
    }
        
    const updateURL = debounce((view) => {
        const longitude = view.longitude.toFixed(5);
        const latitude = view.latitude.toFixed(5);
        const zoom = view.zoom.toFixed(2)
        var url = `/${longitude}/${latitude}/${zoom}`;
        const params = new URLSearchParams();
        if (turbineAdded) params.set('selectturbine', 'true');
        if (style) params.set('style', style);
        const query = params.toString();
        if (query) url += `?${query}`;
        window.history.replaceState(null, '', url);
    }, 300);

    const onMoveEnd = (e) => {
        if (isFittingBounds.current === false) updateURL(e.viewState);
        if (isRecentering.current) {
            triggerBounce();
            isRecentering.current = false;
        }
    }

    const onZoom = (e) => {
        const currentZoom = e.target.getZoom();
        const showConstraintsNewState = (currentZoom >= MAP_MINZOOM_CONSTRAINTS);
        if (showToggleContraints != showConstraintsNewState) setShowToggleConstraint(showConstraintsNewState);
    }

    const toastOnshoreOnly = () => {
        toast.dismiss();
        toast.error('Onshore wind only');
    }

    const onTurbineMarkerDragStart = (event) => {
        setMarkerDragging(true);
    }

    const onTurbineMarkerDragEnd = (event) => {
        setMarkerDragging(false);
        var acceptableposition = true;
        const lngLat = event.lngLat;
        const map = mapRef.current?.getMap?.();
        if (map) {
            const point = map.project(lngLat);
            const features = map.queryRenderedFeatures(point);
            if (features.length > 0) {
                if (features[0]['sourceLayer'] === 'water') {
                    acceptableposition = false;
                    toastOnshoreOnly();
                }
            }
        }

        if (acceptableposition) {
            setTurbinePosition({'longitude': lngLat.lng, 'latitude': lngLat.lat});
        }
        else setTurbinePosition({'longitude': turbinePosition.longitude, 'latitude': turbinePosition.latitude});
    }

    useEffect(() => {
        if (!turbinePosition || !turbineAdded) return;
        requestAnimationFrame(mapCentreOnTurbine);
    }, [turbinePosition, turbineAdded]);

    useEffect(() => {
        if (organisation === null) return;
        requestAnimationFrame(mapCentreOnOrganisation);
    }, [organisation]);

    const deselectActiveItems = () => {
        setVotesCast(null);
        setVotesText(null);
        const map = mapRef.current?.getMap?.();
        if (map) {
            map.removeFeatureState({ source: "votes" });
            map.removeFeatureState({ source: "organisations" });
        }
    }

    const getVoteText = (votes_confirmed, votes_unconfirmed) => {
        var vote_text = '';
        if (votes_confirmed != 0) {
            vote_text += String(votes_confirmed) + ' confirmed vote';
            if (votes_confirmed > 1) vote_text += 's';
            if (votes_unconfirmed != 0) vote_text += ' and ';
        }
        if (votes_unconfirmed != 0) {
            vote_text += String(votes_unconfirmed) + ' unconfirmed vote';
            if (votes_unconfirmed > 1) vote_text += 's';
        }

        return vote_text
    }

    const formatLayerName = (layer_id) => {
        var layer_name = layer_id
                            .replace('latest--', '')
                            .replaceAll('-', ' ')
                            .replace(' 0', ' ')
                            .replace('other technical constraints  ', 'other technical constraints (')
                            .replace(/\b\w/g, l => l.toUpperCase())
                            .replace(' And ', ' and ')
                            .replace('Other Technical Constraints', 'Safety buffer');


        if (layer_name.includes('Safety buffer')) layer_name += 'm turbine)'
        return layer_name;
    }


    const onClick = (event) => {
        var acceptableposition = true;
        deselectActiveItems();

        var turbineposition_new = {'longitude': event.lngLat.lng, 'latitude': event.lngLat.lat};
        var isExistingVote = false;
        var isOrganisation = false;
        
        if (event.features.length > 0) {
            var id = event.features[0]['layer']['id'];
            if (id == 'water') {
                acceptableposition = false;
                toastOnshoreOnly();
            }

            if (id.startsWith('votes-')) {
                const feature_id = event.features[0]['properties']['id'];
                turbineposition_new = {'longitude': event.features[0]['properties']['lng'], 'latitude': event.features[0]['properties']['lat']};
                const map = mapRef.current?.getMap?.();
                map.setFeatureState({ source: 'votes', id: feature_id },{ selected: true });
                const votes_confirmed = parseInt(event.features[0]['properties']['votes_confirmed']);
                const votes_unconfirmed = parseInt(event.features[0]['properties']['votes_unconfirmed']);
                setVotesCast(votes_confirmed + votes_unconfirmed)
                setVotesText(getVoteText(votes_confirmed, votes_unconfirmed));
                isExistingVote = true;
            } 

            if (id.startsWith('organisations-')) {
                const feature_id = event.features[0]['properties']['id'];
                const map = mapRef.current?.getMap?.();
                map.setFeatureState({ source: 'organisations', id: feature_id },{ selected: true });
                isOrganisation = true;
                setOrganisation(event.features[0]['properties']);
            } 

        } 

        if ((isExistingVote) || (isOrganisation)) setDisplayTurbine(false);
        else {
            if (!displayTurbine) setDisplayTurbine(true);
        }

        if (isOrganisation) {
            setTurbinePosition(null);
            setTurbineAdded(false);
        }
        else {
            setOrganisation(null);
            if (acceptableposition) {
                setTurbinePosition(turbineposition_new);
                setTurbineAdded(true);
            }
        }
    }

    const resetSettings = () => {
        setTurbineAdded(false);
        setDisplayTurbine(true);
        setError("");
        setEmail("");
        setVotesCast(null);
        setVotesText('');
        setOrganisation(null);
        setLayersClicked(null);
        deselectActiveItems();
    }

    const closePanel = () => {
        resetSettings();
    }

    const mapCentreOnSubstation = () => {
        const map = mapRef.current?.getMap?.();
        if (!map) return;
        if (!substation) return;
        isRecentering.current = true;
        if (map.getZoom() < MAP_SUBSTATION_ZOOM) {
            map.flyTo({center: {lng: substation.position.longitude, lat: substation.position.latitude}, zoom: MAP_SUBSTATION_ZOOM, padding: {top: 100, bottom: turbineAdded ? window.innerHeight / 3 : 0}});
        } else {
            map.flyTo({center: {lng: substation.position.longitude, lat: substation.position.latitude}, padding: {top: 100, bottom: turbineAdded ? window.innerHeight / 3 : 0}});
        }
    }

    const mapCentreOnTurbine = () => {
        const map = mapRef.current?.getMap?.();
        if (!map) return;
        if (!turbinePosition) return;
        isRecentering.current = true;
        if (map.getZoom() < MAP_PLACE_ZOOM) {
            map.flyTo({center: {lng: turbinePosition.longitude, lat: turbinePosition.latitude}, zoom: MAP_PLACE_ZOOM, padding: {top: 100, bottom: turbineAdded ? window.innerHeight / 3 : 0}});
        } else {
            map.flyTo({center: {lng: turbinePosition.longitude, lat: turbinePosition.latitude}, padding: {top: 100, bottom: turbineAdded ? window.innerHeight / 3 : 0}});
        }
    }

    const mapCentreOnOrganisation = () => {
        const map = mapRef.current?.getMap?.();
        if (!map) return;
        if (organisation === null) return;
        isRecentering.current = true;

        if (map.getZoom() < MAP_PLACE_ZOOM) {
            map.flyTo({center: {lng: organisation.lng, lat: organisation.lat}, zoom: MAP_PLACE_ZOOM, padding: {top: 100, bottom: (organisation !== null) ? window.innerHeight / 3 : 0}});
        } else {
            map.flyTo({center: {lng: organisation.lng, lat: organisation.lat}, padding: {top: 100, bottom: (organisation !== null) ? window.innerHeight / 3 : 0}});
        }
    }

    const mapZoomIn = (e) => {
        const map = mapRef.current?.getMap?.();
        if (!map) return;
        map.zoomIn();
    }

    const mapZoomOut = () => {
        const map = mapRef.current?.getMap?.();
        if (!map) return;
        map.zoomOut();
    }

    const submitVote = async () => {
        if (!turbineAdded) return;

        const voteparameters = {
            position: turbinePosition,
            initialposition: initialPosition
        }

        if ((email) && (email !== '')) voteparameters.email = email;

        setProcessing(true);
        const res = await fetch(API_BASE_URL + '/api/vote', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(voteparameters),
            credentials: 'include',
        });

        const data = await res.json();
        if (!data.success) {
            setProcessing(false);
            setError("CAPTCHA verification failed. Please try again.");
            return;
        }

        resetSettings();

        let url = `/${turbinePosition.longitude.toFixed(5)}/${turbinePosition.latitude.toFixed(5)}/vote`;
        var urlparameters = {'type': 'votesubmitted'};
        if (email !== '') urlparameters.emailused = 'true';
        if(Object.keys(urlparameters).length) url += '?' + querystring.stringify(urlparameters);

        router.push(url);
    }

    const handleAccept = async () => {
        const token = window.grecaptcha.getResponse();

        if (!token) {
            setError("Please confirm you're not a robot:");
            return;
        }

        setProcessing(true);
        const res = await fetch(API_BASE_URL + '/api/setcookie', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token }),
            credentials: 'include',
        });

        const data = await res.json();

        if (!data.success) {
            setProcessing(false);
            setError("CAPTCHA verification failed. Please try again.");
            return;
        }

        setProcessing(false);
        setError('');
        setShowConsentBanner(false);
        submitVote();
    };

    const isValidEmail = (email) => {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    };

    const checkCookie = async () => {
        try {
            const res = await fetch(API_BASE_URL + '/api/hascookie', {
            credentials: 'include',
            });
            const data = await res.json();
            return data.valid; 
        } catch (err) {
            console.error("Consent check failed", err);
            return false; 
        }
    };

    const handleVote = async () => {
        if (!email) {
            const cookieset = await checkCookie();
            if (cookieset) {
                submitVote();
            } else {
                setError("");
                setShowConsentBanner(true);
                return;
            }
        } else {
            if (isValidEmail(email)) submitVote();
            else setAlertMessage('Please enter a valid email address - or delete your input to use no email address.');
        }
    }

    return (
    <main className="flex justify-center items-center w-screen h-screen">

        <SessionInstructionPopup />

        {processing && (
        <div className="fixed inset-0 bg-white bg-opacity-50 flex flex-col items-center justify-center z-50">
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-lg font-medium text-gray-700">Processing vote...</p>
        </div>
        )}

        {alertMessage && (
        <>
        {/* Backdrop (prevents background interaction) */}
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[1000]"></div>

        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[9999] w-[90%] max-w-md">
            <div className="rounded-md border border-gray-300 bg-white px-5 py-4 text-base text-gray-800 shadow-xl text-center">
            <div className="mb-3">
                <strong className="font-bold block">Invalid email</strong>
            </div>
            <div className="mb-3 text-sm">
                {alertMessage}
            </div>
            <div className="flex justify-center">
                <button
                onClick={() => setAlertMessage('')}
                className="bg-gray-200 text-gray-800 text-sm px-4 py-2 rounded hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400"
                >
                Close
                </button>
            </div>
            </div>
        </div>
        </>
        )}

        {/* Cookie consent banner */}
        {showConsentBanner && (
        <>
            {/* Backdrop (prevents background interaction) */}
            <div className="fixed inset-0 bg-black bg-opacity-50 z-[1000]"></div>

            {/* Modal */}
            <div className="fixed inset-0 z-[1001] flex items-center justify-center">
            <div className="bg-white border border-gray-300 shadow-lg rounded-lg p-6 max-w-sm w-full mx-4">
                <div className="mb-3 text-center">
                    <strong className="font-bold block">Set cookie</strong>
                </div>
                <p className="text-sm text-gray-700">
                We'd like to store a cookie to track who you are and prevent fraudulent voting. Is that okay?
                </p>
                {/* Recaptcha error message */}
                <div className="w-full flex justify-start mt-4">
                    {error && (<p className="text-red-600 text-sm font-medium mb-2">{error}</p>)}
                </div>
                {/* Recaptcha - to prevent spam voting */}
                <div className="w-full flex justify-start mt-0">
                    <div id="recaptcha-container" className="recaptcha-wrapper" />
                </div>
                <div className="mt-4 flex justify-end gap-2">
                    <button
                        onClick={() => setShowConsentBanner(false)}
                        className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                    >
                        Decline
                    </button>
                    <button
                        onClick={handleAccept}
                        className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                    >
                        Accept
                    </button>
                </div>
            </div>
            </div>
        </>
        )}

        {/*  Voting panel */}
        {turbineAdded && (
        <div className="fixed bottom-0 left-0 w-full h-1/3 min-h-[305px] overflow-y-auto bg-white/85 shadow-lg border-t z-50 flex flex-col justify-between px-2 pt-1 pb-2 sm:px-0 sm:pt-0 sm:pb-2">

            <div className="max-w-screen-xl mx-auto flex-1 px-0 sm:px-4 pb-2">

                {/* Close button */}
                <button
                onClick={closePanel}
                className="absolute top-1 right-4 text-gray-500 hover:text-gray-700 text-2xl leading-none"
                aria-label="Close vote panel"
                >
                &times;
                </button>

                <form
                onSubmit={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleVote();
                }}
                  className="flex flex-col justify-between h-full"

                >

                    {/* Content: Icon + Text */}
                    <div className="flex mt-0 sm:mt-0">
                        <div className="flex-shrink-0 w-25 h-25 sm:w-60 sm:h-40">
                            <div className="mt-9 ml-5 sm:mt-0 sm:ml-0 relative inline-block">

                            <img
                                src={`${assetPrefix}/icons/check-mark.svg`}
                                alt="Vote"
                                className="w-20 h-20 sm:w-60 sm:h-60 object-contain"
                            />

                            {(windspeed < 5) 
                            ? 
                            <div className="absolute top-0 sm:top-2 left-0 -translate-x-5 sm:translate-x-0 sm:-translate-x-5 -translate-y-7 sm:translate-y-0 w-14 h-14 sm:w-20 sm:h-20 border-2 sm:border-4 border-white rounded-full bg-red-600 text-white flex flex-col items-center justify-center shadow-lg">
                                <Wind className="w-5 h-5 sm:w-8 sm:h-8 mb-1 -translate-y-0.5" />
                                <div className="text-[7pt] sm:text-[8pt] leading-none pl-1 -translate-y-0.5"><span className="font-extrabold">{windspeed}</span> m/s</div>
                            </div>
                            : 
                            <div className="absolute top-0 sm:top-2 left-0 -translate-x-5 sm:translate-x-0 sm:-translate-x-5 -translate-y-7 sm:translate-y-0 w-14 h-14 sm:w-20 sm:h-20 border-2 sm:border-4 border-white rounded-full bg-blue-100 text-blue-700 flex flex-col items-center justify-center shadow-lg">
                                <Wind className="w-5 h-5 sm:w-8 sm:h-8 mb-1 -translate-y-0.5" />
                                <div className="text-[7pt] sm:text-[8pt] leading-none pl-1 -translate-y-0.5"><span className="sm:font-extrabold">{windspeed}</span> m/s</div>
                            </div>
                            }

                            {/* Red circle badge */}
                            {(votesCast !== null) && (

                            <TooltipProvider>
                                <Tooltip>
                                <TooltipTrigger asChild>
                                    <div className="absolute bottom-0 right-2 inline-flex items-center justify-center sm:bottom-2 sm:right-12 h-6 min-w-6 sm:h-14 sm:min-w-14 px-2 py-0.5 min-w-[1.25rem] bg-green-600 border-2 sm:border-4 border-white text-white text-[9px] sm:text-lg font-medium sm:font-bold rounded-full shadow-lg">
                                        {votesCast}
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent side="top" sideOffset={10} className="bg-white text-black text-xs border shadow px-3 py-1 rounded-md hidden sm:block">
                                    {votesText} for this location
                                </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>

                            )}
                            </div>
                        </div>

                        <div className="ml-4 flex flex-col justify-start mt-0 sm:mt-4">
                            <h2 className="text-xl sm:text-[24px] font-semibold mt-0 mb-0">Wind Turbine Vote     
                            <TooltipProvider>
                                <Tooltip>
                                <TooltipTrigger asChild>
                                    <button type="button" onClick={() => setShowCesiumViewer(true)} className="inline-flex ml-2 sm:ml-3 relative items-center justify-center sm:bottom-0 h-6 w-6 sm:h-7 sm:w-7 px-1 py-1 bg-blue-600 text-white sm:text-sm rounded-full shadow-lg">
                                        <Video className="w-3 h-3 sm:w-4 sm:h-4 fill-current text-white" />
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent side="right" sideOffset={10} className="bg-white text-black text-xs border shadow px-3 py-1 rounded-md hidden sm:block">
                                    3D view of turbine
                                </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                            </h2>

                            {/* Coordinates */}
                            <div className="flex flex-wrap gap-1 mt-2 sm:mt-4">
                                <p className="text-xs text-gray-700 ">
                                    <a className="text-blue-700" onClick={mapCentreOnTurbine} href="#"><b>Position: </b>{turbinePosition.latitude.toFixed(5)}° N {turbinePosition.longitude.toFixed(5)}° E</a>&nbsp;&nbsp;
                                </p>
                                <p className="text-xs text-gray-700 whitespace-nowrap">
                                {substation && (
                                <a className="text-blue-700" onClick={mapCentreOnSubstation} href="#"><b>Nearest substation</b>: {substation.distance_km} km</a>
                                )}
                                </p>
                            </div>

                            {layersClicked && (
                                <>
                                {containingAreas && (
                                <PlanningConstraints containingAreas={containingAreas} content={layersClicked.length === 0 
                                ? <i>No planning constraints found</i>
                                : layersClicked.join(", ")} longitude={turbinePosition.longitude} latitude={turbinePosition.latitude} />
                                )}
                                </>
                            )}

                            <div className="mt-1 hidden sm:block">

                                <div className="mt-3">
                                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                                        Email confirmation:
                                    </label>
                                    <input
                                        type="email"
                                        id="email"
                                        name="email"
                                        placeholder="Optional: Enter email address to confirm vote"
                                        autoCorrect="off"
                                        autoCapitalize="none"
                                        autoComplete="off"
                                        spellCheck="false"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full max-w-[400px] px-3 py-2 border border-gray-300 rounded text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    />
                                    <div className="w-full max-w-[600px] text-[9px] leading-tight sm:text-xs text-gray-800 mt-2 mb-2" dangerouslySetInnerHTML={{ __html: EMAIL_EXPLANATION }} />
                                </div>

                            </div>

                        </div>
                    </div>


                    <div className="mt-0 sm:hidden">

                        <div className="mt-3">
                            <input
                                type="email"
                                id="email"
                                name="email"
                                placeholder="Optional: Enter email to confirm vote"
                                autoCorrect="off"
                                autoCapitalize="none"
                                autoComplete="off"
                                spellCheck="false"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full sm:w-[400px] px-3 py-2 border border-gray-300 rounded text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                            <div className="w-full sm:w-[400px] text-[9px] leading-tight sm:text-xs text-gray-800 mt-2" dangerouslySetInnerHTML={{ __html: EMAIL_EXPLANATION }} />
                        </div>
                    </div>

                    {/* Buttons: Side-by-side, full width combined */}
                    <div className="mt-2 flex justify-end gap-x-3">
                        <Button type="button" onClick={closePanel} variant="default" className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300">
                        Cancel
                        </Button>

                        <Button type="submit" variant="default" className="flex-1 bg-blue-600 text-white px-4 py-4 rounded hover:bg-blue-700 gap-2">
                        <Image src={`${assetPrefix}/icons/check-mark-blue.svg`} alt="" width={30} height={30} className="inline-block bg-blue-600 w-4 h-4"/>
                        Cast vote!
                        </Button>
                    </div>
                    
                </form>
            </div>

        </div>
        )}

        {/*  Organisation info panel */}
        {(organisation !== null) && (
        <div className="fixed bottom-0 left-0 w-full h-1/3 overflow-y-auto bg-white/85 shadow-lg border-t z-50 flex flex-col justify-between px-2 pt-1 pb-2 sm:px-10 sm:pt-0 sm:pb-6">

            <div className="max-w-screen-xl mx-auto h-full flex flex-col justify-between px-0 sm:px-4 pb-4">

                {/* Close button */}
                <button
                onClick={closePanel}
                className="absolute top-1 right-4 text-gray-500 hover:text-gray-700 text-2xl leading-none"
                aria-label="Close vote panel"
                >
                &times;
                </button>

                    {/* Content: Icon + Text */}
                    <div className="flex mt-1 sm:mt-0 sm:w-[800px] mx-auto">

                        <div className="flex-shrink-0 w-20 h-20 sm:w-40 sm:h-40 ml-5 sm:mr-10">
                            <div className="relative inline-block">
                            <img
                                src={`${assetPrefix}/icons/multiple-users-silhouette.svg`}
                                alt="Vote"
                                className="w-20 h-20 sm:w-60 sm:h-60 object-contain"
                            />
                            </div>
                        </div>

                        <div className="ml-4 flex flex-col justify-start mt-0 sm:mt-4">
                            {(organisation.url !== '') ? (
                            <a
                            href={organisation.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 underline text-sm"
                            >
                            <h2 className="text-xl sm:text-[24px] font-semibold mt-0 mb-0">{organisation.name}</h2>
                            </a>
                            ) : (
                            <h2 className="text-xl sm:text-[24px] font-semibold mt-0 mb-0">{organisation.name}</h2>
                            )}

                            <p className="text-xs text-gray-700 mt-2 sm:mt-4">{organisation.description}</p>

                        </div>
                    </div>


            </div>

        </div>
        )}

        <div className="w-full h-full sm:h relative">
            <Toaster position="top-center" containerStyle={{top: 50}}/>

            {/* Vertical toolbar */}
            <div className="absolute left-2 sm:left-4 top-[30%] xl:top-1/2 transform translate-y-[-25%] sm:translate-y-[-50%] z-40">
                <div className="bg-gray-100 rounded-full shadow p-2 sm:p-2 flex flex-col items-center gap-1 sm:gap-2">

                {showToggleContraints && (
                <TooltipProvider>
                    <Tooltip>
                    <TooltipTrigger asChild>
                        <button
                        onClick={toggleLayersVisibility}
                        className="w-8 h-8 sm:w-10 sm:h-10 p-1 bg-white rounded-full shadow hover:bg-gray-100 transition flex items-center justify-center"
                        >
                            {layersVisible ? (
                                <EyeIcon className="w-5 h-5 text-gray-600" />
                            ) : (
                                <EyeSlashIcon className="w-5 h-5 text-gray-400" />
                            )}
                        </button>
                    </TooltipTrigger>
                    <TooltipContent side="right" sideOffset={20} className="font-light text-sm bg-white text-black border shadow px-3 py-1 rounded-md hidden sm:block">
                        {layersVisible ? <div>Hide planning constraints</div> : <div>Show planning constraints</div>}
                    </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
                )}

                <TooltipProvider>
                    <Tooltip>
                    <TooltipTrigger asChild>
                        <button type="button" onClick={(e) => mapZoomIn(e)} className="w-8 h-8 sm:w-10 sm:h-10 bg-white rounded-full active:bg-white focus:outline-none focus:ring-0 hover:bg-gray-100 transition shadow">
                        ➕
                        </button>
                    </TooltipTrigger>
                    <TooltipContent side="right" sideOffset={20} className="font-light text-sm bg-white text-black border shadow px-3 py-1 rounded-md hidden sm:block">
                        Zoom into map
                    </TooltipContent>
                    </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                    <Tooltip>
                    <TooltipTrigger asChild>
                        <button onClick={mapZoomOut} className="w-8 h-8 sm:w-10 sm:h-10 bg-white rounded-full hover:bg-gray-100 transition shadow">
                        ➖
                        </button>
                    </TooltipTrigger>
                    <TooltipContent side="right" sideOffset={20} className="font-light text-sm bg-white text-black border shadow px-3 py-1 rounded-md hidden sm:block">
                        Zoom out of map
                    </TooltipContent>
                    </Tooltip>
                </TooltipProvider>

                {turbineAdded ? (
                <TooltipProvider>
                    <Tooltip>
                    <TooltipTrigger asChild>
                        <button onClick={mapCentreOnTurbine} className="w-8 h-8 sm:w-10 sm:h-10 bg-white rounded-full flex items-center justify-center">
                        <img
                            alt="Wind turbine"
                            src={`${assetPrefix}/icons/windturbine_black.png`}
                            className="block w-5 h-6"
                        />
                        </button>
                    </TooltipTrigger>
                    <TooltipContent side="right" sideOffset={20} className="font-light text-sm bg-white text-black border shadow px-3 py-1 rounded-md hidden sm:block">
                        Centre map on selected turbine position
                    </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
                ) : null}
            </div>
            </div>
  
            {!turbineAdded && showInfo && (organisation === null) && (
            <div className="absolute bottom-24 sm:bottom-12 inset-x-0 flex justify-center px-4 z-30">
                <div
                    className="
                    inline-flex items-center
                    bg-blue-600 text-white
                    py-2 px-4 rounded-3xl
                    shadow-[0_-4px_12px_rgba(255,255,255,0.2)]
                    "
                >
                    <p className="text-sm sm:text-base font-light animate-fade-loop mr-4">
                    Click on map to place <b className="font-bold">your wind turbine</b>
                    </p>
                    <button
                    onClick={() => setShowInfo(false)}
                    className="text-white text-sm hover:text-gray-300"
                    aria-label="Dismiss"
                    >
                    ×
                    </button>
                </div>
            </div>
            )}

            {/* Location search autosuggestion input box */}
            <div className="absolute top-16 left-0 right-0 px-4 sm:px-0 z-40 pointer-events-none ">
                <div className="relative w-full sm:w-md max-w-md mx-auto">
                    <div className="rounded-full shadow bg-white border border-gray-300 p-1 z-60 pointer-events-auto">
                        <AutocompleteInput
                            ref={inputRef}
                            query={query} setQuery={setQuery}
                            locating={locating} setLocating={setLocating} 
                            useLocate={true}
                            centralInput={true}
                            submitOnSuggestionSelect={true}
                            placeholder="Postcode or location"
                        />
                    </div>

                    {(layersVisible && showToggleContraints) && ( 
                    <TooltipProvider>
                        <Tooltip>
                        <TooltipTrigger asChild>
                            <div className="w-full sm:w-1/2 mx-auto mt-2 sm:mt-4 px-0 py-0">
                                <div className="bg-white/70 rounded-full px-4 py-2 pointer-events-auto">
                                    <PercentageSlider initial={opacity2slider(layersOpacityValue)} onChange={onOpacitySliderChange} />
                                </div>
                            </div>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" sideOffset={10} className="font-light text-sm bg-white text-black border shadow px-3 py-1 rounded-md hidden sm:block">
                            Change opacity of planning constraints layers
                        </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                    )}

                </div>
            </div>

            {/* Main map */}
            <Map
                ref={mapRef}
                mapLib={maplibregl}
                dragRotate={false}
                touchRotate={false}
                pitchWithRotate={false}
                touchZoomRotate={true}
                initialViewState={initialViewState}
                onLoad={onLoad}
                onMoveEnd={onMoveEnd}
                onIdle={onIdle}
                onZoom={onZoom}
                onClick={onClick}
                style={{ width: '100%', height: '100%' }}
                interactiveLayerIds={[
                    'water', 
                    'osm-substations-circle',
                    'votes-unconfirmed', 'votes-confirmed', 
                    'votes-unconfirmed-single', 'votes-confirmed-single', 
                    'votes-unconfirmed-multiple', 'votes-confirmed-multiple',
                    'organisations-default',
                    ...LAYERS_ALLCONSTRAINTS ]}
                attributionControl={true}
                onMouseMove={onMouseMove}
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

                {(turbineAdded && displayTurbine) ? (
                <Marker onDragStart={onTurbineMarkerDragStart} onDragEnd={onTurbineMarkerDragEnd} longitude={turbinePosition.longitude} latitude={turbinePosition.latitude} draggable={true} anchor="bottom" offset={[0, 0]}>
                    <img ref={markerRef} className={`${isBouncing ? 'bounce' : ''}`} alt="Wind turbine" width="80" height="80" src={`${assetPrefix}/icons/windturbine_blue.png`} />
                </Marker>
                ) : null}

                {popupInfo && (
                <Popup
                    longitude={popupInfo.lngLat.lng}
                    latitude={popupInfo.lngLat.lat}
                    closeButton={false}
                    closeOnClick={false}
                    anchor="bottom"
                    offset={10}
                      className="no-padding-popup px-0 py-0"

                >
                    <div className="text-sm font-medium px-0 py-0 pb-0 leading-normal">
                        <h1 className="font-extrabold text-medium w-full text-center px-0 py-0">{popupInfo.properties.heading}</h1>
                        {(Array.isArray(popupInfo.properties.content)) 
                        ? 
                            (popupInfo.properties.content).map((item, index) => (
                            <p key={index} className="text-[9pt] pt-0 pb-0">{item}</p>
                            )
                        ) 
                        :   <p className="text-[9pt] pt-0 pb-0">{popupInfo.properties.content}</p>
                        }
                    </div>
                </Popup>
                )}

            </Map>

        {/* Cesium viewer */}
        {(turbinePosition !== null) && (
        <CesiumModal longitude={turbinePosition.longitude} latitude={turbinePosition.latitude} isOpen={showCesiumViewer} onClose={()=>setShowCesiumViewer(false)} />
        )}

        </div>
    </main>

  );
}
