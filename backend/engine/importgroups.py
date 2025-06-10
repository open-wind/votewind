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

from engine.models import Organisation

WORKING_FOLDER = str(Path(__file__).absolute().parent) + '/'
GROUPS_FOLDER                       = WORKING_FOLDER + 'groups/'
ORGANISATIONS_TO_IMPORT             = \
                                    {
                                        'england': {
                                            'source': 'community-energy-england'
                                        },
                                        'wales': {
                                            'source': 'google'
                                        },
                                        'scotland': {
                                            'source': 'community-energy-scotland'
                                        },
                                        'northernireland': {
                                            'source': 'google'
                                        }
                                    }

# ***********************************************************
# ***************** General helper functions ****************
# ***********************************************************

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

import requests
from bs4 import BeautifulSoup

def check_url_live(url, timeout=5):
    """
    Checks if a URL is live by sending a HEAD request.
    Returns True if status code is 200, else False.
    """
    try:
        response = requests.head(url, allow_redirects=True, timeout=timeout)
        return response.status_code == 200
    except requests.RequestException:
        return False

def get_logo_url(url, timeout=5):
    """
    If the URL is live, fetches the homepage and attempts to find a full-size logo URL.
    Returns the absolute URL of the first logo found, or None.
    Does NOT return favicons or small icons.
    """
    try:
        response = requests.get(url, timeout=timeout, headers={'User-Agent': 'Mozilla/5.0'})
        response.raise_for_status()
        soup = BeautifulSoup(response.text, 'html.parser')

        # Skip favicons and rel="icon" entirely

        # 1. Check for <meta property="og:image"> (common on modern sites)
        og = soup.find('meta', property='og:image')
        if og and og.get('content') and 'logo' in og['content'].lower():
            return og['content']

        # 2. Look for <img> with class or id or alt containing 'logo'
        for img in soup.find_all('img'):
            src = img.get('src')
            if not src:
                continue

            alt = img.get('alt', '').lower()
            img_id = img.get('id', '').lower()
            img_class = ' '.join(img.get('class', [])).lower()
            combined = f"{alt} {img_id} {img_class} {src.lower()}"

            if 'logo' in combined:
                return urljoin(url, src)

        return None
    except requests.RequestException:
        return None

# Example usage
if __name__ == "__main__":
    test_urls = [
        "https://361energy.org/",
        "https://www.lowcarbonhub.org/p/community-group-of-the-month-abingdon-carbon-cutters/"
    ]
    for u in test_urls:
        is_live = check_url_live(u)
        logo = get_logo_url(u) if is_live else None
        print(f"{u} → Live: {is_live}, Logo: {logo}")


# ***********************************************************
# ***********************************************************
# ********************* MAIN APPLICATION ********************
# ***********************************************************
# ***********************************************************

def main():
    """
    Imports community energy organisations
    """

    global ORGANISATIONS_TO_IMPORT, GROUPS_FOLDER

    initLogging()

    Organisation.objects.all().delete()

    file_keys = ORGANISATIONS_TO_IMPORT.keys()
    count = 0
    for file_key in file_keys:
        extrafields = ORGANISATIONS_TO_IMPORT[file_key]
        file_path = GROUPS_FOLDER + file_key + ".csv"
        LogMessage("Importing: " + basename(file_path))
        with open(file_path, 'r', newline='', encoding="utf-8") as csvfile:
            reader = csv.DictReader(csvfile)
            for row in reader: 
                for field in row.keys():
                    if (row[field].startswith('Not Found')) or (row[field].startswith('Not Provided')): row[field] = ''

                if row['Latitude'] == '': continue
                if row['Website URL'] == '': continue

                is_live = check_url_live(row['Website URL'])
                if not is_live: continue

                logo_url = get_logo_url(row['Website URL'])
                if logo_url:
                    LogMessage("URL for logo of " + row['Website URL'] + " - " + logo_url) 
                else: logo_url = ''

                source = extrafields['source']

                geometry = Point(float(row['Longitude']), float(row['Latitude']), srid=4326)

                Organisation.objects.create(    name=row['Organisation Name'], 
                                                source=source,
                                                address=row['Address'],
                                                postcode=row['Postcode'],
                                                description=row['Short Description'],
                                                url=row['Website URL'],
                                                logo_url=logo_url,
                                                geometry=geometry)

                if count % 10000 == 0: LogMessage("Importing organisation: " + str(count))
                count += 1

        LogMessage("Number of organisations imported: " + str(count))


main()