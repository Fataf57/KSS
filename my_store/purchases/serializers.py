from rest_framework import serializers
from .models import Achat, EntreeAchat


class AchatSerializer(serializers.ModelSerializer):
    """Serializer pour les lignes d'achat"""
    created_by_username = serializers.SerializerMethodField(read_only=True)
    client_nom = serializers.SerializerMethodField(read_only=True)
    produit_nom = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Achat
        fields = [
            'id', 'entree', 'date', 'client', 'nom_client', 'produit', 'nom_produit',
            'quantite_kg', 'gros', 'unit', 'prix_unitaire', 'somme_totale',
            'notes', 'created_by', 'created_by_username', 'client_nom', 'produit_nom',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at', 'created_by', 'somme_totale']

    def get_created_by_username(self, obj):
        return obj.created_by.username if obj.created_by else None

    def get_client_nom(self, obj):
        return obj.client.full_name if obj.client else obj.nom_client

    def get_produit_nom(self, obj):
        return obj.produit.name if obj.produit else obj.nom_produit

    def validate_quantite_kg(self, value):
        if value <= 0:
            raise serializers.ValidationError("La quantité doit être positive.")
        return value

    def validate_prix_unitaire(self, value):
        if value < 0:
            raise serializers.ValidationError("Le prix unitaire ne peut pas être négatif.")
        return value


class AchatCreateSerializer(serializers.ModelSerializer):
    """Serializer pour créer des lignes d'achat"""

    class Meta:
        model = Achat
        fields = [
            'entree', 'date', 'client', 'nom_client', 'produit', 'nom_produit',
            'quantite_kg', 'gros', 'unit', 'prix_unitaire', 'notes'
        ]

    def validate_quantite_kg(self, value):
        if value <= 0:
            raise serializers.ValidationError("La quantité doit être positive.")
        return value

    def validate_prix_unitaire(self, value):
        if value < 0:
            raise serializers.ValidationError("Le prix unitaire ne peut pas être négatif.")
        return value

    def validate(self, data):
        if not data.get('produit') and not data.get('nom_produit'):
            raise serializers.ValidationError({
                'nom_produit': "Vous devez fournir soit un produit existant, soit un nom de produit."
            })
        return data


class AchatListSerializer(serializers.ModelSerializer):
    """Serializer pour la liste des lignes d'achat"""
    created_by_username = serializers.SerializerMethodField(read_only=True)
    client_nom = serializers.SerializerMethodField(read_only=True)
    produit_nom = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Achat
        fields = [
            'id', 'entree', 'date', 'client_nom', 'produit_nom',
            'quantite_kg', 'gros', 'unit', 'prix_unitaire', 'somme_totale',
            'created_by_username', 'created_at'
        ]

    def get_created_by_username(self, obj):
        return obj.created_by.username if obj.created_by else None

    def get_client_nom(self, obj):
        return obj.client.full_name if obj.client else obj.nom_client

    def get_produit_nom(self, obj):
        return obj.produit.name if obj.produit else obj.nom_produit


class EntreeAchatSerializer(serializers.ModelSerializer):
    """Serializer pour les entrées d'achat"""
    created_by_username = serializers.SerializerMethodField(read_only=True)
    client_nom = serializers.SerializerMethodField(read_only=True)
    montant_ht = serializers.ReadOnlyField()
    montant_net = serializers.ReadOnlyField()
    achats = AchatListSerializer(many=True, read_only=True)

    class Meta:
        model = EntreeAchat
        fields = [
            'id', 'numero_entree', 'date', 'client', 'nom_client', 'client_nom',
            'transport', 'autres_charges', 'avance', 'restant', 'paye', 'montant_ht', 'montant_net',
            'achats', 'created_by', 'created_by_username', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at', 'created_by', 'numero_entree', 'montant_ht', 'montant_net']

    def get_created_by_username(self, obj):
        return obj.created_by.username if obj.created_by else None

    def get_client_nom(self, obj):
        return obj.client.full_name if obj.client else obj.nom_client


class EntreeAchatCreateSerializer(serializers.ModelSerializer):
    """Serializer pour créer des entrées d'achat avec leurs lignes"""
    achats = AchatCreateSerializer(many=True, required=False)

    class Meta:
        model = EntreeAchat
        fields = [
            'numero_entree', 'date', 'client', 'nom_client', 'transport', 'autres_charges', 'avance', 'restant', 'paye', 'achats'
        ]

    def validate(self, data):
        if not data.get('client') and not data.get('nom_client'):
            raise serializers.ValidationError({
                'nom_client': "Vous devez fournir soit un client existant, soit un nom de client."
            })
        # Convertir les chaînes vides de numero_entree en None pour que le modèle génère automatiquement
        if 'numero_entree' in data and data['numero_entree'] and not data['numero_entree'].strip():
            data['numero_entree'] = None
        return data

    def create(self, validated_data):
        achats_data = validated_data.pop('achats', [])
        entree = EntreeAchat.objects.create(**validated_data)
        
        for achat_data in achats_data:
            achat_data['entree'] = entree
            achat_data['date'] = entree.date
            if not achat_data.get('client') and not achat_data.get('nom_client'):
                achat_data['client'] = entree.client
                achat_data['nom_client'] = entree.nom_client
            Achat.objects.create(**achat_data)
        
        return entree


class EntreeAchatListSerializer(serializers.ModelSerializer):
    """Serializer pour la liste des entrées d'achat"""
    created_by_username = serializers.SerializerMethodField(read_only=True)
    client_nom = serializers.SerializerMethodField(read_only=True)
    montant_ht = serializers.ReadOnlyField()
    montant_net = serializers.ReadOnlyField()
    achats = AchatListSerializer(many=True, read_only=True)

    class Meta:
        model = EntreeAchat
        fields = [
            'id', 'numero_entree', 'date', 'client_nom',
            'transport', 'autres_charges', 'avance', 'restant', 'paye', 'montant_ht', 'montant_net',
            'achats', 'created_by_username', 'created_at'
        ]

    def get_created_by_username(self, obj):
        return obj.created_by.username if obj.created_by else None

    def get_client_nom(self, obj):
        return obj.client.full_name if obj.client else obj.nom_client
