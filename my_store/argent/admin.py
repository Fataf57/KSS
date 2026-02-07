from django.contrib import admin
from .models import ArgentEntry


@admin.register(ArgentEntry)
class ArgentEntryAdmin(admin.ModelAdmin):
    list_display = ['id', 'date', 'somme', 'somme_sortie', 'created_by', 'created_at']
    list_filter = ['date', 'created_at']
    search_fields = []
    readonly_fields = ['created_at', 'updated_at']

