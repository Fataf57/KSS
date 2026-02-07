from rest_framework import serializers
from .models import TransiteurEntry


class TransiteurEntrySerializer(serializers.ModelSerializer):
    """Serializer pour les entrées transiteur (lecture)"""
    created_by_username = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = TransiteurEntry
        fields = [
            'id',
            'date',
            'nom_produit',
            'numero_camion',
            'numero_chauffeur',
            'ville_depart',
            'ville_arrivant',
            'depenses',
            'argent_donne',
            'created_by',
            'created_by_username',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at', 'created_by', 'created_by_username']

    def get_created_by_username(self, obj):
        return obj.created_by.username if obj.created_by else None


class TransiteurEntryCreateSerializer(serializers.ModelSerializer):
    """Serializer pour créer des entrées transiteur"""
    
    depenses = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, allow_null=True)
    argent_donne = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, allow_null=True)
    date = serializers.DateField(required=True)
    nom_produit = serializers.CharField(required=False, allow_blank=True, default="")
    numero_camion = serializers.CharField(required=False, allow_blank=True, default="")
    numero_chauffeur = serializers.CharField(required=False, allow_blank=True, default="")
    ville_depart = serializers.CharField(required=False, allow_blank=True, default="")
    ville_arrivant = serializers.CharField(required=False, allow_blank=True, default="")

    class Meta:
        model = TransiteurEntry
        fields = [
            'id',
            'date',
            'nom_produit',
            'numero_camion',
            'numero_chauffeur',
            'ville_depart',
            'ville_arrivant',
            'depenses',
            'argent_donne'
        ]

    def validate_depenses(self, value):
        """Les dépenses doivent être positives ou nulles."""
        if value is not None and value < 0:
            raise serializers.ValidationError("Les dépenses ne peuvent pas être négatives.")
        return value

    def validate_argent_donne(self, value):
        """L'argent donné doit être positif ou nul."""
        if value is not None and value < 0:
            raise serializers.ValidationError("L'argent donné ne peut pas être négatif.")
        return value

    def validate(self, data):
        """Validation optionnelle - les dépenses et l'argent donné sont optionnels."""
        return data

