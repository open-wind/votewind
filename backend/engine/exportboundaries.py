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
import unicodedata
import re
import requests
import cairosvg
import io
import random
from PIL import Image
from io import BytesIO
from bs4 import BeautifulSoup
from urllib.parse import urljoin
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

from django.db import connection
from django.contrib.gis.db.models.functions import Area
from django.contrib.gis.gdal import DataSource
from django.contrib.gis.utils import LayerMapping
from django.contrib.gis.geos import GEOSException, Polygon, MultiPolygon, GEOSGeometry, Point, fromstr

from engine.models import Boundary


# ***********************************************************
# ***************** General helper functions ****************
# ***********************************************************

def jitter_coords(lat, lng, max_offset=0.003):
    return (
        float(lat) + random.uniform(-max_offset, max_offset),
        float(lng) + random.uniform(-max_offset, max_offset)
    )

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

# ***********************************************************
# ***********************************************************
# ********************* MAIN APPLICATION ********************
# ***********************************************************
# ***********************************************************

def main():
    """
    Exports boundary links
    """

    outputfile_path = "boundaries.html"

    boundaries = Boundary.objects.exclude(slug=None).order_by("name")
    with open(outputfile_path, 'w', newline='', encoding='utf-8') as outputfile:
        outputfile.write('<ul>')
        for boundary in boundaries:
            print(boundary.name, boundary.slug)
            outputfile.write('<li><a target="_blank" href="https://' + boundary.slug + '.votewind.org">' + boundary.name + '</a></li>')
        outputfile.write('</ul>')


main()