from django.contrib import admin
from .models import Depense, PeriodStop


@admin.register(Depense)
class DepenseAdmin(admin.ModelAdmin):
    list_display = ('date', 'nom_depense', 'somme', 'created_by', 'created_at')
    list_filter = ('date', 'created_at')
    search_fields = ('nom_depense', 'notes')
    date_hierarchy = 'date'
    ordering = ('-date', '-created_at')
    readonly_fields = ('created_at', 'updated_at')


@admin.register(PeriodStop)
class PeriodStopAdmin(admin.ModelAdmin):
    list_display = ('stop_index', 'created_by', 'created_at')
    list_filter = ('created_at',)
    ordering = ('stop_index',)
    readonly_fields = ('created_at',)
