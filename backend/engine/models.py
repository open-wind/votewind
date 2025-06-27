import csv

from django.contrib.gis.db import models
from django.contrib import admin
from django.contrib.postgres.indexes import GistIndex
from django.http import HttpResponse
from django.utils.text import slugify
from django.contrib.gis.geos import MultiPolygon, Polygon
from django.utils.html import format_html

# from django.contrib.gis.admin import OSMGeoAdmin
from leaflet.admin import LeafletGeoAdmin, LeafletGeoAdminMixin

ORGANISATION_TYPE_CHOICES = (
    ("community-energy-group", "Community Energy Group"),
    ("ngo", "National / Regional NGO"),
    ("electricity", "Elecricity Company"),
    ("community-energy-related", "Community Energy Related Organisation"),
    ("community-energy-member", "Community Energy Member"),
)

ORGANISATION_SOURCE_CHOICES = (
    ("google", "Google"),
    ("transition-network", "Transition Network"),
    ("community-energy-england", "Community Energy England"),
    ("community-energy-scotland", "Community Energy Scotland"),
    ("community-energy-wales", "Community Energy Wales"),
)

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

class ClipRegion(models.Model):
    geometry = models.MultiPolygonField()

    class Meta:
        indexes = [
            GistIndex(fields=['geometry']),
        ]

    def __str__(self):
        return f"ClipRegion {self.pk}"  # or any identifier you'd like
    
class ClipRegionAdmin(LeafletGeoAdmin):
    list_display = ['id']

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

SLUG_LOOKUP = {
    'Alba / Scotland': 'scotland', \
	'Cymru / Wales': 'wales', \
	'Northern Ireland / Tuaisceart Éireann': 'northernireland', \
    'Scotland': 'scotland', \
	'Wales': 'wales', \
	'Northern Ireland': 'northernireland' \
}

class Boundary(models.Model):
    """
    Stores boundaries, eg. parish council, local authority, county, country
    """

    name = models.CharField(max_length = 200, blank=True, null=True)
    name_en = models.CharField(max_length = 200, blank=True, null=True)
    name_orig = models.CharField(max_length = 200, blank=True, null=True)
    slug = models.SlugField(max_length = 100, blank=True)
    council_name = models.CharField(max_length = 200, blank=True, null=True)
    type = models.CharField(max_length = 100, blank=True, null=True)
    level = models.CharField(max_length = 5, blank=True, null=True)
    area = models.IntegerField(null=True, blank=True, db_index=True)
    geometry = models.MultiPolygonField(srid=4326, geography=False, blank=True, null=True)
    simplified_geometry = models.MultiPolygonField(srid=4326, null=True, blank=True)

    def _get_geometry(self):
        return self.geometry

    geom = property(_get_geometry)
    
    class Meta:
        ordering = ('name',) 
        indexes = [
            models.Index(fields=['name',]),
            models.Index(fields=['name_en',]),
            models.Index(fields=['slug',]),
            models.Index(fields=['council_name',]),
            models.Index(fields=['level',]),
            GistIndex(fields=['geometry']),
        ]

    def reset(self, *args, **kwargs):
        self.slug = ''
        super().save(*args, **kwargs)

    def save(self, *args, **kwargs):
        if self.geometry:
            # Optional: transform to 3857 for area in m²
            geom = self.geometry.transform(3857, clone=True)
            # We don't need hugely accurate area as only used for selecting smaller and larger area through queries
            self.area = int(geom.area / (1000 * 1000))
            simplified = self.geometry.simplify(tolerance=0.001, preserve_topology=True)

            # Ensure it's a MultiPolygon
            if isinstance(simplified, Polygon):
                simplified = MultiPolygon(simplified)

            self.simplified_geometry = simplified

        if (not self.slug) or (self.slug == ''):
            print(self.name)
            if self.name in SLUG_LOOKUP: 
                self.slug = SLUG_LOOKUP[self.name]
                super().save(*args, **kwargs)
                return
            
            base_slug = slugify(self.name)
            sameslug = (
                Boundary.objects
                .filter(slug=base_slug)
                .order_by('pk')
                .values_list('pk', flat=True)
            )

            if (len(list(sameslug)) == 0) and (self.name not in SLUG_LOOKUP.values()):
                # base_slug is unique so save
                self.slug = base_slug
                super().save(*args, **kwargs)
                return

            if self.level in ['', '6', '7', '8']:
                samenames = (
                    Boundary.objects
                    .filter(level__in=['', '6', '7', '8'])
                    .filter(name=self.name)
                    .exclude(pk=self.pk)
                )

                if samenames:
                    # Choose 'nonadministrative' (eg. historical county) if it exists over 'administrative'
                    if self.type == 'nonadministrative':
                        if (samenames.count() == 1) and (samenames[0].type == 'administrative'):
                            self.slug = base_slug
                            super().save(*args, **kwargs)
                            return
                    # If samenames and no clear rules for giving slug, don't save any slug
                else:
                    # No other boundary with same name so slugify
                    self.slug = base_slug
                    super().save(*args, **kwargs)
                    return

            if self.level in ['9', '10']:
                containing = (
                    Boundary.objects
                    .filter(level=6)
                    .filter(geometry__contains=self.geometry.centroid)
                    .exclude(pk=self.pk)
                    .first()
                )

                if containing:
                    slug_containing = slugify(f"{self.name} {containing.name}")
                else:
                    slug_containing = base_slug + '-uk'
                    print("Problem - no containing boundary for: " + self.name + ' so using -uk as containing name')

                samename_containing = (
                    Boundary.objects
                    .filter(level__in=['9', '10'])
                    .filter(slug__regex=r'^' + slug_containing + '(-\d+)?$')
                    .exclude(pk=self.pk)
                    .order_by('-slug')
                    .first()
                )

                if samename_containing:
                    slug_latest_index = samename_containing.slug.replace(slug_containing, '').replace('-', '')
                    if slug_latest_index == '': slug_index = 2
                    else: slug_index = 1 + int(slug_latest_index)
                    self.slug = slug_containing + '-' + str(slug_index)
                else:
                    self.slug = slug_containing

        super().save(*args, **kwargs)

    def __str__(self):
        return self.name

class BoundaryAdmin(LeafletGeoAdmin):
    list_display = ['name', 'slug', 'council_name', 'type', 'level', 'area']

    ordering = ('name', 'slug', 'council_name', 'type', 'level', 'area') 

    search_fields = (
        'name',
        'slug',
        'council_name',
        'level',
        'type'
    )

class Place(models.Model):
    """
    Stores places
    """

    name = models.CharField(max_length=200, default='', blank=True)
    name_en = models.CharField(max_length = 200, blank=True, null=True)
    name_orig = models.CharField(max_length = 200, blank=True, null=True)
    county = models.CharField(max_length=200, default='', blank=True)
    geometry = models.PointField(srid=4326, geography=False, null=True, blank=True)
    boundary = models.ForeignKey(Boundary, on_delete=models.SET_NULL, related_name='boundary', default='', null=True)

    def _get_geometry(self):
        return self.geometry

    geom = property(_get_geometry)

    class Meta:
        ordering = ('name', 'county', ) 
        indexes = [
            models.Index(fields=['name',]),
            models.Index(fields=['name_en',]),
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

class Organisation(models.Model):
    """
    Stores information about organisations, eg. community energy groups
    """

    name = models.CharField(max_length=1000, default='', blank=True)
    type = models.CharField(max_length=50, choices=ORGANISATION_TYPE_CHOICES, default="community-energy-group")
    source = models.CharField(max_length=50, choices=ORGANISATION_SOURCE_CHOICES, default="google")
    email = models.CharField(max_length=200, default='', blank=True)
    address = models.TextField(default='', blank=True)
    postcode = models.CharField(max_length=60, default='', blank=True)
    description = models.TextField(default='', blank=True)
    url = models.CharField(max_length=1000, default='', blank=True)
    logo_url = models.CharField(max_length=1000, default='', blank=True)
    logo_transparent = models.BooleanField(default=False)
    geometry = models.PointField(srid=4326, geography=False, null=True, blank=True)
    created = models.DateTimeField(auto_now_add=True)

    def logo_preview(self):
        if self.logo_url:
            return format_html('<img src="{}" style="height:40px;" />', self.logo_url)
        return "No logo"
    logo_preview.short_description = "Logo"
    logo_preview.allow_tags = True

    class Meta:
        ordering = ('type', 'name')
        indexes = [
            models.Index(fields=['name',]),
            models.Index(fields=['type',]),
            models.Index(fields=['source',]),
            models.Index(fields=['email',]),
            models.Index(fields=['url',]),
            GistIndex(fields=['geometry']),
        ]

class OrganisationAdmin(LeafletGeoAdmin, ExportCsvMixin, ExportUniqueEmailCsvMixin):
    list_display = ['name', 'type', 'source', 'email', 'url', 'logo_preview', 'logo_transparent', 'logo_url', 'created']
    actions = ["export_as_csv", "export_unique_emails_as_csv"]

    list_filter = (
        'type',
        'source',
        'logo_transparent'
    )

    search_fields = (
        'name',
        'type',
        'source',
        'email',
        'description',
        'url'
    )

class WindSpeed(models.Model):
    windspeed = models.FloatField()
    geometry = models.MultiPolygonField(srid=4326)

    def __str__(self):
        return f"{self.windspeed:.2f} m/s"

    class Meta:
        indexes = [
            models.Index(fields=['windspeed',]),
            GistIndex(fields=['geometry']),
        ]

class WindSpeedAdmin(LeafletGeoAdmin):
    list_display = ['windspeed', 'geometry']

    list_filter = (
        'windspeed',
    )

class Substation(models.Model):
    name = models.CharField(max_length=255, null=True, blank=True)
    operator = models.CharField(max_length=255, null=True, blank=True)
    voltage = models.FloatField(max_length=50, null=True, blank=True, default=0, db_index=True)
    substation = models.CharField(max_length=100, null=True, blank=True)
    power = models.CharField(max_length=100, null=True, blank=True)
    geometry = models.GeometryField(srid=4326, spatial_index=True)

    class Meta:
        indexes = [
            models.Index(fields=["voltage"]),
            GistIndex(fields=['geometry']),
        ]
        verbose_name = "Substation"
        verbose_name_plural = "Substations"

    def __str__(self):
        return f"{self.name or 'Unnamed'} ({self.voltage or 'Unknown voltage'})"
    
class SubstationAdmin(LeafletGeoAdmin):
    list_display = ("name", "operator", "voltage", "substation", "power", "geometry_type")
    list_filter = ("operator", "voltage", "substation")
    search_fields = ("name", "operator", "voltage")

    def geometry_type(self, obj):
        return obj.geometry.geom_type