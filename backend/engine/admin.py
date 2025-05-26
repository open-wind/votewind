from django.contrib import admin

# Register your models here.
from .models import Postcode, PostcodeAdmin, Place, PlaceAdmin, Boundary, BoundaryAdmin, UserID, UserIDAdmin, Vote, VoteAdmin
from leaflet.admin import LeafletGeoAdmin

admin.site.register(Postcode, PostcodeAdmin)
admin.site.register(Place, PlaceAdmin)
admin.site.register(Boundary, BoundaryAdmin)
admin.site.register(UserID, UserIDAdmin)
admin.site.register(Vote, VoteAdmin)