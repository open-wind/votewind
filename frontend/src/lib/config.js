// Configuration values

const isDev = process.env.NODE_ENV === 'development';

// Base url of main app
export const APP_BASE_URL = isDev
  ? 'http://localhost:3000'
  : 'https://votewind.org';

// Base url of api server
export const API_BASE_URL = isDev
  ? 'http://localhost:8000'
  : 'https://votewind.org';

// Base url of tile server
export const TILESERVER_BASEURL = isDev ? "http://localhost:8080" : "https://tiles.votewind.org";
// export const TILESERVER_BASEURL = isDev ? "https://tiles.votewind.org" : "https://tiles.votewind.org";

// // Base url of main app
// export const APP_BASE_URL = isDev
//   ? 'http://10.0.2.2:3000'
//   : 'https://votewind.org';

// // Base url of api server
// export const API_BASE_URL = isDev
//   ? 'http://10.0.2.2:8000'
//   : 'https://votewind.org';

// // Base url of tile server
// export const TILESERVER_BASEURL = isDev ? "http://10.0.2.2:8080" : "https://tiles.votewind.org";
// // export const TILESERVER_BASEURL = isDev ? "https://tiles.votewind.org" : "https://tiles.votewind.org";

// // Base url of main app
// export const APP_BASE_URL = isDev
//   ? 'http://bs-local.com:3000'
//   : 'https://votewind.org';

// // Base url of api server
// export const API_BASE_URL = isDev
//   ? 'http://bs-local.com:8000'
//   : 'https://votewind.org';

// // Base url of tile server
// export const TILESERVER_BASEURL = isDev ? "http://bs-local.com:8080" : "https://tiles.votewind.org";
// // export const TILESERVER_BASEURL = isDev ? "https://tiles.votewind.org" : "https://tiles.votewind.org";

// Base url of content server
export const CONTENT_BASE_URL = isDev
  ? 'https://content.votewind.org'
  : 'https://content.votewind.org';

// url of VoteWind mobile phone app download
export const MOBILEAPP_URL = isDev
  ? 'https://play.google.com/apps/testing/org.votewind.viewer'
  : 'https://play.google.com/apps/testing/org.votewind.viewer';

// Default map centre to use
export const MAP_DEFAULT_CENTRE = 
{
  'latitude': 55.281960919035086,
  'longitude': -4.29071942460162,
}

// Default map bounds to use
export const MAP_DEFAULT_BOUNDS = 
{
  'top': 61.59071211434002,
  'left': -12.456802770948485,
  'bottom': 48.921496099104246,
  'right': 3.5121541807384062
}

// Absolute maxbounds (Northern Europe) to enforce
export const MAP_MAXBOUNDS = 
[
    [-37.409477, 39.218822],
    [31.804390, 65.083342]
]

// longitude, latitude and zoom to use for 'overview map'
export const MAP_OVERVIEW_PARAMETERS = {
  'longitude': -4.25352,
  'latitude': 56.76272,
  'zoom': 4.30
}

// Default map zoom to use - if not place-specific
export const MAP_DEFAULT_ZOOM = 5;

// Default map zoom to use - if place-specific
export const MAP_PLACE_ZOOM = 12;

// Map zoom to use when focusing on substations
export const MAP_SUBSTATION_ZOOM = 13;

// Min zoom for showing planning constraints
export const MAP_MINZOOM_CONSTRAINTS = 8;

// Name of cookie that will be set
export const VOTEWIND_COOKIE = 'votewind-voting-cookie';

// url of map style used as default when showing votes
export const VOTEWIND_MAPSTYLE = 'https://tiles.votewind.org/styles/openmaptiles/style.json';

// Email explanation beneath all email input boxes
export const EMAIL_EXPLANATION = '<b>Votes confirmed by email are highlighted on VoteWind.org map</b>. <span className="font-light">We will never publish your email address and will only use your email to contact you about relevant community wind events / resources.</span>';

// List of technical planning constraints layers to be used
export const LAYERS_TECHNICAL_CONSTRAINTS =   [
                                              'latest--other-technical-constraints--100',
                                              'latest--other-technical-constraints--150',
                                              'latest--other-technical-constraints--200'
                                              ];

// List of non-technical planning constraints layers to be used
export const LAYERS_NONTECHNICAL_CONSTRAINTS =    [
                                                  'latest--aviation-and-exclusion-areas',
                                                  'latest--ecology-and-wildlife',
                                                  'latest--heritage-impacts',
                                                  'latest--inadequate-wind-speeds',
                                                  'latest--landscape-and-visual-impacts',
                                                  'latest--residential-buildings'
                                                  ];

// Full list of all technical and non-technical planning constraints layers to be used
export const LAYERS_ALLCONSTRAINTS = [...LAYERS_NONTECHNICAL_CONSTRAINTS, ...LAYERS_TECHNICAL_CONSTRAINTS];

// List of turbine-height-to-tip-specific layers
export const LAYERS_HEIGHTTOTIP_SPECIFIC =  [
                                            'latest--windconstraints',
                                            'latest--other-technical-constraints',
                                            'latest--inland-waters',
                                            'latest--pipelines',
                                            'latest--power-lines',
                                            'latest--public-footpaths',
                                            'latest--public-roads-a-b-motorways',
                                            'latest--railway-lines'
                                            ];

// Color for all planning constraints layers
export const LAYERS_COLOR = 'blue';

// Default opacity for all planning constraints layers 
// Note that with technical constraints layers, opacity is programmatically reduced by a factor as they all overlap at minimum buffer sizes
// export const LAYERS_OPACITY = 0.065;
export const LAYERS_OPACITY = 0.05;

// Default turbine height-to-tip used when displaying detailed planning constraints
export const TURBINE_HEIGHTTOTIP_DEFAULT = 100;

// Default AR hubheight
// Based on openwind's own manual data on all large (>=75 m to tip-height) failed and successful UK onshore wind projects
export const TURBINE_AR_DEFAULT_HUBHEIGHT = 124.2;

// Default AR bladeradius
// Based on openwind's own manual data on all large (>=75 m to tip-height) failed and successful UK onshore wind projects
export const TURBINE_AR_DEFAULT_BLADERADIUS = 47.8;

