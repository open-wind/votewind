import csv

from django.contrib.gis.db import models
from django.contrib import admin
from django.contrib.postgres.indexes import GistIndex
from django.http import HttpResponse

# from django.contrib.gis.admin import OSMGeoAdmin
from leaflet.admin import LeafletGeoAdmin, LeafletGeoAdminMixin

class ExportCsvMixin:
    def export_as_csv(self, request, queryset):

        meta = self.model._meta
        field_names = [field.name for field in meta.fields]

        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename={}.csv'.format(meta)
        writer = csv.writer(response)

        writer.writerow(field_names)
        for obj in queryset:
            row = writer.writerow([getattr(obj, field) for field in field_names])

        return response

    export_as_csv.short_description = "Export selected"

class ExportUniqueEmailCsvMixin:
    def export_unique_emails_as_csv(self, request, queryset):

        meta = self.model._meta
        field_names = ['email']

        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename={}.csv'.format(meta)
        writer = csv.writer(response)

        writer.writerow(field_names)
        emails = set()
        for obj in queryset:
            if obj.email not in emails:
                row = writer.writerow([obj.email])
            emails.add(obj.email)

        return response

    export_unique_emails_as_csv.short_description = "Export unique emails"

class Postcode(models.Model):
    """
    Stores postcodes
    """

    name = models.CharField(max_length=100, default='', blank=True)
    search = models.CharField(max_length=100, default='', blank=True)
    geometry = models.PointField(null=True, blank=True)

    class Meta:
        ordering = ('name',) 
        indexes = [
            models.Index(fields=['name',]),
            models.Index(fields=['search',]),
            GistIndex(fields=['geometry']),
        ]

    def __str__(self):
        return self.name


class PostcodeAdmin(LeafletGeoAdmin):
    list_display = ['name']

    search_fields = (
        'name',
        'search'
    )

class Boundary(models.Model):
    """
    Stores boundaries, eg. parish council, local authority, county, country
    """

    name = models.CharField(max_length = 200, blank=True, null=True)
    council_name = models.CharField(max_length = 200, blank=True, null=True)
    type = models.CharField(max_length = 100, blank=True, null=True)
    level = models.CharField(max_length = 5, blank=True, null=True)
    geometry = models.MultiPolygonField(srid=4326, geography=False, blank=True, null=True)
    
    def _get_geometry(self):
        return self.geometry

    geom = property(_get_geometry)
    
    class Meta:
        ordering = ('name',) 
        indexes = [
            models.Index(fields=['name',]),
            models.Index(fields=['council_name',]),
            models.Index(fields=['level',]),
            GistIndex(fields=['geometry']),
        ]

    def __str__(self):
        return self.name

class BoundaryAdmin(LeafletGeoAdmin):
    list_display = ['name', 'council_name', 'type', 'level']

    search_fields = (
        'name',
        'council_name',
        'level',
        'type'
    )

class Place(models.Model):
    """
    Stores places
    """

    name = models.CharField(max_length=200, default='', blank=True)
    county = models.CharField(max_length=200, default='', blank=True)
    geometry = models.PointField(srid=4326, geography=False, null=True, blank=True)
    boundary = models.ForeignKey(Boundary, on_delete=models.SET_NULL, related_name='boundary', null=True)

    def _get_geometry(self):
        return self.geometry

    geom = property(_get_geometry)

    class Meta:
        ordering = ('name', 'county', ) 
        indexes = [
            models.Index(fields=['name',]),
            models.Index(fields=['county',]),
            GistIndex(fields=['geometry']),
        ]

    def __str__(self):
        return self.name

class PlaceAdmin(LeafletGeoAdmin):
    list_display = ['name', 'county', 'boundary']

    search_fields = (
        'name',
        'county'
    )

class UserID(models.Model):
    """
    Stores globally unique user ID that is generated whenever a fresh cookie is set
    We use Google Recaptcha as a key part of generating a cookie - to prevent spam voting
    """

    userid = models.CharField(max_length=200, default='', blank=True)
    internetip = models.CharField(max_length=200, default='', blank=True)
    useragent = models.CharField(max_length=1000, default='', blank=True)
    created = models.DateTimeField(auto_now_add=True) 
    
    def __str__(self):
        return self.userid

    class Meta:
        ordering = ('userid', 'created', )
        indexes = [
            models.Index(fields=['userid',]),
            models.Index(fields=['internetip',]),
            models.Index(fields=['useragent',]),
            models.Index(fields=['created',]),
        ]

class UserIDAdmin(admin.ModelAdmin):
    list_display = ['userid', 'internetip', 'useragent', 'created']

    search_fields = (
        'userid',
        'internetip',
        'useragent',
        'created'
    )

class Vote(models.Model):
    """
    Stores user votes
    """

    userid = models.CharField(max_length=200, default='', blank=True)
    email = models.CharField(max_length=200, default='', blank=True)
    internetip = models.CharField(max_length=200, default='', blank=True)
    useragent = models.CharField(max_length=1000, default='', blank=True)
    created = models.DateTimeField(auto_now_add=True)
    geometry = models.PointField(srid=4326, geography=False, null=True, blank=True)
    userposition = models.PointField(srid=4326, geography=False, null=True, blank=True)
    userposition_type = models.CharField(max_length=200, default='', blank=True)
    live = models.BooleanField(null=False, default=False)
    token = models.CharField(max_length=100, default='', blank=True)
    confirmed = models.BooleanField(null=False, default=False)

    class Meta:
        ordering = ('userid', 'email', 'live', 'created')
        indexes = [
            models.Index(fields=['userid',]),
            models.Index(fields=['email',]),
            models.Index(fields=['internetip',]),
            models.Index(fields=['useragent',]),
            models.Index(fields=['created',]),
            models.Index(fields=['userposition_type',]),
            models.Index(fields=['live',]),
            models.Index(fields=['token',]),
            models.Index(fields=['confirmed',]),
            GistIndex(fields=['geometry']),
            GistIndex(fields=['userposition']),
        ]

class VoteAdmin(LeafletGeoAdmin, ExportCsvMixin, ExportUniqueEmailCsvMixin):
    list_display = ['userid', 'email', 'internetip', 'created', 'live', 'confirmed']
    list_display_links = ('userid', 'email')
    actions = ["export_as_csv", "export_unique_emails_as_csv"]

    list_filter = (
        'live', 'confirmed'
    )

    search_fields = (
        'userid',
        'email',
        'internetip',
        'created',
    )
