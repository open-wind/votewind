import os
import json
import uuid
import requests
from urllib.parse import urlparse
from time import sleep
from osgeo import gdal, osr, ogr
from turfpy.misc import line_arc
from geojson import Feature as GeoJSONFeature, Point as GeoJSONPoint
from django.conf import settings
from django.core.mail import EmailMessage
from django.core.signing import BadSignature
from django.contrib.gis.db.models.functions import Distance, Area
from django.contrib.gis.geos import GEOSGeometry, Point, Polygon, MultiPolygon
from django.contrib.sites.shortcuts import get_current_site
from django.core.serializers.json import DjangoJSONEncoder
from django.db.models import Q, Count
from django.http import JsonResponse, Http404, HttpResponse, HttpResponseForbidden
from django.shortcuts import render, redirect
from django.template.loader import render_to_string, get_template
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.views.decorators.csrf import csrf_exempt

from .models import Postcode, Place, Boundary, UserID, Vote, Organisation, WindSpeed, Substation

# Number of results to return in a text query on postcodes/places
NUMBER_RESULTS_RETURNED = 26

# Coordinate precision to use when defining turbine positions - crucial to allow the 'same' turbine to be voted for, ie. 'same' within a certain tolerance
COORDINATE_PRECISION = 5

# Define outer world rectangle (or your custom bounds)
WORLD_BOUNDS = Polygon.from_bbox((-180, -90, 180, 90))  # or use a larger one if needed

# Default values for turbine when generating viewshed
DEFAULT_HEIGHT_TO_TIP               = 124.2     # Based on openwind's own manual data on all large (>=75 m to tip-height) failed and successful UK onshore wind projects
DEFAULT_BLADE_RADIUS                = 47.8      # Based on openwind's own manual data on all large (>=75 m to tip-height) failed and successful UK onshore wind projects
DEFAULT_HUB_HEIGHT                  = DEFAULT_HEIGHT_TO_TIP - DEFAULT_BLADE_RADIUS

# Default viewshed parameters
VIEWSHED_MAX_CIRCULAR_RANGE         = float(45000) # 45km
VIEWSHED_MAX_DISTANCE               = float((2 * (VIEWSHED_MAX_CIRCULAR_RANGE ** 2)) ** 0.5)

# Terrain file to be used for generating viewshed
TERRAIN_FILE                        = os.path.dirname(os.path.realpath(__file__)) + '/terrain/terrain_lowres_withfeatures.tif'


def OutputJson(json_array={'result': 'failure'}):
    json_data = json.dumps(json_array, cls=DjangoJSONEncoder, indent=0)
    return HttpResponse(json_data, content_type="text/json")

def OutputError():
    return OutputJson()

@csrf_exempt
def LocationSearch(request):
    """
    Carries out location search based on input query using Postcode, Place and Boundary tables
    """

    query = request.GET.get('query','')
    query_postcode = query.replace(' ', '').upper()
    query_elements = query.split(", ")
    results_returned = {}

    results_returned        = set()
    results_postcode        = Postcode.objects.filter(search__istartswith=query_postcode).distinct()
    results_boundary        = Boundary.objects.exclude(name__iendswith='ED').filter(name__istartswith=query).distinct()
    results_organisations   = Organisation.objects.filter(name__icontains=query).distinct()

    if len(query_elements) == 2:
        results_place = Place.objects.filter(name__iexact=query_elements[0]).filter(county__istartswith=query_elements[1]).distinct()
    else:
        results_place = Place.objects.filter(name__istartswith=query).order_by('name').distinct()

    for result in results_postcode:         results_returned.add(result.name)
    for result in results_place:            results_returned.add(result.name + ", " + result.county)
    for result in results_boundary:         results_returned.add(result.name + ' (Area)')
    for result in results_organisations:    results_returned.add(result.name + ' (Organisation)')

    results_returned = sorted(list(results_returned))
    results_returned = results_returned[:NUMBER_RESULTS_RETURNED]

    return OutputJson({'results': results_returned})

def addPlaceExtent(place, results):
    """
    Gets extent from place and recalculates appropriate bounds to centre on place
    Extent will be smallest boundary containing point 
    - but while this is a good indication of size of settlement it may not have settlement in centre 
    """

    if place.boundary is not None: 
        place_x, place_y = place.geometry.coords[0], place.geometry.coords[1]
        bounds = place.boundary.geometry.extent
        bounds_offset_x = (bounds[2] - bounds[0]) / 2
        bounds_offset_y = (bounds[3] - bounds[1]) / 2
        results['bounds'] = [place_x - bounds_offset_x, place_y - bounds_offset_y, place_x + bounds_offset_x, place_y + bounds_offset_y, ]
    return results

@csrf_exempt
def LocationGet(request):
    """
    Retrieves location information for specific location
    """

    query = request.GET.get('query','').strip().replace(' (Area)', '')
    query_postcode = query.replace(' ', '').upper()
    query_elements = query.split(", ")
    results_returned = {}

    if '(Organisation)' in query:
        query = query.replace(' (Organisation)', '')
        results_organisation = Organisation.objects.filter(name=query).first()
        results_returned = {    'longitude': results_organisation.geometry.coords[0], 
                                'latitude': results_organisation.geometry.coords[1], 
                                'type': 'organisation:' + str(results_organisation.pk), 
                                'properties': { 'id': results_organisation.pk, 
                                                'name': results_organisation.name, 
                                                'url': results_organisation.url, 
                                                'description': results_organisation.description, 
                                                'logo_url': results_organisation.logo_url }}
        return OutputJson({'results': results_returned})

    if len(query_elements) == 2:
        place, county = query_elements[0], query_elements[1]
        results_place = Place.objects.filter(name__iexact=place).filter(county__iexact=county).first()
        place_coords = results_place.geometry.coords
        results_returned = {'longitude': place_coords[0], 'latitude': place_coords[1], 'type': 'place:' + query}
        results_returned = addPlaceExtent(results_place, results_returned)
    else:
        results_place       = Place.objects.filter(name__iexact=query).order_by('name').order_by('county').first()
        results_postcode    = Postcode.objects.filter(search=query_postcode).first()
        results_boundary    = Boundary.objects.exclude(name__iendswith='ED').filter(name__iexact=query).first()

        if results_place is not None:
            place_coords = results_place.geometry.coords
            results_returned = {'longitude': place_coords[0], 'latitude': place_coords[1], 'type': 'place:' + query}
            results_returned = addPlaceExtent(results_place, results_returned)

        if results_postcode is not None:
            postcode_coords = results_postcode.geometry.coords
            results_returned = {'longitude': postcode_coords[0], 'latitude': postcode_coords[1], 'type': 'postcode:' + query_postcode}

        if results_boundary is not None:
            boundary_extent = results_boundary.geometry.extent
            results_returned = {'boundary': results_boundary.name, 'longitude': ((boundary_extent[0] + boundary_extent[2]) / 2), 'latitude': ((boundary_extent[1] + boundary_extent[3]) / 2), 'bounds': boundary_extent, 'type': 'boundary:' + query}

    return OutputJson({'results': results_returned})

@csrf_exempt
def BoundaryGet(request):
    """
    Retrieves boundary extent information for specific boundary 'slug', eg. 'east-sussex', 'barton-cambridgeshire'
    """

    query = request.GET.get('query','').strip().lower()

    if not query:
        raise Http404("Missing slug")
    try:
        boundary = Boundary.objects.filter(slug=query).order_by('-type', 'level').first()
        boundary_extent = boundary.geometry.extent

        # # Subtract region from world
        # mask_geom = WORLD_BOUNDS.difference(boundary.geometry)
        # mask_geom = GEOSGeometry(mask_geom.wkt)
        # mask_geom = mask_geom.simplify(0.0001, preserve_topology=True)
        # mask_geojson_feature = {"type": "Feature", "properties": {}, "geometry": json.loads(mask_geom.geojson)}
        # ******** USE TIPPECANOE TO LOAD OVERLAYS ***********

        mask_geojson_feature = {"type": "Feature", "properties": {}}
        mask_geojson_feature['properties'] = {  'boundary': boundary.name, \
                                                'slug': boundary.slug, \
                                                'longitude': ((boundary_extent[0] + boundary_extent[2]) / 2), \
                                                'latitude': ((boundary_extent[1] + boundary_extent[3]) / 2), \
                                                'bounds': boundary_extent, \
                                                'type': 'boundary:' + query }

        mask_geojson = {"type": "FeatureCollection", "features": [mask_geojson_feature]}        
        return HttpResponse(json.dumps(mask_geojson), content_type='application/vnd.geo+json')
    except Boundary.DoesNotExist:
        raise Http404("Boundary not found")

@csrf_exempt
def ContainingBoundaries(request):
    """
    Gets list of all boundaries, ordered by smallest to largest area, that have slugs and contain specific point
    """

    try:
        data = json.loads(request.body)
        longitude = float(data['position']['longitude'])
        latitude = float(data['position']['latitude'])
    except (KeyError, ValueError, KeyError):
        return HttpResponseForbidden("POST variables missing")

    position = Point(longitude, latitude, srid=4326)
    containing_slugs = (
        Boundary.objects
        .filter(simplified_geometry__contains=position)
        .exclude(slug__isnull=True)
        .exclude(slug__exact='')
        .order_by('area')
    )

    results, slugs = [], set()
    for containing_slug in containing_slugs:
        slug = containing_slug.slug
        if slug in slugs: continue
        slugs.add(slug)
        results.append({'name': containing_slug.name, 'slug': slug})

    return JsonResponse({'success': True, 'results': results})

def get_client_ip(request):
    """
    Get user's IP from request
    """
    # If behind a proxy/load balancer
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0].strip()
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip

def get_user_agent(request):
    """
    Get user's browser user-agent from request
    """
    return request.META.get('HTTP_USER_AGENT', '')

@csrf_exempt
def SetCookie(request):
    """
    Sets signed cookie for user
    """

    if request.method != 'POST':
        return JsonResponse({'error': 'Only POST allowed'}, status=405)

    try:
        data = json.loads(request.body)
        token = data.get('token')
    except (ValueError, KeyError):
        return JsonResponse({'success': False, 'error': 'Invalid JSON or missing token'}, status=400)

    if not token:
        return JsonResponse({'success': False, 'error': 'No token provided'}, status=400)

    # Verify with Google
    verify_url = 'https://www.google.com/recaptcha/api/siteverify'
    payload = {
        'secret': settings.RECAPTCHA_SECRET_KEY,
        'response': token,
    }

    res = requests.post(verify_url, data=payload)
    result = res.json()

    if not result.get('success'):
        return JsonResponse({'success': False, 'error': 'CAPTCHA verification failed'}, status=403)

    # Set signed cookie
    response = JsonResponse({'success': True})
    userid = str(uuid.uuid4())
    response.set_signed_cookie(
            key=settings.COOKIE_NAME,
            value=userid,
            salt=settings.SECRET_KEY,
            max_age=5 * 60 * 60 * 24 * 365,  # 5 years
            httponly=True,
            secure=False,  # only if you're using HTTPS
            samesite="Lax"
    )

    internetip = get_client_ip(request)
    useragent = get_user_agent(request)

    UserID.objects.create(
        userid=userid,
        internetip=internetip,
        useragent=useragent
    )

    return response

def CreateVote(request, vote_parameters):
    """
    Creates actual vote
    """

    userid, email, token, defaultlive = '', '', '', False

    if 'email' in vote_parameters:
        if vote_parameters['email'].strip() != '':
            # Don't disable any existing votes for user with email
            # This will only happen once email vote has been confirmed
            email = vote_parameters['email']
            token = uuid.uuid4().hex

    if 'userid' in vote_parameters:
        # Disable all existing votes from user if using userid
        Vote.objects.filter(userid=vote_parameters['userid']).update(live=False)
        userid = vote_parameters['userid']
        defaultlive = True

    # Ensure turbine position accuracy is no greater than COORDINATE_PRECISION to more easily enable multiple votes for same position
    vote_object = Vote.objects.create(  userid=userid,
                                        email=email,
                                        internetip=vote_parameters['internetip'],
                                        useragent=vote_parameters['useragent'],
                                        geometry=Point(round(vote_parameters['turbineposition']['longitude'], COORDINATE_PRECISION), round(vote_parameters['turbineposition']['latitude'], COORDINATE_PRECISION), srid=4326),
                                        userposition=Point(vote_parameters['userposition']['longitude'], vote_parameters['userposition']['latitude'], srid=4326),
                                        userposition_type=vote_parameters['userposition_type'],
                                        live=defaultlive,
                                        token=token,
                                        confirmed=False )

    if email != '':
        # Attempt to send vote confirmation email
        from_email = '"VoteWind.org" <info@votewind.org>'
        subject = "VoteWind.org: Confirm your wind turbine vote"
        current_site = get_current_site(request)
        email_parameters = {}
        email_parameters['email'] = email
        email_parameters['domain'] = current_site.domain
        email_parameters['uid'] = urlsafe_base64_encode(force_bytes(vote_object.pk))
        email_parameters['token'] = token
        email_parameters['site'] = {    \
                                        'longitude': round(vote_parameters['turbineposition']['longitude'], COORDINATE_PRECISION), \
                                        'latitude': round(vote_parameters['turbineposition']['latitude'], COORDINATE_PRECISION) 
                                    }
        confirmation_message = render_to_string('engine/confirm_vote.html', email_parameters)
        confirmation_message = EmailMessage(subject, confirmation_message, from_email=from_email, to=[email_parameters['email']])
        confirmation_message.send()

@csrf_exempt
def HasValidCookie(request):
    """
    Checks whether user has valid signed cookie
    """

    try:
        userid = request.get_signed_cookie(settings.COOKIE_NAME, salt=settings.SECRET_KEY)
        userid_record = UserID.objects.filter(userid=userid).first()
        if userid_record is None: return JsonResponse({'valid': False})
        return JsonResponse({'valid': True})
    except (KeyError, BadSignature):
        return JsonResponse({'valid': False})

@csrf_exempt
def GetWindSpeed(request):
    """
    Gets wind speed for specific longitude/latitude
    """

    try:
        data = json.loads(request.body)
        longitude = float(data['position']['longitude'])
        latitude = float(data['position']['latitude'])
    except (KeyError, ValueError, KeyError):
        return HttpResponseForbidden("POST variables missing")

    position = Point(longitude, latitude, srid=4326)
    windspeed_obj = WindSpeed.objects.filter(geometry__contains=position).first()
    windspeed = None
    if windspeed_obj: windspeed = round(windspeed_obj.windspeed, 2)

    return JsonResponse({'windspeed': windspeed})

@csrf_exempt
def GetSubstation(request):
    """
    Gets nearest substation for specific longitude/latitude
    """

    try:
        data = json.loads(request.body)
        longitude = float(data['position']['longitude'])
        latitude = float(data['position']['latitude'])
    except (KeyError, ValueError, KeyError):
        return HttpResponseForbidden("POST variables missing")

    position = Point(longitude, latitude, srid=4326)
    nearest_substation = (
        Substation.objects
        .exclude(substation='traction')
        .annotate(distance=Distance('geometry', position))
        .order_by('distance')
        .first()
    )
    geometry = nearest_substation.geometry
    if geometry.geom_type != 'Point': geometry = geometry.centroid

    results = {
        "name": nearest_substation.name,
        "operator": nearest_substation.operator,
        "voltage": nearest_substation.voltage,
        "substation": nearest_substation.substation,
        "power": nearest_substation.power,
        "distance_km": round(nearest_substation.distance.km, 2),
        "position": {
            "latitude": geometry.y,
            "longitude": geometry.x
        }
    }
    return JsonResponse({'success': True, 'results': results})

def returncirclesforpoint(lng, lat):
    center = GeoJSONFeature(geometry=GeoJSONPoint((lng, lat)))
    bearing1 = 0
    bearing2 = 359.99999

    features = []
    steps = [5, 10, 15, 20, 25, 30, 35, 40]
    stepdistance = 10
    for step_index in range(len(steps)):
        radius = steps[step_index]
        feature = line_arc(center=center, radius=radius, bearing1=bearing1, bearing2=bearing2)
        feature['properties'] = {'class': 'Distance_Circle', 'distance': str(radius) + 'km'}
        features.append(feature)
        feature_coordinates = feature['geometry']['coordinates']
        point_label_coordinates = feature_coordinates[int(len(feature_coordinates) / 2)]
        feature_point = {'type': 'Feature', 'name': str(radius) + 'km', 'properties': {'name': str(radius) + 'km', 'class': 'Distance_Circle_Label'}, 'geometry': {'type': 'Point', 'coordinates': point_label_coordinates}}
        features.append(feature_point)

    return features

def getelevationforpoint(lon, lat):
    global TERRAIN_FILE
    # With thanks to https://stackoverflow.com/questions/74026802/get-elevation-from-lat-long-of-geotiff-data-in-gdal
    ds = gdal.OpenEx(TERRAIN_FILE)
    raster_proj = ds.GetProjection()
    gt = ds.GetGeoTransform()
    ds = None
    source_srs = osr.SpatialReference()
    source_srs.ImportFromWkt(osr.GetUserInputAsWKT("urn:ogc:def:crs:OGC:1.3:CRS84"))
    target_srs = osr.SpatialReference()
    target_srs.ImportFromWkt(raster_proj)
    ct = osr.CoordinateTransformation(source_srs, target_srs)
    mapx, mapy, *_ = ct.TransformPoint(lon, lat)
    gt_inv = gdal.InvGeoTransform(gt) 
    px, py = gdal.ApplyGeoTransform(gt_inv, mapx, mapy)
    py = int(py)
    px = int(px)
    ds = gdal.OpenEx(TERRAIN_FILE)
    elevation_value = ds.ReadAsArray(px, py, 1, 1)
    ds = None
    elevation = elevation_value[0][0]
    return elevation, mapx, mapy

def GetViewsheds(lon, lat, hubheight, bladeradius):
    global TERRAIN_FILE

    uniqueid = str(lon) + '_' + str(lat) + '_' + str(hubheight) + '_' + str(bladeradius)
    groundheight, observerX, observerY = getelevationforpoint(lon, lat)
    towerheight = hubheight
    turbinetip = hubheight + bladeradius
    towerheight_outfile = uniqueid + "_tower.tif"
    turbinetip_outfile = uniqueid + "_tip.tif"
    towerheight_outfile = '/vsimem/' + uniqueid + "_tower.tif"
    turbinetip_outfile = '/vsimem/' + uniqueid + "_tip.tif"

    src_ds = gdal.Open(TERRAIN_FILE)

    gdal.ViewshedGenerate(
        srcBand = src_ds.GetRasterBand(1),
        driverName = 'GTiff',
        targetRasterName = towerheight_outfile,
        creationOptions = [],
        observerX = observerX,
        observerY = observerY,
        observerHeight = int(towerheight + 0.5),
        targetHeight = 1.5,
        visibleVal = 255.0,
        invisibleVal = 0.0,
        outOfRangeVal = 0.0,
        noDataVal = 0.0,
        dfCurvCoeff = 1.0,
        mode = 1,
        maxDistance = VIEWSHED_MAX_DISTANCE) 

    gdal.ViewshedGenerate(
        srcBand = src_ds.GetRasterBand(1),
        driverName = 'GTiff',
        targetRasterName = turbinetip_outfile,
        creationOptions = [],
        observerX = observerX,
        observerY = observerY,
        observerHeight = int(turbinetip + 0.5),
        targetHeight = 1.5,
        visibleVal = 255.0,
        invisibleVal = 0.0,
        outOfRangeVal = 0.0,
        noDataVal = 0.0,
        dfCurvCoeff = 1.0,
        mode = 1,
        maxDistance = VIEWSHED_MAX_DISTANCE) 

    all_features = distancecircles = returncirclesforpoint(lon, lat)    
    towerheight_geojson = json.loads(polygonizeraster(uniqueid, towerheight_outfile))
    turbinetip_geojson = json.loads(polygonizeraster(uniqueid, turbinetip_outfile))

    for feature_index in range(len(towerheight_geojson['features'])):
        towerheight_geojson['features'][feature_index]['properties']['class'] = 'viewshed_towerheight'
        all_features.append(towerheight_geojson['features'][feature_index])
    for feature_index in range(len(turbinetip_geojson['features'])):
        turbinetip_geojson['features'][feature_index]['properties']['class'] = 'viewshed_turbinetip'
        all_features.append(turbinetip_geojson['features'][feature_index])
    
    featurecollection = {'type': 'FeatureCollection', 'features': all_features}

    return featurecollection

def reprojectrasterto4326(input_file, output_file):
    warp = gdal.Warp(output_file, gdal.Open(input_file), dstSRS='EPSG:4326')
    warp = None

def polygonizeraster(uniqueid, raster_file):
    memory_geojson = '/vsimem/' + uniqueid + ".geojson"
    memory_transformed_raster = '/vsimem/' + uniqueid + '.tif'
    reprojectrasterto4326(raster_file, memory_transformed_raster)

    driver = ogr.GetDriverByName("GeoJSON")
    ds = gdal.OpenEx(memory_transformed_raster)
    raster_proj = ds.GetProjection()
    ds = None
    source_srs = osr.SpatialReference()
    source_srs.ImportFromWkt(raster_proj)
    src_ds = gdal.Open(memory_transformed_raster)
    srs = osr.SpatialReference()
    srs.ImportFromWkt(src_ds.GetProjection())    
    srcband = src_ds.GetRasterBand(1)

    dst_ds = driver.CreateDataSource(memory_geojson)
    dst_layer = dst_ds.CreateLayer("viewshed", srs = source_srs)
    newField = ogr.FieldDefn('Area', ogr.OFTInteger)
    dst_layer.CreateField(newField)
    polygonize = gdal.Polygonize(srcband, srcband, dst_layer, 0, [], callback=None )
    polygonize = None
    del dst_ds

    geojson_content = read_file(memory_geojson)

    return geojson_content

def read_file(filename):
    vsifile = gdal.VSIFOpenL(filename,'r')
    gdal.VSIFSeekL(vsifile, 0, 2)
    vsileng = gdal.VSIFTellL(vsifile)
    gdal.VSIFSeekL(vsifile, 0, 0)
    return gdal.VSIFReadL(1, vsileng, vsifile)

@csrf_exempt
def Viewshed(request):
    """
    Return viewshed as GeoJSON
    """

    global DEFAULT_HUB_HEIGHT, DEFAULT_BLADE_RADIUS

    parameters, lat, lng = None, None, None

    try:
        parameters = json.loads(request.body)
        longitude = float(parameters.get('longitude',0))
        latitude = float(parameters.get('latitude', 51))
        hubheight = float(parameters.get('hub', DEFAULT_HUB_HEIGHT))
        bladeradius = float(parameters.get('blade', DEFAULT_BLADE_RADIUS))
    except ValueError:
        longitude = request.GET.get('longitude', None)
        latitude = request.GET.get('latitude', None)
        if (latitude is None) or (longitude is None):
            return OutputError()
        longitude = float(longitude)
        latitude = float(latitude)
        hubheight = float(request.GET.get('hub', DEFAULT_HUB_HEIGHT))
        bladeradius = float(request.GET.get('blade', DEFAULT_BLADE_RADIUS))        

    geojson = GetViewsheds(longitude, latitude, hubheight, bladeradius)

    return OutputJson(geojson)

@csrf_exempt
def SubmitVote(request):
    """
    Submits user vote
    """

    vote_parameters = {}
    email_set = False

    vote_parameters['internetip'] = get_client_ip(request)
    vote_parameters['useragent'] = get_user_agent(request)

    try:
        data = json.loads(request.body)
    except (ValueError, KeyError):
        return HttpResponseForbidden("POST variables missing")

    if 'email' in data:
        if data['email'].strip() != '':
            email_set = True
            vote_parameters['email'] = data['email'].strip().lower()

    if 'position' not in data:
        return HttpResponseForbidden("No turbine position specified.")

    vote_parameters['turbineposition'] = data['position']
    vote_parameters['userposition'] = {'longitude': data['initialposition']['longitude'], 'latitude': data['initialposition']['latitude']}
    vote_parameters['userposition_type'] = data['initialposition']['type']

    if email_set is False:
        try:
            userid = request.get_signed_cookie(settings.COOKIE_NAME, salt=settings.SECRET_KEY)
        except KeyError:
            return HttpResponseForbidden("Missing signed user cookie.")
        except Exception:
            return HttpResponseForbidden("Invalid cookie signature.")

        userid_record = UserID.objects.filter(userid=userid).first()
        if userid_record is None:
            return HttpResponseForbidden("No valid user id found for cookie.")
        
        vote_parameters['userid'] = userid

    CreateVote(request, vote_parameters)

    if email_set is True:
        # Deactivate any prior votes same user may have made
        user_has_valid_cookie = True
        try:
            userid = request.get_signed_cookie(settings.COOKIE_NAME, salt=settings.SECRET_KEY)
        except KeyError:
            user_has_valid_cookie = False
        except Exception:
            user_has_valid_cookie = False

        if user_has_valid_cookie:
            userid_record = UserID.objects.filter(userid=userid).first()
            if userid_record is None: user_has_valid_cookie = False
        
        if user_has_valid_cookie: Vote.objects.filter(userid=userid).update(live=False)

    return JsonResponse({"success": True, "message": "Vote registered"})

@csrf_exempt
def ConfirmVote(request, uidb64, token):
    """
    Confirm vote using link sent via email
    """

    sleep(0.5)

    try:
        id = urlsafe_base64_decode(uidb64).decode()
        provisionalvote = Vote.objects.get(pk=id)
    except (TypeError, ValueError, OverflowError, Vote.DoesNotExist):
        provisionalvote = None

    if (provisionalvote is not None) and (provisionalvote.token == token) and (provisionalvote.confirmed == False):
        Vote.objects.filter(email=provisionalvote.email).filter(~Q(pk=id)).filter(live=True).update(live=False)
        provisionalvote.confirmed = True
        provisionalvote.live = True
        provisionalvote.save()
        turbineposition = provisionalvote.geometry.coords
        url_path = str(round(turbineposition[0], COORDINATE_PRECISION)) + '/' + str(round(turbineposition[1], COORDINATE_PRECISION)) + '/vote?type=voteconfirmed'
        return redirect(settings.REACT_APPLICATION_BASEURL + url_path)
    else:
        return redirect(settings.REACT_APPLICATION_BASEURL + 'confirmationerror')

@csrf_exempt
def Votes(request):
    """
    Get data on all votes
    """

    distinctpoints = Vote.objects.filter(live=True).values('geometry').annotate(Count('id')).order_by()

    features = []
    index = 0
    for distinctpoint in distinctpoints:
        index += 1
        allvotes_confirmed = Vote.objects.filter(live=True).filter(confirmed=True).filter(geometry=distinctpoint['geometry']).count()
        allvotes_unconfirmed = Vote.objects.filter(live=True).filter(confirmed=False).filter(geometry=distinctpoint['geometry']).count()
        feature = {
            "type": "feature",
            "id": str(index),
            "properties": {
                'id': str(index),
                'position': str(round(distinctpoint['geometry'].coords[1], COORDINATE_PRECISION)) + "°N, " + str(round(distinctpoint['geometry'].coords[0], COORDINATE_PRECISION)) + "°E",
                'votes_confirmed': allvotes_confirmed,
                'votes_unconfirmed': allvotes_unconfirmed,
                'lng': distinctpoint['geometry'].coords[0],
                'lat': distinctpoint['geometry'].coords[1]
            },
            "geometry": {
                "type": "Point",
                "coordinates": [distinctpoint['geometry'].coords[0], distinctpoint['geometry'].coords[1]]
            }
        }
        features.append(feature)

    geojson = { "type": "FeatureCollection", "features": features }
    return OutputJson(geojson)

@csrf_exempt
def Leaderboard(request):
    """
    Get voting leaderboard data
    """

    top_votes = (
        Vote.objects
        .filter(live=True)
        .values('geometry')
        .annotate(
            total_votes=Count('id'),
            confirmed_true=Count('id', filter=Q(confirmed=True)),
            confirmed_false=Count('id', filter=Q(confirmed=False)),
        )
        .order_by('-total_votes', '-confirmed_true')[:10]
    )

    features = []

    for v in top_votes:
        geom = v['geometry']
        if isinstance(geom, str):
            geom = GEOSGeometry(geom) 
        features.append({
            "type": "Feature",
            "geometry": json.loads(geom.geojson),
            "properties": {
                "numvotes": v['total_votes'],
                "confirmed": v['confirmed_true'],
                "unconfirmed": v['confirmed_false'],
            }
        })

    geojson = {
        "type": "FeatureCollection",
        "features": features
    }

    return JsonResponse(geojson)

@csrf_exempt
def CesiumJIT(request):
    """
    Retrieves CesiumJS token
    """

    origin = request.headers.get("Origin")
    parsed = urlparse(origin)
    hostname = parsed.hostname
    scheme = parsed.scheme
    base_domain = '.'.join(hostname.split('.')[-2:])
    origin = f"{scheme}://{base_domain}"

    if origin not in settings.CESIUM_ALLOWED_ORIGINS:
        return HttpResponseForbidden("Unauthorized origin")

    token = os.environ.get("CESIUM_ION_TOKEN")
    return JsonResponse({"token": token})

@csrf_exempt
def Organisations(request):
    """
    Get organisations orderd by proximity to supplied position
    """

    try:
        data = json.loads(request.body)
    except (ValueError, KeyError):
        data = {}

    typefilter = 'community-energy-group'

    if 'position' in data:
        centre = Point(float(data['position']['longitude']), float(data['position']['latitude']), srid=4326)    
        firstcutsize = 5
        organisations = Organisation.objects.filter(type=typefilter).annotate(distance=Distance('geometry' , centre )).order_by('distance')[:firstcutsize]
    else:
        organisations = Organisation.objects.filter(type=typefilter).order_by('name')

    features = []
    for organisation in organisations:
        properties = {  'id': organisation.pk, \
                        'name': organisation.name, \
                        'address': organisation.address, \
                        'description': organisation.description, \
                        'url': organisation.url, \
                        'logo_url': organisation.logo_url, \
                        'logo_transparent': organisation.logo_transparent, \
                        'longitude': organisation.geometry.coords[0], \
                        'latitude': organisation.geometry.coords[1] }
        if hasattr(organisation, 'distance'):
            properties['distance'] = float(organisation.distance.m) / 1000

        feature = {
            "type": "feature",
            "id": str(organisation.pk),
            "properties": properties,
            "geometry": {
                "type": "Point",
                "coordinates": [organisation.geometry.coords[0], organisation.geometry.coords[1]]
            }
        }
        features.append(feature)

    geojson = { "type": "FeatureCollection", "features": features }
    return OutputJson(geojson)
