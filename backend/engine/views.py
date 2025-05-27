import json
import uuid
import requests
from django.shortcuts import render
from django.views.decorators.csrf import csrf_exempt
from django.http import HttpResponse
from django.core.serializers.json import DjangoJSONEncoder
from django.db.models import Q
from django.contrib.gis.db.models import Extent
from django.http import JsonResponse, HttpResponseForbidden
from django.contrib.gis.geos import Point
from django.conf import settings
from django.core.signing import BadSignature

from .models import Postcode, Place, Boundary, UserID, Vote

NUMBER_RESULTS_RETURNED = 26

def OutputJson(json_array={'result': 'failure'}):
    json_data = json.dumps(json_array, cls=DjangoJSONEncoder, indent=2)
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

    results_returned    = set()
    results_postcode    = Postcode.objects.filter(search__istartswith=query_postcode).distinct()
    results_boundary    = Boundary.objects.exclude(name__iendswith='ED').filter(name__istartswith=query).distinct()

    if len(query_elements) == 2:
        results_place = Place.objects.filter(name__iexact=query_elements[0]).filter(county__istartswith=query_elements[1]).distinct()
    else:
        results_place = Place.objects.filter(name__istartswith=query).order_by('name').distinct()

    for result in results_postcode: results_returned.add(result.name)
    for result in results_place:    results_returned.add(result.name + ", " + result.county)
    for result in results_boundary: results_returned.add(result.name + ' (Council or County)')

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

    query = request.GET.get('query','').strip().replace(' (Council or County)', '')
    query_postcode = query.replace(' ', '').upper()
    query_elements = query.split(", ")
    results_returned = {}

    if len(query_elements) == 2:
        place, county = query_elements[0], query_elements[1]
        results_place = Place.objects.filter(name__iexact=place).filter(county__iexact=county).first()
        place_coords = results_place.geometry.coords
        results_returned = {'longitude': place_coords[0], 'latitude': place_coords[1]}
        results_returned = addPlaceExtent(results_place, results_returned)
    else:
        results_place       = Place.objects.filter(name__iexact=query).order_by('name').order_by('county').first()
        results_postcode    = Postcode.objects.filter(search=query_postcode).first()
        results_boundary    = Boundary.objects.exclude(name__iendswith='ED').filter(name__iexact=query).first()

        if results_place is not None:
            place_coords = results_place.geometry.coords
            results_returned = {'longitude': place_coords[0], 'latitude': place_coords[1]}
            results_returned = addPlaceExtent(results_place, results_returned)

        if results_postcode is not None:
            postcode_coords = results_postcode.geometry.coords
            results_returned = {'longitude': postcode_coords[0], 'latitude': postcode_coords[1]}

        if results_boundary is not None:
            boundary_extent = results_boundary.geometry.extent
            results_returned = {'boundary': results_boundary.name, 'longitude': ((boundary_extent[0] + boundary_extent[2]) / 2), 'latitude': ((boundary_extent[1] + boundary_extent[3]) / 2), 'bounds': boundary_extent}

    return OutputJson({'results': results_returned})

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

def CreateVote(vote_parameters):
    """
    Creates actual vote
    """

    userid, email, defaultlive = '', '', False

    if 'email' in vote_parameters:
        # Don't disable any existing votes for user with email
        # This will only happen once email vote has been confirmed
        email = vote_parameters['email']
    if 'userid' in vote_parameters:
        # Disable all existing votes from user if using userid
        Vote.objects.filter(userid=vote_parameters['userid']).update(live=False)
        userid = vote_parameters['userid']
        defaultlive = True

    Vote.objects.create(
        userid=userid,
        email=email,
        internetip=vote_parameters['internetip'],
        useragent=vote_parameters['useragent'],
        geometry=Point(vote_parameters['turbineposition']['longitude'], vote_parameters['turbineposition']['latitude'], srid=4326),
        live=defaultlive,
        confirmed=False
    )

    # TODO - if email, send confirmation email
    # token = models.CharField(max_length=100, default='', blank=True)

@csrf_exempt
def HasValidCookie(request):
    """
    Checks whether user has valid signed cookie
    """

    try:
        cookie = request.get_signed_cookie(settings.COOKIE_NAME, salt=settings.SECRET_KEY)
        return JsonResponse({'valid': True})
    except (KeyError, BadSignature):
        return JsonResponse({'valid': False})
    
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

    CreateVote(vote_parameters)

    return JsonResponse({"message": "Vote registered"})