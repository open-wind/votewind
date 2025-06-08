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
from django.contrib import admin
from django.urls import path, re_path
from django.http import HttpResponse

from engine import views

REACT_INDEX_PATH = '/usr/src/votewind/static-frontend/index.html'
REACT_INDEX_CONTENT = None

def serve_react_index(request):
    """
    Serves up main REACT app
    """

    global REACT_INDEX_PATH, REACT_INDEX_CONTENT

    if REACT_INDEX_CONTENT is None:

        try:
            with open(REACT_INDEX_PATH, encoding='utf-8') as f:
                REACT_INDEX_CONTENT = f.read()
        except FileNotFoundError:
            return HttpResponse("index.html not found", status=404)

    return HttpResponse(REACT_INDEX_CONTENT)
    
urlpatterns = [
    re_path(r'^(?!admin|api|votes|organisation).*$', serve_react_index),
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
    path('votes/', views.Votes, name='votes'),
    path('organisations/', views.Organisations, name='organisations'),
    re_path(r'^api/confirmvote/(?P<uidb64>[0-9A-Za-z_\-]+)/(?P<token>[0-9a-f]{1,32})/$', views.ConfirmVote, name='confirmvote'),
]
