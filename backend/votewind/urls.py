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
from engine import views

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/locationsearch', views.LocationSearch, name='locationsearch'),
    path('api/locationget', views.LocationGet, name='locationget'),
    path('api/setcookie', views.SetCookie, name='setcookie'),
    path('api/hascookie', views.HasValidCookie, name='hasvalidcookie'),
    path('api/vote', views.SubmitVote, name='vote'),
    path('votes/', views.Votes, name='votes'),
    path('organisations/', views.Organisations, name='organisations'),
    re_path(r'^api/confirmvote/(?P<uidb64>[0-9A-Za-z_\-]+)/(?P<token>[0-9a-f]{1,32})/$', views.ConfirmVote, name='confirmvote'),
]
