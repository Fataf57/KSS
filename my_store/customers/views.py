from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from .models import Customer, ClientChargement
from .serializers import (
    CustomerSerializer, CustomerListSerializer,
    ClientChargementSerializer, ClientChargementCreateSerializer, ClientChargementListSerializer
)


class CustomerViewSet(viewsets.ModelViewSet):
    queryset = Customer.objects.all()
    permission_classes = [AllowAny]

    def get_serializer_class(self):
        if self.action == 'list':
            return CustomerListSerializer
        return CustomerSerializer

    def get_queryset(self):
        queryset = Customer.objects.all()
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
            
            # Vérifier s'il y a des chargements associés (pour information)
            chargements_count = instance.chargements.count()
            
            # La suppression se fera automatiquement grâce à CASCADE
            # Mais on peut informer l'utilisateur
            self.perform_destroy(instance)
            
            return Response(
                {
                    'message': 'Client supprimé avec succès',
                    'chargements_deleted': chargements_count
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


class ClientChargementViewSet(viewsets.ModelViewSet):
    """ViewSet pour gérer les chargements clients"""
    queryset = ClientChargement.objects.all()
    permission_classes = [AllowAny]

    def get_serializer_class(self):
        if self.action == 'create':
            return ClientChargementCreateSerializer
        elif self.action == 'list':
            return ClientChargementListSerializer
        return ClientChargementSerializer

    def get_queryset(self):
        queryset = ClientChargement.objects.all()
        
        # Filtres
        client = self.request.query_params.get('client', None)
        date_from = self.request.query_params.get('date_from', None)
        date_to = self.request.query_params.get('date_to', None)

        if client:
            queryset = queryset.filter(client_id=client)
        if date_from:
            queryset = queryset.filter(date_chargement__gte=date_from)
        if date_to:
            queryset = queryset.filter(date_chargement__lte=date_to)

        return queryset

    def perform_create(self, serializer):
        # Si l'utilisateur est authentifié, l'associer au chargement
        if self.request.user and self.request.user.is_authenticated:
            serializer.save(created_by=self.request.user)
        else:
            serializer.save(created_by=None)

