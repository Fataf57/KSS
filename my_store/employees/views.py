from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from .models import Employee, EmployeeExpense
from .serializers import (
    EmployeeSerializer, EmployeeListSerializer,
    EmployeeExpenseSerializer, EmployeeExpenseCreateSerializer, EmployeeExpenseListSerializer
)


class EmployeeViewSet(viewsets.ModelViewSet):
    queryset = Employee.objects.all()
    permission_classes = [AllowAny]

    def get_serializer_class(self):
        if self.action == 'list':
            return EmployeeListSerializer
        return EmployeeSerializer

    def get_queryset(self):
        queryset = Employee.objects.all()
        search = self.request.query_params.get('search', None)

        if search:
            queryset = queryset.filter(
                first_name__icontains=search
            ) | queryset.filter(
                last_name__icontains=search
            ) | queryset.filter(
                email__icontains=search
            )

        return queryset

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

