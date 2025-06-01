// Configuration values

const isDev = process.env.NODE_ENV === 'development';

// Base url of main app
export const APP_BASE_URL = isDev
  ? 'http://localhost:3000'
  : 'https://votewind.org';

// Base url of api server
export const API_BASE_URL = isDev
  ? 'http://localhost:8000'
  : 'https://api.votewind.org';

// Base url of tile server
// export const TILESERVER_BASEURL = isDev ? "http://localhost:8080" : "https://tiles.openwind.energy";
export const TILESERVER_BASEURL = isDev ? "https://tiles.openwind.energy" : "https://tiles.openwind.energy";

// Default map centre to use
export const MAP_DEFAULT_CENTRE = 
{
  'latitude': 55.281960919035086,
  'longitude': -3.429071942460162,
}

// Default map bounds to use
export const MAP_DEFAULT_BOUNDS = 
{
  'top': 61.59071211434002,
  'left': -12.456802770948485,
  'bottom': 48.921496099104246,
  'right': 3.5121541807384062
}

// Default map zoom to use - if not place-specific
export const MAP_DEFAULT_ZOOM = 5;

// Default map zoom to use - if place-specific
export const MAP_PLACE_ZOOM = 12;

// Name of cookie that will be set
export const VOTEWIND_COOKIE = 'votewind-voting-cookie';

// url of map style
export const VOTEWIND_MAPSTYLE = 'https://tiles.wewantwind.org/styles/openmaptiles/style.json';

// Email explanation beneath all email input boxes
export const EMAIL_EXPLANATION = '<b>Votes confirmed by email are highlighted on VoteWind.org map</b>. <span className="font-light">We will never publish your email address and will only use your email to contact you about relevant community wind events / resources.</span>';
