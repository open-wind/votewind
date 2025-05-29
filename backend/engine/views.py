import json
import uuid
import requests
from time import sleep
from django.conf import settings
from django.core.mail import EmailMessage
from django.core.signing import BadSignature
from django.contrib.gis.db.models.functions import Distance
from django.contrib.gis.geos import Point
from django.contrib.sites.shortcuts import get_current_site
from django.core.serializers.json import DjangoJSONEncoder
from django.db.models import Q, Count
from django.http import JsonResponse, HttpResponse, HttpResponseForbidden
from django.shortcuts import render, redirect
from django.template.loader import render_to_string, get_template
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.views.decorators.csrf import csrf_exempt

from .models import Postcode, Place, Boundary, UserID, Vote, Organisation

NUMBER_RESULTS_RETURNED = 26
COORDINATE_PRECISION = 5

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
        firstcutsize = 10
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
                        'lng': organisation.geometry.coords[0], \
                        'lat': organisation.geometry.coords[1] }
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
