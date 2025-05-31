import sys
import logging
import ijson
import json
import csv
import requests
import subprocess
import os
import time
import urllib.request
import shutil
import pyproj
from decimal import Decimal
from datetime import datetime
from dotenv import load_dotenv
from pathlib import Path
from zipfile import ZipFile
from os import listdir, makedirs
from os.path import isfile, isdir, basename, join, exists

if __name__ == '__main__':
    import sys
    import django
    parent_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), os.path.pardir))
    sys.path.append(parent_dir)
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "votewind.settings")
    django.setup()

from django.contrib.gis.db.models.functions import Area
from django.contrib.gis.gdal import DataSource
from django.contrib.gis.utils import LayerMapping
from django.contrib.gis.geos import GEOSException, Polygon, GEOSGeometry, Point, fromstr

from engine.models import \
    Postcode, \
    Place, \
    Boundary, \
    WindSpeed

WORKING_FOLDER = str(Path(__file__).absolute().parent) + '/'
LOG_SINGLE_PASS                     = WORKING_FOLDER + 'log.txt'
OVERALL_CLIPPING                    = WORKING_FOLDER + 'overall-clipping.gpkg'
OSM_DOWNLOADS_FOLDER                = WORKING_FOLDER + 'osm-downloads/'
OSM_MAIN_DOWNLOAD                   = 'https://download.geofabrik.de/europe/united-kingdom-latest.osm.pbf'
OSM_EXPORTS                         = WORKING_FOLDER + 'osm-exports/'
OSM_EXPORT_CONFIG_BOUNDARIES        = 'osm-boundaries'
OSM_EXPORT_CONFIG_PLACES            = 'osm-places'
OSM_EXPORT_BOUNDARIES               = OSM_EXPORTS + OSM_EXPORT_CONFIG_BOUNDARIES
OSM_EXPORT_PLACES                   = OSM_EXPORTS + OSM_EXPORT_CONFIG_PLACES
POSTCODES_DOWNLOAD_FOLDER           = WORKING_FOLDER + 'postcodes/'
POSTCODES_URL                       = 'https://www.arcgis.com/sharing/rest/content/items/6fb8941d58e54d949f521c92dfb92f2a/data'
POSTCODES_SINGLEFILE                = 'Data/ONSPD_FEB_2025_UK.csv'
TRANSFORMER_FROM_29903              = None
TRANSFORMER_FROM_27700              = None
TRANSFORMER_SOURCE_4326             = None
TRANSFORMER_DEST_27700              = None
TRANSFORMER_TO_27700                = None
WINDSPEED_URL                       = 'https://openwindenergy.s3.us-east-1.amazonaws.com/windspeeds-noabl--uk.geojson.zip'

# ***********************************************************
# ***************** General helper functions ****************
# ***********************************************************

def decimal_default(obj):
    if isinstance(obj, Decimal):
        return float(obj)
    raise TypeError

def initLogging():
    """
    Initialises logging
    """

    class PaddedProcessFormatter(logging.Formatter):
        def format(self, record):
            # Pad process ID to 4 digits with leading zeros
            record.process_padded = f"PID:{record.process:08d}"
            return super().format(record)

    log_format = '%(asctime)s,%(msecs)03d [%(process_padded)s] [%(levelname)-2s] %(message)s'
    formatter = PaddedProcessFormatter(log_format, "%Y-%m-%d %H:%M:%S")
    handler_1 = logging.StreamHandler()
    handler_2 = logging.FileHandler(LOG_SINGLE_PASS)
    handler_3 = logging.FileHandler("{0}/{1}.log".format(WORKING_FOLDER, datetime.today().strftime('%Y-%m-%d')))

    handler_1.setFormatter(formatter)
    handler_2.setFormatter(formatter)
    handler_3.setFormatter(formatter)

    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s [%(process_padded)s] [%(levelname)-2s] %(message)s',
        handlers=[handler_1, handler_2, handler_3]
    )

def getJSON(json_path):
    """
    Gets contents of JSON file
    """

    with open(json_path, "r") as json_file: return json.load(json_file)

def makeFolder(folderpath):
    """
    Make folder if it doesn't already exist
    """

    if folderpath.endswith(os.path.sep): folderpath = folderpath[:-1]
    if not isdir(folderpath): makedirs(folderpath)

def getFilesInFolder(folderpath):
    """
    Get list of all files in folder
    Create folder if it doesn't exist
    """

    makeFolder(folderpath)
    files = [f for f in listdir(folderpath) if ((f != '.DS_Store') and (isfile(join(folderpath, f))))]
    if files is not None: files.sort()
    return files

def LogMessage(logtext):
    """
    Logs message to console with timestamp
    """

    logger = logging.getLogger()
    logging.info(logtext)

def LogWarning(logtext):
    """
    Logs warning message to console with timestamp
    """

    logger = logging.getLogger()
    logging.warning(logtext)

def LogError(logtext):
    """
    Logs error message to console with timestamp
    """

    logger = logging.getLogger()
    logging.error("*** ERROR *** " + logtext)

def LogFatalError(logtext):
    """
    Logs error message to console with timestamp and aborts
    """

    LogError(logtext)
    exit()

def attemptDownloadUntilSuccess(url, file_path):
    """
    Keeps attempting download until successful
    """

    while True:
        try:
            urllib.request.urlretrieve(url, file_path)
            return
        except Exception as e:
            LogWarning("Attempt to retrieve " + url + " failed so retrying")
            time.sleep(5)

def runSubprocess(subprocess_array):
    """
    Runs subprocess
    """

    output = subprocess.run(subprocess_array)

    if output.returncode != 0: LogFatalError("subprocess.run failed with error code: " + str(output.returncode) + '\n' + " ".join(subprocess_array))
    return " ".join(subprocess_array)

def ingrs_to_lnglat(easting, northing):
    """
    Transforms Ireland NG to lng, lat
    """

    global TRANSFORMER_FROM_29903

    if TRANSFORMER_FROM_29903 is None: TRANSFORMER_FROM_29903 = pyproj.Transformer.from_crs("EPSG:29903", "EPSG:4326")

    lat, lng = TRANSFORMER_FROM_29903.transform(easting, northing)

    return lng, lat

def bngrs_to_lnglat(easting, northing):
    """
    Transforms British NG to lng, lat
    """

    global TRANSFORMER_FROM_27700

    if TRANSFORMER_FROM_27700 is None: TRANSFORMER_FROM_27700 = pyproj.Transformer.from_crs("EPSG:27700", "EPSG:4326")

    lat, lng = TRANSFORMER_FROM_27700.transform(easting, northing)

    return lng, lat

def lnglat_to_bngrs(longitude, latitude):
    """
    Transforms lng, lat to British NG
    """

    global TRANSFORMER_SOURCE_4326, TRANSFORMER_DEST_27700, TRANSFORMER_TO_27700

    if TRANSFORMER_SOURCE_4326 is None:
        TRANSFORMER_SOURCE_4326 = crs_source = pyproj.CRS("EPSG:4326")  # WGS84 (longitude/latitude)
        TRANSFORMER_DEST_27700 = crs_destination = pyproj.CRS("EPSG:27700")  # British National Grid
        TRANSFORMER_TO_27700 = pyproj.Transformer.from_crs(TRANSFORMER_SOURCE_4326, TRANSFORMER_DEST_27700, always_xy=True)

    easting, northing = TRANSFORMER_TO_27700.transform(longitude, latitude)

    return easting, northing

def getContainingCounty(point):
    """
    Get name of largest county containing point
    """

    county = Boundary.objects.annotate(area=Area('geometry')).filter(type='nonadministrative').filter(geometry__intersects=point).order_by('-area').first()
    if county is None: 
        county = Boundary.objects.annotate(area=Area('geometry')).filter(type='administrative').filter(level='6').filter(geometry__intersects=point).order_by('-area').first()
        if county is None:
            county = Boundary.objects.annotate(area=Area('geometry')).filter(type='administrative').filter(level='5').filter(geometry__intersects=point).order_by('-area').first()
            if county is None:
                return ''

    return county.name

def downloadWindSpeeds():
    """
    Download wind speed data
    """

    global WINDSPEED_URL, WORKING_FOLDER

    windspeed_download_zip_path = basename(WINDSPEED_URL)
    windspeed_download_unzip_path = WORKING_FOLDER + windspeed_download_zip_path.replace('.zip', '')
    windspeed_dataset_path = windspeed_download_unzip_path

    if not isfile(windspeed_dataset_path):

        LogMessage("Downloading NOABL wind speed data...")

        attemptDownloadUntilSuccess(WINDSPEED_URL, windspeed_download_zip_path)

        with ZipFile(windspeed_download_zip_path, 'r') as zip_ref: zip_ref.extractall(WORKING_FOLDER)
        os.remove(windspeed_download_zip_path)

    return windspeed_dataset_path

# ***********************************************************
# ***********************************************************
# ********************* MAIN APPLICATION ********************
# ***********************************************************
# ***********************************************************

def main():
    """
    Main application
    """

    global WORKING_FOLDER, OSM_DOWNLOADS_FOLDER, OSM_MAIN_DOWNLOAD, POSTCODES_SINGLEFILE, POSTCODES_DOWNLOAD_FOLDER, POSTCODES_URL
    global OVERALL_CLIPPING, OSM_EXPORT_CONFIG_BOUNDARIES, OSM_EXPORT_CONFIG_PLACES, OSM_EXPORT_BOUNDARIES, OSM_EXPORT_PLACES

    makeFolder(OSM_DOWNLOADS_FOLDER)
    makeFolder(OSM_EXPORTS)
    makeFolder(POSTCODES_DOWNLOAD_FOLDER)

    osm_download            = OSM_DOWNLOADS_FOLDER + basename(OSM_MAIN_DOWNLOAD)
    osm_boundaries          = OSM_EXPORT_BOUNDARIES + '.shp'
    osm_places              = OSM_EXPORT_PLACES + '.shp'

    # For testing - delete all existing objects
    # Postcode.objects.all().delete()
    # Place.objects.all().delete()
    # Boundary.objects.all().delete()

    if not isfile(osm_download):
        LogMessage("Downloading: " + basename(OSM_MAIN_DOWNLOAD))
        attemptDownloadUntilSuccess(OSM_MAIN_DOWNLOAD, osm_download)

    temp_gpkg = 'temp'
    if not isfile(osm_boundaries):
        LogMessage("Running osm-export-tool on: " + OSM_EXPORT_BOUNDARIES + '.yml')
        runSubprocess(['osm-export-tool', OSM_DOWNLOADS_FOLDER + basename(OSM_MAIN_DOWNLOAD), temp_gpkg, "-m", WORKING_FOLDER + OSM_EXPORT_CONFIG_BOUNDARIES + '.yml'])

        LogMessage("Converting osm-boundaries to SHP")
        runSubprocess([ 'ogr2ogr', \
                        "-f", "ESRI Shapefile", \
                        osm_boundaries, \
                        temp_gpkg + '.gpkg', \
                        '-nln', 'osm_boundaries', \
                        '-lco', 'ENCODING=UTF-8', \
                        "-sql", "SELECT name, council_name council, admin_level level, boundary type, geom geometry FROM 'osm-boundaries' WHERE GeometryType(geom) IN ('POLYGON', 'MULTIPOLYGON')", \
                        "-nlt", "MULTIPOLYGON" ])

    if isfile(temp_gpkg): os.remove(temp_gpkg + '.gpkg')

    boundaries = Boundary.objects.all()
    if boundaries.count() == 0:
        LogMessage("Importing osm-boundaries SHP into Django")
        boundary_mapping = {
            'name:en': 'name',
            'council_name': 'council',
            'type': 'type',
            'level': 'level',
            'geometry': 'geometry',
        }

        lm = LayerMapping(
            Boundary,
            osm_boundaries,
            boundary_mapping,
            transform=True,
            encoding='utf-8',
        )
        
        lm.save(strict=True, verbose=False)

        Boundary.objects.filter(type='historic').update(type="nonadministrative")
        Boundary.objects.filter(type='ceremonial').update(type="nonadministrative")

        LogMessage("Finished importing osm-boundaries SHP into Django")

    if not isfile(osm_places):
        LogMessage("Running osm-export-tool on: " + OSM_EXPORT_PLACES + '.yml')
        runSubprocess(['osm-export-tool', OSM_DOWNLOADS_FOLDER + basename(OSM_MAIN_DOWNLOAD), temp_gpkg, "-m", WORKING_FOLDER + OSM_EXPORT_CONFIG_PLACES + '.yml'])

        LogMessage("Converting osm-places to SHP")
        runSubprocess([ 'ogr2ogr', \
                        "-f", "ESRI Shapefile", \
                        osm_places, \
                        temp_gpkg + '.gpkg', \
                        '-nln', 'osm_places', \
                        '-lco', 'ENCODING=UTF-8', \
                        "-sql", "SELECT name, geom geometry FROM 'osm-places' WHERE GeometryType(geom) IN ('POINT')", \
                        "-nlt", "POINT" ])
        
    if isfile(temp_gpkg): os.remove(temp_gpkg + '.gpkg')

    places = Place.objects.all()
    if places.count() == 0:
        LogMessage("Importing places into Django")

        ds = DataSource(osm_places)
        layer = ds[0]

        for feature in layer:
            name = feature.get("name:en")
            county = getContainingCounty(feature.geom.geos)
            if county == '':
                LogMessage("Missing county for: " + name)
            if (name is not None) and (county != ''):
                Place.objects.create(
                    name=feature.get("name:en"),
                    county = county,
                    geometry=feature.geom.geos
                )
            
        LogMessage("Finished importing places into Django")

    places = Place.objects.all()
    if places[0].boundary == '':

        LogMessage("Attaching places to similarly named boundaries, eg. Brighton [place] -> Brighton & Hove [boundary]")

        count = 0
        for place in places:
            if count % 1000 == 0: LogMessage("Processing place: " + str(count) + "/" + str(len(places)))
            if (place.name is None) or (place.name == ''): continue
            boundary = Boundary.objects.annotate(area=Area('geometry')).filter(geometry__intersects=place.geometry).order_by('area').first()
            if boundary is not None:
                place.boundary = boundary
                place.save()
            count += 1

    postcode_files = getFilesInFolder(POSTCODES_DOWNLOAD_FOLDER)
    if len(postcode_files) == 0:
        LogMessage("Downloading postcodes from: " + POSTCODES_URL)
        zip_file = 'temp.zip'
        attemptDownloadUntilSuccess(POSTCODES_URL, zip_file)
        with ZipFile(zip_file, 'r') as zip_ref: zip_ref.extract(POSTCODES_SINGLEFILE, path=POSTCODES_DOWNLOAD_FOLDER)
        os.remove(zip_file)
        shutil.move(POSTCODES_DOWNLOAD_FOLDER + POSTCODES_SINGLEFILE, POSTCODES_DOWNLOAD_FOLDER + basename(POSTCODES_SINGLEFILE))


    # Only import postcodes if postcode table is empty
    postcodes_incomplete = []
    postcodes = Postcode.objects.all()
    if postcodes.count() == 0:

        LogMessage("Importing postcodes into Django")

        postcodes_download = POSTCODES_DOWNLOAD_FOLDER + basename(POSTCODES_SINGLEFILE)
        with open(postcodes_download, 'r', newline='', encoding="utf-8") as csvfile:
            reader = csv.DictReader(csvfile)
            count = 0
            for row in reader: 
                if count % 10000 == 0: LogMessage("Importing postcode: " + str(count))
                postcode_text, lat, lng, easting, northing = row['pcd'], row['lat'].strip(), row['long'].strip(), row['oseast1m'].strip(), row['osnrth1m'].strip()
                postcode_text = postcode_text.replace(' ', '').upper()
                postcode_inward = postcode_text[0:-3]
                postcode_outward = postcode_text[-3:]
                postcode_text = postcode_inward + ' ' + postcode_outward
                if easting == '':
                    # LogMessage("Missing position: " + postcode_text)
                    postcodes_incomplete.append(postcode_text)
                else:
                    postcode = Postcode(name=postcode_text, search=(postcode_text.replace(' ', '')), geometry=Point(float(lng), float(lat)))
                    postcode.save()
                count += 1

        LogMessage("Number of postcodes missing positions: " + str(len(postcodes_incomplete)))

    number_imported = 0
    windspeeds = WindSpeed.objects.all()
    if windspeeds.count() == 0:

        windspeeds_path = downloadWindSpeeds()

        with open(windspeeds_path, 'rb') as f:
            parser = ijson.items(f, 'features.item')  # Streams each feature one at a time
            count = 0

            for feature in parser:
                windspeed = feature['properties'].get('windspeed')
                geometry = GEOSGeometry(json.dumps(feature['geometry'], default=decimal_default), srid=4326)
                WindSpeed.objects.create(windspeed=windspeed, geometry=geometry)
                count += 1
                if count % 1000 == 0: LogMessage("Importing wind speed " + str(count))

        LogMessage("Number of windspeed items imported: " + str(count))

# Only remove log file on main thread
if __name__ == "__main__":
    if isfile(LOG_SINGLE_PASS): os.remove(LOG_SINGLE_PASS)

# Always initialise logging so multiprocessing threads get logged
initLogging()

if __name__ == "__main__": main()