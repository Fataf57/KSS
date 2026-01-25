from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.db.models import Sum, Q, Count
from django.db import transaction
from collections import defaultdict
import logging
from .models import StockEntry, CamionChargement, ChargementStockItem
from .serializers import (
    StockEntrySerializer, StockEntryCreateSerializer, StockEntryListSerializer,
    CamionChargementSerializer, CamionChargementCreateSerializer, CamionChargementListSerializer
)

logger = logging.getLogger(__name__)


class StockEntryViewSet(viewsets.ModelViewSet):
    """ViewSet pour gérer les entrées de stock"""
    queryset = StockEntry.objects.all()
    permission_classes = [AllowAny]

    def get_serializer_class(self):
        if self.action == 'create':
            return StockEntryCreateSerializer
        elif self.action == 'list':
            return StockEntryListSerializer
        return StockEntrySerializer

    def get_queryset(self):
        queryset = StockEntry.objects.all()
        
        # Filtres
        date_from = self.request.query_params.get('date_from', None)
        date_to = self.request.query_params.get('date_to', None)
        magasin = self.request.query_params.get('magasin', None)
        type_denree = self.request.query_params.get('type_denree', None)
        fournisseur = self.request.query_params.get('fournisseur', None)
        type_operation = self.request.query_params.get('type_operation', None)

        if date_from:
            queryset = queryset.filter(date__gte=date_from)
        if date_to:
            queryset = queryset.filter(date__lte=date_to)
        if magasin:
            queryset = queryset.filter(numero_magasin=magasin)
        if type_denree:
            queryset = queryset.filter(type_denree__icontains=type_denree)
        if fournisseur:
            queryset = queryset.filter(nom_fournisseur__icontains=fournisseur)
        if type_operation:
            queryset = queryset.filter(type_operation=type_operation)

        return queryset

    def perform_create(self, serializer):
        # Si l'utilisateur est authentifié, l'associer à l'entrée
        if self.request.user and self.request.user.is_authenticated:
            serializer.save(created_by=self.request.user)
        else:
            serializer.save(created_by=None)

    def destroy(self, request, *args, **kwargs):
        """
        Surcharge de la méthode destroy pour gérer explicitement la suppression.
        """
        instance = self.get_object()
        entry_id = instance.id
        
        # Enregistrer les informations de l'entrée avant suppression pour logging
        entry_info = {
            'id': entry_id,
            'type_denree': instance.type_denree,
            'tonnage_total': float(instance.tonnage_total),
            'nombre_sacs': instance.nombre_sacs,
            'magasin': instance.get_numero_magasin_display(),
        }
        
        logger.info(f"Suppression de l'entrée de stock: {entry_info}")
        
        # Supprimer l'entrée dans une transaction pour garantir la cohérence
        try:
            with transaction.atomic():
                instance.delete()
                
                # Vérifier que la suppression a bien eu lieu
                try:
                    StockEntry.objects.get(id=entry_id)
                    logger.error(f"L'entrée {entry_id} existe toujours après suppression!")
                    return Response(
                        {'error': 'La suppression a échoué'},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR
                    )
                except StockEntry.DoesNotExist:
                    logger.info(f"L'entrée {entry_id} a été supprimée avec succès")
                    # Retourner une réponse 204 (No Content) pour indiquer un succès sans contenu
                    return Response(status=status.HTTP_204_NO_CONTENT)
        except Exception as e:
            logger.error(f"Erreur lors de la suppression de l'entrée {entry_id}: {str(e)}")
            return Response(
                {'error': f'Erreur lors de la suppression: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Retourne des statistiques sur les entrées de stock"""
        # Forcer un nouveau queryset à chaque requête pour éviter les problèmes de cache
        queryset = StockEntry.objects.all()
        
        # Appliquer les filtres
        date_from = request.query_params.get('date_from', None)
        date_to = request.query_params.get('date_to', None)
        magasin = request.query_params.get('magasin', None)
        type_denree = request.query_params.get('type_denree', None)
        fournisseur = request.query_params.get('fournisseur', None)

        if date_from:
            queryset = queryset.filter(date__gte=date_from)
        if date_to:
            queryset = queryset.filter(date__lte=date_to)
        if magasin:
            queryset = queryset.filter(numero_magasin=magasin)
        if type_denree:
            queryset = queryset.filter(type_denree__icontains=type_denree)
        if fournisseur:
            queryset = queryset.filter(nom_fournisseur__icontains=fournisseur)
        
        stats = {
            'total_entrees': queryset.count(),
            'total_tonnage': float(queryset.aggregate(Sum('tonnage_total'))['tonnage_total__sum'] or 0),
            'total_sacs': queryset.aggregate(Sum('nombre_sacs'))['nombre_sacs__sum'] or 0,
            'par_magasin': {},
            'par_type_denree': {}
        }
        
        # Par magasin
        for magasin_code, magasin_name in StockEntry.MAGASIN_CHOICES:
            magasin_queryset = queryset.filter(numero_magasin=magasin_code)
            stats['par_magasin'][magasin_name] = {
                'nombre': magasin_queryset.count(),
                'tonnage': float(magasin_queryset.aggregate(Sum('tonnage_total'))['tonnage_total__sum'] or 0)
            }
        
        # Par type de denrée
        types_denree = queryset.values_list('type_denree', flat=True).distinct()
        for type_d in types_denree:
            type_queryset = queryset.filter(type_denree=type_d)
            stats['par_type_denree'][type_d] = {
                'nombre': type_queryset.count(),
                'tonnage': float(type_queryset.aggregate(Sum('tonnage_total'))['tonnage_total__sum'] or 0)
            }
        
        return Response(stats)

    @action(detail=False, methods=['get'])
    def details(self, request):
        """Retourne les détails du stock groupés par type de denrée"""
        # Forcer un nouveau queryset à chaque requête pour éviter les problèmes de cache
        queryset = StockEntry.objects.all()
        
        # Appliquer les filtres du get_queryset si nécessaire
        date_from = request.query_params.get('date_from', None)
        date_to = request.query_params.get('date_to', None)
        magasin = request.query_params.get('magasin', None)
        type_denree = request.query_params.get('type_denree', None)
        fournisseur = request.query_params.get('fournisseur', None)

        if date_from:
            queryset = queryset.filter(date__gte=date_from)
        if date_to:
            queryset = queryset.filter(date__lte=date_to)
        if magasin:
            queryset = queryset.filter(numero_magasin=magasin)
        if type_denree:
            queryset = queryset.filter(type_denree__icontains=type_denree)
        if fournisseur:
            queryset = queryset.filter(nom_fournisseur__icontains=fournisseur)
        
        # Évaluer le queryset en liste pour forcer l'exécution de la requête
        # et éviter tout problème de cache ou de lazy loading
        entries_list = list(queryset)
        
        # Grouper par type de denrée
        details_by_type = defaultdict(lambda: {
            'type_denree': '',
            'sacs_details': defaultdict(lambda: {'nombre': 0, 'poids': 0}),
            'total_sacs': 0,
            'total_tonnage': 0,
            'entrees': []
        })
        
        for entry in entries_list:
            type_d = entry.type_denree
            poids = float(entry.poids_par_sac)
            # Pour les sorties, on soustrait, pour les entrées on additionne
            nombre = entry.nombre_sacs if entry.type_operation == 'entree' else -entry.nombre_sacs
            
            # Initialiser le type de denrée
            if not details_by_type[type_d]['type_denree']:
                details_by_type[type_d]['type_denree'] = type_d
            
            # Ajouter les détails des sacs (les sorties sont négatives)
            poids_key = f"{poids}kg"
            details_by_type[type_d]['sacs_details'][poids_key]['nombre'] += nombre
            details_by_type[type_d]['sacs_details'][poids_key]['poids'] = poids
            
            # Totaux (les sorties sont négatives)
            details_by_type[type_d]['total_sacs'] += nombre
            tonnage = float(entry.tonnage_total) if entry.type_operation == 'entree' else -float(entry.tonnage_total)
            details_by_type[type_d]['total_tonnage'] += tonnage
            
            # Garder une trace des entrées pour référence
            details_by_type[type_d]['entrees'].append({
                'id': entry.id,
                'date': entry.date.isoformat(),
                'fournisseur': entry.nom_fournisseur,
                'magasin': entry.get_numero_magasin_display(),
            })
        
        # Formater la réponse
        result = []
        for type_d, data in details_by_type.items():
            # Extraire les sacs de 80kg et 100kg séparément
            sacs_80kg = 0
            sacs_100kg = 0
            
            for poids_key, detail in data['sacs_details'].items():
                poids = detail['poids']
                nombre = detail['nombre']
                if poids == 80:
                    sacs_80kg += nombre
                elif poids == 100:
                    sacs_100kg += nombre
            
            result.append({
                'type_denree': data['type_denree'],
                'sacs_80kg': max(0, sacs_80kg),  # S'assurer que le stock n'est pas négatif
                'sacs_100kg': max(0, sacs_100kg),  # S'assurer que le stock n'est pas négatif
                'total_sacs': max(0, data['total_sacs']),  # S'assurer que le stock n'est pas négatif
                'total_tonnage': max(0, round(data['total_tonnage'], 2)),  # S'assurer que le stock n'est pas négatif
                'nombre_entrees': len(data['entrees']),
            })
        
        # Trier par type de denrée
        result.sort(key=lambda x: x['type_denree'])
        
        return Response(result)

    @action(detail=False, methods=['get'])
    def transactions_magasin(self, request):
        """Retourne toutes les transactions (entrées et sorties) d'un magasin"""
        magasin = request.query_params.get('magasin', None)
        
        if not magasin:
            return Response(
                {'error': 'Le paramètre magasin est requis'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        queryset = StockEntry.objects.filter(numero_magasin=magasin).order_by('-date', '-created_at')
        
        # Appliquer des filtres optionnels
        date_from = request.query_params.get('date_from', None)
        date_to = request.query_params.get('date_to', None)
        type_denree = request.query_params.get('type_denree', None)
        
        if date_from:
            queryset = queryset.filter(date__gte=date_from)
        if date_to:
            queryset = queryset.filter(date__lte=date_to)
        if type_denree:
            queryset = queryset.filter(type_denree__icontains=type_denree)
        
        # Sérialiser les résultats
        serializer = StockEntrySerializer(queryset, many=True)
        
        return Response({
            'magasin_code': magasin,
            'magasin_nom': dict(StockEntry.MAGASIN_CHOICES).get(magasin, ''),
            'transactions': serializer.data
        })


class CamionChargementViewSet(viewsets.ModelViewSet):
    """ViewSet pour gérer les chargements de camion"""
    queryset = CamionChargement.objects.all()
    permission_classes = [AllowAny]

    def get_serializer_class(self):
        if self.action == 'create':
            return CamionChargementCreateSerializer
        elif self.action == 'list':
            return CamionChargementListSerializer
        elif self.action in ['update', 'partial_update']:
            return CamionChargementSerializer
        return CamionChargementSerializer

    def get_queryset(self):
        queryset = CamionChargement.objects.all()
        
        # Filtres
        date_from = self.request.query_params.get('date_from', None)
        date_to = self.request.query_params.get('date_to', None)
        magasin = self.request.query_params.get('magasin', None)
        type_denree = self.request.query_params.get('type_denree', None)
        numero_camion = self.request.query_params.get('numero_camion', None)

        if date_from:
            queryset = queryset.filter(date_chargement__gte=date_from)
        if date_to:
            queryset = queryset.filter(date_chargement__lte=date_to)
        if magasin:
            queryset = queryset.filter(numero_magasin=magasin)
        if type_denree:
            queryset = queryset.filter(type_denree__icontains=type_denree)
        if numero_camion:
            queryset = queryset.filter(numero_camion__icontains=numero_camion)

        return queryset

    def perform_create(self, serializer):
        # Si l'utilisateur est authentifié, l'associer au chargement
        if self.request.user and self.request.user.is_authenticated:
            serializer.save(created_by=self.request.user)
        else:
            serializer.save(created_by=None)

    def destroy(self, request, *args, **kwargs):
        """
        Gère la suppression d'un chargement de camion.
        Restaure le stock utilisé dans les entrées de stock.
        """
        instance = self.get_object()
        chargement_id = instance.id
        
        logger.info(f"Suppression du chargement de camion: {chargement_id}")
        
        try:
            with transaction.atomic():
                # Récupérer tous les items de stock associés
                stock_items = ChargementStockItem.objects.filter(chargement=instance)
                
                # Restaurer le stock pour chaque item
                for item in stock_items:
                    stock_entry = item.stock_entry
                    stock_entry.nombre_sacs += item.nombre_sacs_utilises
                    stock_entry.save()
                    logger.info(
                        f"Stock restauré: {item.nombre_sacs_utilises} sacs ajoutés "
                        f"à l'entrée {stock_entry.id}"
                    )
                
                # Supprimer le chargement (les items seront supprimés en cascade)
                instance.delete()
                
                logger.info(f"Chargement {chargement_id} supprimé avec succès")
                return Response(status=status.HTTP_204_NO_CONTENT)
        except Exception as e:
            logger.error(f"Erreur lors de la suppression du chargement {chargement_id}: {str(e)}")
            return Response(
                {'error': f'Erreur lors de la suppression: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
