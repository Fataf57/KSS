from django.contrib import admin
from .models import Customer, ClientChargement


@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = ['first_name', 'last_name', 'email', 'phone', 'city', 'created_at']
    list_filter = ['city', 'country', 'created_at']
    search_fields = ['first_name', 'last_name', 'email', 'phone']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(ClientChargement)
class ClientChargementAdmin(admin.ModelAdmin):
    list_display = ['date_chargement', 'client', 'nombre_sacs', 'poids', 'tonnage', 
                    'prix', 'somme_totale', 'avance', 'somme_restante', 'get_statut_dette', 'created_at']
    list_filter = ['date_chargement', 'created_at']
    search_fields = ['client__first_name', 'client__last_name', 'notes']
    readonly_fields = ['tonnage', 'somme_totale', 'somme_restante', 'get_statut_dette', 'created_at', 'updated_at', 'created_by']
    date_hierarchy = 'date_chargement'
    
    def get_statut_dette(self, obj):
        statut = obj.statut_dette
        if statut == "client_doit":
            return "Client doit"
        elif statut == "on_doit":
            return "On doit au client"
        else:
            return "Solde"
    get_statut_dette.short_description = "Statut dette"
    
    fieldsets = (
        ('Informations principales', {
            'fields': ('date_chargement', 'client')
        }),
        ('Détails du chargement', {
            'fields': ('nombre_sacs', 'poids', 'tonnage')
        }),
        ('Financier', {
            'fields': ('prix', 'somme_totale', 'avance', 'somme_restante', 'get_statut_dette')
        }),
        ('Autres', {
            'fields': ('notes', 'created_by', 'created_at', 'updated_at')
        }),
    )
