from rest_framework import serializers
from .models import ArgentEntry


class ArgentEntrySerializer(serializers.ModelSerializer):
    """Serializer pour les entrées d'argent (lecture)"""
    created_by_username = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = ArgentEntry
        fields = [
            'id',
            'date',
            'nom_recuperant',
            'nom_boss',
            'lieu_retrait',
            'somme',
            'nom_recevant',
            'date_sortie',
            'somme_sortie',
            'created_by',
            'created_by_username',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at', 'created_by', 'created_by_username']

    def get_created_by_username(self, obj):
        return obj.created_by.username if obj.created_by else None


class ArgentEntryCreateSerializer(serializers.ModelSerializer):
    """Serializer pour créer des entrées d'argent"""
    
    somme = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, allow_null=True)
    date_sortie = serializers.DateField(required=False, allow_null=True)
    somme_sortie = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, allow_null=True)
    date = serializers.DateField(required=True)  # La date est toujours requise
    nom_recuperant = serializers.CharField(required=False, allow_blank=True, default="")
    nom_boss = serializers.CharField(required=False, allow_blank=True, default="")
    lieu_retrait = serializers.CharField(required=False, allow_blank=True, default="")
    nom_recevant = serializers.CharField(required=False, allow_blank=True, default="")

    class Meta:
        model = ArgentEntry
        fields = ['id', 'date', 'nom_recuperant', 'nom_boss', 'lieu_retrait', 'somme', 'nom_recevant', 'date_sortie', 'somme_sortie']

    def validate_somme(self, value):
        """La somme doit être positive ou nulle."""
        if value is not None and value < 0:
            raise serializers.ValidationError("La somme ne peut pas être négative.")
        return value

    def validate_somme_sortie(self, value):
        """La somme_sortie doit être positive ou nulle."""
        if value is not None and value < 0:
            raise serializers.ValidationError("La somme sortie ne peut pas être négative.")
        return value

    def validate(self, data):
        """Valider qu'il y a au moins une entrée ou une sortie."""
        import logging
        logger = logging.getLogger(__name__)
        
        # Récupérer les valeurs numériques
        somme = data.get('somme')
        somme_sortie = data.get('somme_sortie')
        
        logger.info(f"Validation - somme: {somme}, somme_sortie: {somme_sortie}")
        
        # Une entrée est valide si somme n'est pas None (peut être 0)
        has_entree = somme is not None
        
        # Une sortie est valide si somme_sortie n'est pas None
        has_sortie = somme_sortie is not None
        
        logger.info(f"Validation - has_entree: {has_entree}, has_sortie: {has_sortie}")
        
        if not has_entree and not has_sortie:
            error_msg = "Il doit y avoir au moins une entrée (somme) ou une sortie (somme_sortie)."
            logger.warning(f"Validation échouée: {error_msg}")
            raise serializers.ValidationError({
                'non_field_errors': [error_msg]
            })
        
        logger.info("Validation réussie")
        return data

