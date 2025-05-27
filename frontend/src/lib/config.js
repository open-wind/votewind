// Configuration values

const isDev = process.env.NODE_ENV === 'development';

export const API_BASE_URL = isDev
  ? 'http://localhost:8000'
  : 'https://api.votewind.org';


export const MAP_DEFAULT_CENTRE = 
{
  'latitude': 55.281960919035086,
  'longitude': -3.429071942460162,
}

export const MAP_DEFAULT_BOUNDS = 
{
  'top': 61.59071211434002,
  'left': -12.456802770948485,
  'bottom': 48.921496099104246,
  'right': 3.5121541807384062
}

export const MAP_DEFAULT_ZOOM = 5;

export const MAP_PLACE_ZOOM = 12;

export const VOTEWIND_COOKIE = 'votewind-voting-cookie';

export const VOTEWIND_MAPSTYLE = 'https://tiles.wewantwind.org/styles/openmaptiles/style.json';

// export const VOTEWIND_MAPSTYLE = 'https://tiles.wewantwind.org/styles/openwind/style.json';