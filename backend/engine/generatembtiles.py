# ***********************************************************
# ************************* VOTEWIND ************************
# ***********************************************************
# ************* Script to build VoteWind basemap ************
# ***********************************************************
# ***********************************************************
# v1.0

# ***********************************************************
#
# MIT License
#
# Copyright (c) Stefan Haselwimmer, OpenWind.energy, 2025
#
# Permission is hereby granted, free of charge, to any person obtaining a copy
# of this software and associated documentation files (the "Software"), to deal
# in the Software without restriction, including without limitation the rights
# to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
# copies of the Software, and to permit persons to whom the Software is
# furnished to do so, subject to the following conditions:
#
# The above copyright notice and this permission notice shall be included in all
# copies or substantial portions of the Software.
#
# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
# IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
# FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
# AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
# LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
# OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
# SOFTWARE.


import sys
import logging
import json
import requests
import os
import urllib.request
import subprocess
import shutil
import yaml
import sqlite3
import psycopg2
import time
import math
import multiprocessing
from multiprocessing import Pool, Value
from datetime import datetime
from requests import Request
from pathlib import Path
from psycopg2 import sql
from psycopg2.extensions import AsIs
from zipfile import ZipFile
from os import listdir, makedirs
from os.path import isfile, isdir, basename, join, exists
from dotenv import load_dotenv

WORKING_FOLDER = str(Path(__file__).absolute().parent) + '/'
OSM_MAIN_DOWNLOAD                   = 'https://download.geofabrik.de/europe/united-kingdom-latest.osm.pbf'
OSM_DOWNLOADS_FOLDER                = join(WORKING_FOLDER, 'osm-downloads')
TILESERVER_SRC_FOLDER               = join(WORKING_FOLDER, 'tileserver')
TILEMAKER_DOWNLOAD_SCRIPT           = join(TILESERVER_SRC_FOLDER, 'get-coastline-landcover.sh')
TILEMAKER_COASTLINE_PROCESS         = join(TILESERVER_SRC_FOLDER, 'process-coastline.lua')
TILEMAKER_COASTLINE_CONFIG          = join(TILESERVER_SRC_FOLDER, 'config-coastline.json')
TILEMAKER_COASTLINE_PROCESS         = join(TILESERVER_SRC_FOLDER, 'process-coastline.lua')
TILEMAKER_OMT_CONFIG                = join(TILESERVER_SRC_FOLDER, 'config-openmaptiles.json')
TILEMAKER_OMT_PROCESS               = join(TILESERVER_SRC_FOLDER, 'process-openmaptiles.lua')
TILESERVER_FOLDER                   = join(WORKING_FOLDER, '..', '..', 'tileserver')
TILESERVER_DATA_FOLDER              = join(TILESERVER_FOLDER, 'data')

# ***********************************************************
# ***************** General helper functions ****************
# ***********************************************************

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
    handler_2 = logging.FileHandler("{0}/{1}.log".format(WORKING_FOLDER, datetime.today().strftime('%Y-%m-%d')))

    handler_1.setFormatter(formatter)
    handler_2.setFormatter(formatter)

    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s [%(process_padded)s] [%(levelname)-2s] %(message)s',
        handlers=[handler_1, handler_2]
    )

def LogMessage(logtext):
    """
    Logs message to console with timestamp
    """

    logger = multiprocessing.get_logger()
    logging.info(logtext)

def LogWarning(logtext):
    """
    Logs warning message to console with timestamp
    """

    logger = multiprocessing.get_logger()
    logging.warning(logtext)

def LogError(logtext):
    """
    Logs error message to console with timestamp
    """

    logger = multiprocessing.get_logger()
    logging.error("*** ERROR *** " + logtext)

def LogFatalError(logtext):
    """
    Logs error message to console with timestamp and aborts
    """

    LogError(logtext)
    exit()

def runSubprocess(subprocess_array):
    """
    Runs subprocess
    """

    output = subprocess.run(subprocess_array)

    if output.returncode != 0: LogFatalError("subprocess.run failed with error code: " + str(output.returncode) + '\n' + " ".join(subprocess_array))
    return " ".join(subprocess_array)

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

def osmDownloadData():
    """
    Downloads core OSM data
    """

    global  OSM_MAIN_DOWNLOAD, OSM_DOWNLOADS_FOLDER, TILEMAKER_DOWNLOAD_SCRIPT, TILEMAKER_COASTLINE_CONFIG

    makeFolder(OSM_DOWNLOADS_FOLDER)

    osm_download = join(OSM_DOWNLOADS_FOLDER, basename(OSM_MAIN_DOWNLOAD))

    if not isfile(osm_download):

        LogMessage("Downloading latest OSM data")

        # Download to temp file in case download interrupted for any reason, eg. user clicks 'Stop processing'

        download_temp = join(OSM_DOWNLOADS_FOLDER, 'temp.pbf')
        if isfile(download_temp): os.remove(download_temp)

        runSubprocess(["wget", OSM_MAIN_DOWNLOAD, "-O", download_temp])

        shutil.copy(download_temp, osm_download)
        if isfile(download_temp): os.remove(download_temp)

    LogMessage("Checking all files required for OSM tilemaker...")

    shp_extensions = ['shp', 'shx', 'dbf', 'prj']
    tilemaker_config_json = getJSON(TILEMAKER_COASTLINE_CONFIG)
    tilemaker_config_layers = list(tilemaker_config_json['layers'].keys())

    all_tilemaker_layers_downloaded = True
    for layer in tilemaker_config_layers:
        layer_elements = tilemaker_config_json['layers'][layer]
        if 'source' in layer_elements:
            for shp_extension in shp_extensions:
                source_file = layer_elements['source'].replace('.shp', '.' + shp_extension)
                if not isfile(source_file):
                    LogMessage("Missing file for OSM tilemaker: " + source_file)
                    all_tilemaker_layers_downloaded = False

    if all_tilemaker_layers_downloaded:
        LogMessage("All files downloaded for OSM tilemaker")
    else:
        LogMessage("Downloading global water and coastline data for OSM tilemaker")
        runSubprocess([TILEMAKER_DOWNLOAD_SCRIPT])

# ***********************************************************
# ***********************************************************
# ********************* MAIN APPLICATION ********************
# ***********************************************************
# ***********************************************************

def main():
    """
    Runs main script
    """

    global TILESERVER_FOLDER, TILESERVER_DATA_FOLDER
    global OSM_DOWNLOADS_FOLDER, OSM_MAIN_DOWNLOAD, TILEMAKER_COASTLINE_PROCESS, TILEMAKER_COASTLINE_CONFIG, TILEMAKER_OMT_PROCESS, TILEMAKER_OMT_CONFIG

    initLogging()

    bbox_entireworld = "-180,-85,180,85"
    bbox_unitedkingdom_padded = "-49.262695,38.548165,39.990234,64.848937"

    makeFolder(TILESERVER_FOLDER)
    makeFolder(TILESERVER_DATA_FOLDER)

    osm_download = join(OSM_DOWNLOADS_FOLDER, basename(OSM_MAIN_DOWNLOAD))
    basemap_mbtiles = join(TILESERVER_DATA_FOLDER, basename(OSM_MAIN_DOWNLOAD).replace(".osm.pbf", ".mbtiles"))

    if not isfile(basemap_mbtiles):

        osmDownloadData()

        LogMessage("Creating basemap: " + basename(basemap_mbtiles))

        LogMessage("Generating global coastline mbtiles...")

        inputs = runSubprocess(["tilemaker", \
                                "--input", osm_download, \
                                "--output", basemap_mbtiles, \
                                "--bbox", bbox_entireworld, \
                                "--process", TILEMAKER_COASTLINE_PROCESS, \
                                "--config", TILEMAKER_COASTLINE_CONFIG ])

        LogMessage("Merging " + basename(OSM_MAIN_DOWNLOAD) + " into global coastline mbtiles...")

        inputs = runSubprocess(["tilemaker", \
                                "--input", osm_download, \
                                "--output", basemap_mbtiles, \
                                "--merge", \
                                "--process", TILEMAKER_OMT_PROCESS, \
                                "--config", TILEMAKER_OMT_CONFIG ])
        
    overlays_mbtiles = join(TILESERVER_DATA_FOLDER, 'osm-boundaries-overlays.mbtiles')

    if not isfile(overlays_mbtiles):

        LogMessage("Creating osm-boundaries-overlays.mbtiles...")

        inputs = runSubprocess(["tippecanoe", \
                                "-o", overlays_mbtiles, \
                                "osm-boundaries-overlays.geojson", \
                                "-Z4", "-z11", \
                                "--generate-ids", \
                                "--force", \
                                "-n", "osm-boundaries-overlays", \
                                "-l", "osm-boundaries-overlays", \
                                "--no-feature-limit", \
                                "--no-tile-size-limit" ])

main()