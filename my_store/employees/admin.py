from django.contrib import admin
from .models import Employee, EmployeeExpense


@admin.register(Employee)
class EmployeeAdmin(admin.ModelAdmin):
    list_display = ('id', 'first_name', 'last_name', 'full_name', 'email', 'phone', 'city', 'created_at')
    list_filter = ('city', 'created_at')
    search_fields = ('first_name', 'last_name', 'email', 'phone')
    ordering = ('-created_at',)


@admin.register(EmployeeExpense)
class EmployeeExpenseAdmin(admin.ModelAdmin):
    list_display = ('id', 'employee', 'date', 'somme_remise', 'nom_depense', 'somme_depense', 'somme_restante', 'created_at')
    list_filter = ('date', 'employee', 'created_at')
    search_fields = ('employee__first_name', 'employee__last_name', 'nom_depense')
    ordering = ('-date', '-created_at')
    date_hierarchy = 'date'

