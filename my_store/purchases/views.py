from django.db.models import Q
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from .models import Achat, EntreeAchat
from .serializers import (
    AchatSerializer,
    AchatCreateSerializer,
    AchatListSerializer,
    EntreeAchatSerializer,
    EntreeAchatCreateSerializer,
    EntreeAchatListSerializer
)


class EntreeAchatViewSet(viewsets.ModelViewSet):
    """ViewSet pour gérer les entrées d'achat"""
    queryset = EntreeAchat.objects.all()
    permission_classes = [AllowAny]

    def get_serializer_class(self):
        if self.action == 'create':
            return EntreeAchatCreateSerializer
        elif self.action == 'list':
            return EntreeAchatListSerializer
        return EntreeAchatSerializer

    def get_queryset(self):
        queryset = EntreeAchat.objects.all()

        # Filtres
        date_from = self.request.query_params.get('date_from', None)
        date_to = self.request.query_params.get('date_to', None)
        search = self.request.query_params.get('search', None)
        client_id = self.request.query_params.get('client_id', None)

        if date_from:
            queryset = queryset.filter(date__gte=date_from)
        if date_to:
            queryset = queryset.filter(date__lte=date_to)
        if client_id:
            queryset = queryset.filter(client_id=client_id)
        if search:
            queryset = queryset.filter(
                Q(numero_entree__icontains=search) |
                Q(nom_client__icontains=search) |
                Q(client__first_name__icontains=search) |
                Q(client__last_name__icontains=search)
            )

        return queryset

    def perform_create(self, serializer):
        if self.request.user and self.request.user.is_authenticated:
            serializer.save(created_by=self.request.user)
        else:
            serializer.save(created_by=None)

    @action(detail=False, methods=['get'])
    def total(self, request):
        """Calculer le total des entrées d'achat"""
        queryset = self.get_queryset()
        total = sum(entree.montant_net for entree in queryset)
        return Response({'total': float(total)})


class AchatViewSet(viewsets.ModelViewSet):
    """ViewSet pour gérer les lignes d'achat"""
    queryset = Achat.objects.all()
    permission_classes = [AllowAny]

    def get_serializer_class(self):
        if self.action == 'create':
            return AchatCreateSerializer
        elif self.action == 'list':
            return AchatListSerializer
        return AchatSerializer

    def get_queryset(self):
        queryset = Achat.objects.all()

        # Filtres
        date_from = self.request.query_params.get('date_from', None)
        date_to = self.request.query_params.get('date_to', None)
        entree_id = self.request.query_params.get('entree_id', None)
        search = self.request.query_params.get('search', None)

        if date_from:
            queryset = queryset.filter(date__gte=date_from)
        if date_to:
            queryset = queryset.filter(date__lte=date_to)
        if entree_id:
            queryset = queryset.filter(entree_id=entree_id)
        if search:
            queryset = queryset.filter(
                Q(nom_client__icontains=search) |
                Q(nom_produit__icontains=search) |
                Q(client__first_name__icontains=search) |
                Q(client__last_name__icontains=search) |
                Q(produit__name__icontains=search)
            )

        return queryset

    def perform_create(self, serializer):
        if self.request.user and self.request.user.is_authenticated:
            serializer.save(created_by=self.request.user)
        else:
            serializer.save(created_by=None)
