from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.db.models import Q

from .models import Employee, EmployeeExpense
from .serializers import (
    EmployeeSerializer,
    EmployeeListSerializer,
    EmployeeExpenseSerializer,
    EmployeeExpenseCreateSerializer,
    EmployeeExpenseListSerializer,
)


class EmployeeViewSet(viewsets.ModelViewSet):
    queryset = Employee.objects.all()
    permission_classes = [AllowAny]

    def get_serializer_class(self):
        if self.action == 'list':
            return EmployeeListSerializer
        return EmployeeSerializer

    def get_queryset(self):
        """
        Restreint la liste des employés visibles en fonction des règles de confidentialité :
        - Tous voient les employés non privés.
        - Un employé privé est visible par :
          * son créateur,
          * les utilisateurs présents dans allowed_users,
          * un superutilisateur.
        """
        queryset = Employee.objects.all()
        user = getattr(self.request, "user", None)

        # Filtre de recherche
        search = self.request.query_params.get("search", None)

        if search:
            queryset = queryset.filter(
                Q(first_name__icontains=search)
                | Q(last_name__icontains=search)
                | Q(email__icontains=search)
            )

        # Gestion de la confidentialité et de l'activation
        # Ne montrer que les employés actifs
        visibility_filter = Q(is_active=True, is_private=False)

        if user and user.is_authenticated:
            # Un employé privé est visible par son créateur ou les utilisateurs autorisés
            visibility_filter |= Q(
                is_active=True,
                is_private=True,
                created_by=user
            ) | Q(
                is_active=True,
                is_private=True,
                allowed_users__id=user.id
            )
            if user.is_superuser:
                # Un superuser voit tout (y compris les désactivés)
                visibility_filter = Q()

        queryset = queryset.filter(visibility_filter).distinct()
        return queryset

    def perform_create(self, serializer):
        """
        Lors de la création d'un employé, associer automatiquement le créateur.
        """
        user = getattr(self.request, "user", None)
        if user and user.is_authenticated:
            serializer.save(created_by=user)
        else:
            serializer.save()

    def destroy(self, request, *args, **kwargs):
        """Gestion personnalisée de la suppression avec meilleure gestion d'erreurs"""
        try:
            instance = self.get_object()
            
            # Vérifier s'il y a des dépenses associées (pour information)
            expenses_count = instance.expenses.count()
            
            # La suppression se fera automatiquement grâce à CASCADE
            # Mais on peut informer l'utilisateur
            self.perform_destroy(instance)
            
            return Response(
                {
                    'message': 'Employé supprimé avec succès',
                    'expenses_deleted': expenses_count
                },
                status=status.HTTP_200_OK
            )
        except Exception as e:
            return Response(
                {
                    'detail': f'Erreur lors de la suppression: {str(e)}'
                },
                status=status.HTTP_400_BAD_REQUEST
            )


class EmployeeExpenseViewSet(viewsets.ModelViewSet):
    """ViewSet pour gérer les dépenses employés"""
    queryset = EmployeeExpense.objects.all()
    permission_classes = [AllowAny]

    def get_serializer_class(self):
        if self.action == 'create':
            return EmployeeExpenseCreateSerializer
        elif self.action == 'list':
            return EmployeeExpenseListSerializer
        return EmployeeExpenseSerializer

    def get_queryset(self):
        queryset = EmployeeExpense.objects.all()
        
        # Filtres
        employee = self.request.query_params.get('employee', None)
        date_from = self.request.query_params.get('date_from', None)
        date_to = self.request.query_params.get('date_to', None)

        if employee:
            queryset = queryset.filter(employee_id=employee)
        if date_from:
            queryset = queryset.filter(date__gte=date_from)
        if date_to:
            queryset = queryset.filter(date__lte=date_to)

        return queryset

    def perform_create(self, serializer):
        # Si l'utilisateur est authentifié, l'associer à la dépense
        if self.request.user and self.request.user.is_authenticated:
            serializer.save(created_by=self.request.user)
        else:
            serializer.save(created_by=None)

