"""votewind URL Configuration

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/3.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
import re
from django.contrib import admin
from django.urls import path, re_path
from django.http import HttpResponse

from engine import views

REACT_MODERN_BROWSER_INDEX_PATH = '/usr/src/votewind/static-frontend/index.html'
REACT_LEGACY_BROWSER_INDEX_PATH = '/usr/src/votewind/static-frontend-legacy/index.html'
REACT_MODERN_BROWSER_INDEX_CONTENT = None
REACT_LEGACY_BROWSER_INDEX_CONTENT = None

LEGACY_PATTERNS = [
    re.compile(r"CPU (iPhone )?OS 12_\d", re.I),         # iOS 12.x
    re.compile(r"CPU (iPhone )?OS 13_\d", re.I),         # iOS 13.x
    re.compile(r"Windows NT 6\.1.*Trident", re.I),       # Windows 7 + IE
    re.compile(r"Windows NT 6\.2.*Trident", re.I),       # Windows 8 + IE
    re.compile(r"Windows NT 6\.3.*Trident", re.I),       # Windows 8.1 + IE
    re.compile(r"Windows NT 10\.0.*Trident", re.I),      # Windows 10 + IE
    re.compile(r"Version/(5|6|7|8|9|10|11)\.\d.*Safari", re.I)   # Safari 5-11
]

def is_legacy_browser(request):
    """
    Detect whether legacy browser
    """

    user_agent = request.META.get('HTTP_USER_AGENT', '')
    for pattern in LEGACY_PATTERNS:
        if pattern.search(user_agent):
            return True
    return False

def serve_react_index(request):
    """
    Serves up main REACT app
    """

    global REACT_MODERN_BROWSER_INDEX_PATH, REACT_LEGACY_BROWSER_INDEX_PATH
    global REACT_MODERN_BROWSER_INDEX_CONTENT, REACT_LEGACY_BROWSER_INDEX_CONTENT

    if (REACT_MODERN_BROWSER_INDEX_CONTENT is None) or (REACT_LEGACY_BROWSER_INDEX_CONTENT is None):

        try:
            with open(REACT_MODERN_BROWSER_INDEX_PATH, encoding='utf-8') as f:
                REACT_MODERN_BROWSER_INDEX_CONTENT = f.read()
        except FileNotFoundError:
            return HttpResponse("index.html (modern browsers) not found", status=404)

        try:
            with open(REACT_LEGACY_BROWSER_INDEX_PATH, encoding='utf-8') as f:
                REACT_LEGACY_BROWSER_INDEX_CONTENT = f.read()
        except FileNotFoundError:
            return HttpResponse("index.html (legacy browsers) not found", status=404)

    index_content = REACT_MODERN_BROWSER_INDEX_CONTENT
    if is_legacy_browser(request): index_content = REACT_LEGACY_BROWSER_INDEX_CONTENT

    return HttpResponse(index_content)
    
urlpatterns = [
    re_path(r'^(?!admin|api|votes|organisations|communityenergygroups).*$', serve_react_index),
    path('admin/', admin.site.urls),
    path('api/boundary', views.BoundaryGet, name='boundary'),
    path('api/locationsearch', views.LocationSearch, name='locationsearch'),
    path('api/locationget', views.LocationGet, name='locationget'),
    path('api/setcookie', views.SetCookie, name='setcookie'),
    path('api/hascookie', views.HasValidCookie, name='hasvalidcookie'),
    path('api/vote', views.SubmitVote, name='vote'),
    path('api/leaderboard', views.Leaderboard, name='leaderboard'),
    path('api/windspeed', views.GetWindSpeed, name='windspeed'),
    path('api/substation', views.GetSubstation, name='substation'),
    path('api/viewshed', views.Viewshed, name='viewshed'),
    path('api/containingboundaries', views.ContainingBoundaries, name='containingboundaries'),
    path('api/cesium-jit', views.CesiumJIT, name='cesiumjit'),
    path('votes', views.Votes, name='votes'),
    path('organisations', views.Organisations, name='organisations'),
    path('communityenergygroups', views.CommunityEnergyGroups, name='communityenergygroups'),
    re_path(r'^api/confirmvote/(?P<uidb64>[0-9A-Za-z_\-]+)/(?P<token>[0-9a-f]{1,32})/$', views.ConfirmVote, name='confirmvote'),
]
