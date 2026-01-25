from django.contrib import admin
from .models import Achat, EntreeAchat


@admin.register(EntreeAchat)
class EntreeAchatAdmin(admin.ModelAdmin):
    list_display = ['numero_entree', 'date', 'nom_client', 'transport', 'autres_charges', 'montant_ht', 'montant_net', 'created_at']
    list_filter = ['date', 'created_at']
    search_fields = ['numero_entree', 'nom_client']
    date_hierarchy = 'date'
    ordering = ['-date', '-created_at']


@admin.register(Achat)
class AchatAdmin(admin.ModelAdmin):
    list_display = ['id', 'entree', 'date', 'nom_client', 'nom_produit', 'quantite_kg', 'prix_unitaire', 'somme_totale', 'gros', 'unit']
    list_filter = ['date', 'created_at', 'entree']
    search_fields = ['nom_client', 'nom_produit', 'notes']
    date_hierarchy = 'date'
    ordering = ['-date', '-created_at']
