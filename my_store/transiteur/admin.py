from django.contrib import admin
from .models import TransiteurEntry


@admin.register(TransiteurEntry)
class TransiteurEntryAdmin(admin.ModelAdmin):
    list_display = ['id', 'date', 'nom_produit', 'numero_camion', 'numero_chauffeur', 'depenses', 'argent_donne', 'created_by', 'created_at']
    list_filter = ['date', 'created_at']
    search_fields = ['nom_produit', 'numero_camion', 'numero_chauffeur', 'ville_depart', 'ville_arrivant']
    readonly_fields = ['created_at', 'updated_at']

