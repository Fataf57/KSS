from django.contrib import admin
from .models import StockEntry


@admin.register(StockEntry)
class StockEntryAdmin(admin.ModelAdmin):
    list_display = ['id', 'date', 'nom_fournisseur', 'type_denree', 'nombre_sacs', 
                    'poids_par_sac', 'tonnage_total', 'numero_magasin', 'created_at']
    list_filter = ['date', 'numero_magasin', 'type_denree', 'created_at']
    search_fields = ['nom_fournisseur', 'type_denree', 'notes']
    readonly_fields = ['tonnage_total', 'created_at', 'updated_at', 'created_by']
    date_hierarchy = 'date'
    
    fieldsets = (
        ('Informations principales', {
            'fields': ('date', 'nom_fournisseur', 'type_denree', 'numero_magasin')
        }),
        ('Détails', {
            'fields': ('nombre_sacs', 'poids_par_sac', 'tonnage_total')
        }),
        ('Autres', {
            'fields': ('notes', 'created_by', 'created_at', 'updated_at')
        }),
    )
