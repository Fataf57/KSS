from rest_framework import serializers
from decimal import Decimal
from .models import StockEntry, CamionChargement, ChargementStockItem


class StockEntrySerializer(serializers.ModelSerializer):
    """Serializer pour les entrées et sorties de stock"""
    numero_magasin_display = serializers.CharField(source='get_numero_magasin_display', read_only=True)
    type_operation_display = serializers.CharField(source='get_type_operation_display', read_only=True)
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)

    class Meta:
        model = StockEntry
        fields = [
            'id', 'date', 'type_operation', 'type_operation_display', 'nom_fournisseur', 
            'type_denree', 'nombre_sacs', 'poids_par_sac', 'tonnage_total', 
            'numero_magasin', 'numero_magasin_display', 'notes', 'created_by', 
            'created_by_username'
        ]
        read_only_fields = ['tonnage_total', 'created_at', 'updated_at', 'created_by']


class StockEntryCreateSerializer(serializers.ModelSerializer):
    """Serializer pour créer des entrées et sorties de stock"""
    
    class Meta:
        model = StockEntry
        fields = [
            'date', 'type_operation', 'nom_fournisseur', 'type_denree', 'nombre_sacs',
            'poids_par_sac', 'numero_magasin', 'notes'
        ]

    def validate(self, data):
        """Valider que les sorties ne dépassent pas le stock disponible"""
        if data.get('type_operation') == 'sortie':
            type_denree = data.get('type_denree')
            numero_magasin = data.get('numero_magasin')
            nombre_sacs = data.get('nombre_sacs', 0)
            
            if type_denree and numero_magasin and nombre_sacs > 0:
                from django.db.models import Sum
                from .models import StockEntry
                
                entrees = StockEntry.objects.filter(
                    type_operation='entree',
                    type_denree=type_denree,
                    numero_magasin=numero_magasin
                ).aggregate(Sum('nombre_sacs'))['nombre_sacs__sum'] or 0
                
                sorties = StockEntry.objects.filter(
                    type_operation='sortie',
                    type_denree=type_denree,
                    numero_magasin=numero_magasin
                ).aggregate(Sum('nombre_sacs'))['nombre_sacs__sum'] or 0
                
                stock_disponible = entrees - sorties
                
                if nombre_sacs > stock_disponible:
                    raise serializers.ValidationError({
                        'non_field_errors': [
                            f"Stock insuffisant pour effectuer cette sortie. "
                            f"Stock disponible: {stock_disponible} sacs, "
                            f"demandé: {nombre_sacs} sacs"
                        ]
                    })
        
        return data

    def create(self, validated_data):
        # Le tonnage_total sera calculé automatiquement dans le modèle
        return StockEntry.objects.create(**validated_data)


class StockEntryListSerializer(serializers.ModelSerializer):
    """Serializer pour la liste des entrées et sorties de stock"""
    numero_magasin_display = serializers.CharField(source='get_numero_magasin_display', read_only=True)
    type_operation_display = serializers.CharField(source='get_type_operation_display', read_only=True)

    class Meta:
        model = StockEntry
        fields = [
            'id', 'date', 'type_operation', 'type_operation_display', 'nom_fournisseur', 
            'type_denree', 'nombre_sacs', 'poids_par_sac', 'tonnage_total', 
            'numero_magasin', 'numero_magasin_display', 'created_at'
        ]


class ChargementStockItemSerializer(serializers.ModelSerializer):
    """Serializer pour les items de stock dans un chargement"""
    stock_entry_id = serializers.IntegerField(source='stock_entry.id', read_only=True)
    stock_entry_date = serializers.DateField(source='stock_entry.date', read_only=True)
    stock_entry_fournisseur = serializers.CharField(source='stock_entry.nom_fournisseur', read_only=True)

    class Meta:
        model = ChargementStockItem
        fields = ['id', 'stock_entry', 'stock_entry_id', 'stock_entry_date', 'stock_entry_fournisseur', 'nombre_sacs_utilises']
        read_only_fields = ['id']


class CamionChargementSerializer(serializers.ModelSerializer):
    """Serializer pour les chargements de camion"""
    numero_magasin_display = serializers.CharField(source='get_numero_magasin_display', read_only=True)
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)
    stock_items = ChargementStockItemSerializer(many=True, read_only=True)
    poids_manquant = serializers.SerializerMethodField()

    class Meta:
        model = CamionChargement
        fields = [
            'id', 'date_chargement', 'ville_depart', 'type_denree', 'nombre_sacs',
            'poids_par_sac', 'tonnage_total', 'numero_camion', 'numero_chauffeur',
            'date_arrivee', 'poids_arrive', 'poids_manquant', 'numero_magasin', 
            'numero_magasin_display', 'destination', 'chauffeur', 'depenses', 'benefices', 'notes', 
            'created_by', 'created_by_username', 'created_at', 'updated_at', 'stock_items'
        ]
        read_only_fields = ['tonnage_total', 'poids_manquant', 'created_at', 'updated_at', 'created_by']
    
    def get_poids_manquant(self, obj):
        """Retourne le poids manquant calculé"""
        if obj.poids_arrive is not None:
            return float(max(Decimal('0.00'), obj.tonnage_total - obj.poids_arrive))
        return None


class CamionChargementCreateSerializer(serializers.ModelSerializer):
    """Serializer pour créer des chargements de camion"""
    stock_items = serializers.ListField(
        child=serializers.DictField(),
        write_only=True,
        required=False,
        help_text="Liste des entrées de stock utilisées: [{'stock_entry_id': 1, 'nombre_sacs_utilises': 10}]"
    )

    class Meta:
        model = CamionChargement
        fields = [
            'date_chargement', 'ville_depart', 'type_denree', 'nombre_sacs',
            'poids_par_sac', 'numero_camion', 'numero_chauffeur', 'date_arrivee',
            'poids_arrive', 'numero_magasin', 'destination', 'chauffeur', 'depenses', 'benefices', 'notes', 'stock_items'
        ]

    def create(self, validated_data):
        stock_items_data = validated_data.pop('stock_items', [])
        
        # Créer le chargement
        chargement = CamionChargement.objects.create(**validated_data)
        
        # Créer les items de stock associés et soustraire du stock
        from django.db import transaction
        with transaction.atomic():
            for item_data in stock_items_data:
                stock_entry_id = item_data.get('stock_entry_id')
                nombre_sacs_utilises = item_data.get('nombre_sacs_utilises', 0)
                
                try:
                    stock_entry = StockEntry.objects.get(id=stock_entry_id)
                    
                    # Vérifier que le stock est suffisant
                    if nombre_sacs_utilises > stock_entry.nombre_sacs:
                        raise serializers.ValidationError(
                            f"Stock insuffisant pour l'entrée {stock_entry_id}. "
                            f"Disponible: {stock_entry.nombre_sacs}, Demandé: {nombre_sacs_utilises}"
                        )
                    
                    # Créer l'item de chargement
                    ChargementStockItem.objects.create(
                        chargement=chargement,
                        stock_entry=stock_entry,
                        nombre_sacs_utilises=nombre_sacs_utilises
                    )
                    
                    # Soustraire du stock
                    stock_entry.nombre_sacs -= nombre_sacs_utilises
                    stock_entry.save()
                    
                except StockEntry.DoesNotExist:
                    raise serializers.ValidationError(f"Entrée de stock {stock_entry_id} introuvable")
        
        return chargement


class CamionChargementListSerializer(serializers.ModelSerializer):
    """Serializer pour la liste des chargements de camion"""
    numero_magasin_display = serializers.CharField(source='get_numero_magasin_display', read_only=True)
    poids_manquant = serializers.SerializerMethodField()

    class Meta:
        model = CamionChargement
        fields = [
            'id', 'date_chargement', 'ville_depart', 'type_denree', 'nombre_sacs',
            'poids_par_sac', 'tonnage_total', 'numero_camion', 'numero_chauffeur',
            'date_arrivee', 'poids_arrive', 'poids_manquant', 'numero_magasin', 
            'numero_magasin_display', 'destination', 'chauffeur', 'depenses', 'benefices', 'created_at'
        ]
    
    def get_poids_manquant(self, obj):
        """Retourne le poids manquant calculé"""
        if obj.poids_arrive is not None:
            return float(max(Decimal('0.00'), obj.tonnage_total - obj.poids_arrive))
        return None
