from rest_framework import viewsets
from rest_framework.permissions import AllowAny
import logging
from .models import ArgentEntry
from .serializers import ArgentEntrySerializer, ArgentEntryCreateSerializer

logger = logging.getLogger(__name__)


class ArgentEntryViewSet(viewsets.ModelViewSet):
    """
    ViewSet pour gérer les entrées d'argent.
    Utilisé par l'onglet "Argent" du frontend.
    """
    queryset = ArgentEntry.objects.all()
    permission_classes = [AllowAny]

    def get_serializer_class(self):
        if self.action == 'create':
            return ArgentEntryCreateSerializer
        return ArgentEntrySerializer

    def get_queryset(self):
        queryset = ArgentEntry.objects.all()

        # Filtres simples (par date si besoin à l'avenir)
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')

        if date_from:
            queryset = queryset.filter(date__gte=date_from)
        if date_to:
            queryset = queryset.filter(date__lte=date_to)

        return queryset.order_by('id')

    def create(self, request, *args, **kwargs):
        """Surcharger create pour logger les erreurs"""
        logger.info(f"Tentative de création d'entrée d'argent avec données: {request.data}")
        try:
            return super().create(request, *args, **kwargs)
        except Exception as e:
            logger.error(f"Erreur lors de la création: {str(e)}")
            raise

    def perform_create(self, serializer):
        # Associer l'utilisateur si connecté (agent ou boss)
        if self.request.user and self.request.user.is_authenticated:
            serializer.save(created_by=self.request.user)
        else:
            serializer.save(created_by=None)

