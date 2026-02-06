from rest_framework import serializers
from .models import Depense, PeriodStop, ArgentEntry


class DepenseSerializer(serializers.ModelSerializer):
    """Serializer pour les dépenses"""
    created_by_username = serializers.SerializerMethodField(read_only=True)
    nom_personne = serializers.CharField(required=False, allow_blank=True, default="")

    class Meta:
        model = Depense
        fields = [
            'id', 'date', 'nom_personne', 'nom_depense', 'somme', 'notes',
            'created_by', 'created_by_username', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at', 'created_by']

    def get_created_by_username(self, obj):
        """Retourner le nom d'utilisateur ou None si created_by est null"""
        return obj.created_by.username if obj.created_by else None
    
    def to_representation(self, instance):
        """S'assurer que nom_personne a toujours une valeur"""
        try:
            representation = super().to_representation(instance)
            if representation.get('nom_personne') is None:
                representation['nom_personne'] = ""
            return representation
        except Exception as e:
            # En cas d'erreur, retourner une représentation minimale avec gestion des erreurs
            nom_personne = ""
            try:
                nom_personne = getattr(instance, 'nom_personne', '') or ''
            except:
                pass
            
            created_by_username = None
            try:
                if instance.created_by:
                    created_by_username = instance.created_by.username
            except:
                pass
            
            created_at = None
            try:
                if hasattr(instance, 'created_at') and instance.created_at:
                    created_at = instance.created_at.isoformat()
            except:
                pass
            
            return {
                'id': instance.id,
                'date': str(instance.date),
                'nom_personne': nom_personne,
                'nom_depense': instance.nom_depense,
                'somme': str(instance.somme),
                'notes': getattr(instance, 'notes', '') or '',
                'created_by_username': created_by_username,
                'created_at': created_at
            }

    def validate_somme(self, value):
        """Valider que la somme est positive (ou nulle/vide pour permettre les lignes vides)"""
        if value is None or value == 0:
            return value  # Permettre les valeurs nulles ou zéro pour les lignes vides
        if value < 0:
            raise serializers.ValidationError("La somme ne peut pas être négative.")
        return value


class DepenseCreateSerializer(serializers.ModelSerializer):
    """Serializer pour créer des dépenses"""
    id = serializers.IntegerField(read_only=True)

    class Meta:
        model = Depense
        fields = ['id', 'date', 'nom_personne', 'nom_depense', 'somme', 'notes']
        extra_kwargs = {
            'nom_personne': {'required': False, 'allow_blank': True, 'default': ''}
        }

    def validate_somme(self, value):
        """Valider que la somme est positive (ou nulle/vide pour permettre les lignes vides)"""
        if value is None or value == 0:
            return value  # Permettre les valeurs nulles ou zéro pour les lignes vides
        if value < 0:
            raise serializers.ValidationError("La somme ne peut pas être négative.")
        return value

    def create(self, validated_data):
        # S'assurer que nom_personne a une valeur par défaut si non fourni
        if 'nom_personne' not in validated_data or validated_data['nom_personne'] is None:
            validated_data['nom_personne'] = ""
        depense = Depense.objects.create(**validated_data)
        return depense


class DepenseListSerializer(serializers.ModelSerializer):
    """Serializer pour la liste des dépenses"""
    created_by_username = serializers.SerializerMethodField(read_only=True)
    nom_personne = serializers.CharField(required=False, allow_blank=True, default="")

    class Meta:
        model = Depense
        fields = [
            'id', 'date', 'nom_personne', 'nom_depense', 'somme', 'notes',
            'created_by_username', 'created_at'
        ]

    def get_created_by_username(self, obj):
        """Retourner le nom d'utilisateur ou None si created_by est null"""
        return obj.created_by.username if obj.created_by else None
    
    def to_representation(self, instance):
        """S'assurer que nom_personne a toujours une valeur"""
        try:
            representation = super().to_representation(instance)
            if representation.get('nom_personne') is None:
                representation['nom_personne'] = ""
            return representation
        except Exception as e:
            # En cas d'erreur, retourner une représentation minimale avec gestion des erreurs
            nom_personne = ""
            try:
                nom_personne = getattr(instance, 'nom_personne', '') or ''
            except:
                pass
            
            created_by_username = None
            try:
                if instance.created_by:
                    created_by_username = instance.created_by.username
            except:
                pass
            
            created_at = None
            try:
                if hasattr(instance, 'created_at') and instance.created_at:
                    created_at = instance.created_at.isoformat()
            except:
                pass
            
            return {
                'id': instance.id,
                'date': str(instance.date),
                'nom_personne': nom_personne,
                'nom_depense': instance.nom_depense,
                'somme': str(instance.somme),
                'notes': getattr(instance, 'notes', '') or '',
                'created_by_username': created_by_username,
                'created_at': created_at
            }


class PeriodStopSerializer(serializers.ModelSerializer):
    """Serializer pour les arrêts de compte"""
    created_by_username = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = PeriodStop
        fields = [
            'id', 'stop_index', 'created_by', 'created_by_username', 'created_at'
        ]
        read_only_fields = ['created_at', 'created_by']

    def get_created_by_username(self, obj):
        """Retourner le nom d'utilisateur ou None si created_by est null"""
        return obj.created_by.username if obj.created_by else None


class PeriodStopCreateSerializer(serializers.ModelSerializer):
    """Serializer pour créer des arrêts de compte"""

    class Meta:
        model = PeriodStop
        fields = ['stop_index']


class ArgentEntrySerializer(serializers.ModelSerializer):
    """Serializer pour les entrées d'argent (lecture)"""
    created_by_username = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = ArgentEntry
        fields = [
            'id',
            'date',
            'nom',
            'lieu_retrait',
            'somme',
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

    class Meta:
        model = ArgentEntry
        fields = ['id', 'date', 'nom', 'lieu_retrait', 'somme']

    def validate_somme(self, value):
        """La somme doit être positive ou nulle."""
        if value is None:
            raise serializers.ValidationError("La somme est obligatoire.")
        if value < 0:
            raise serializers.ValidationError("La somme ne peut pas être négative.")
        return value

