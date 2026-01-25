from rest_framework import serializers
from .models import Customer, ClientChargement


class CustomerSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(read_only=True)
    nom_prenom = serializers.CharField(write_only=True, required=True, allow_blank=False)

    class Meta:
        model = Customer
        fields = [
            'id', 'first_name', 'last_name', 'full_name', 'nom_prenom', 'email',
            'phone', 'address', 'city', 'postal_code', 'country',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at', 'first_name', 'last_name']
        extra_kwargs = {
            'email': {'required': False, 'allow_blank': True, 'allow_null': True},
        }

    def validate_nom_prenom(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("Le nom et prénom sont requis.")
        return value.strip()

    def create(self, validated_data):
        nom_prenom = validated_data.pop('nom_prenom', None)
        if nom_prenom:
            # Diviser le nom et prénom (premier mot = prénom, reste = nom)
            parts = nom_prenom.strip().split(None, 1)
            if len(parts) >= 2:
                validated_data['first_name'] = parts[0]
                validated_data['last_name'] = parts[1]
            elif len(parts) == 1:
                validated_data['first_name'] = parts[0]
                validated_data['last_name'] = ''
        else:
            validated_data['first_name'] = ''
            validated_data['last_name'] = ''
        return super().create(validated_data)

    def update(self, instance, validated_data):
        nom_prenom = validated_data.pop('nom_prenom', None)
        if nom_prenom:
            # Diviser le nom et prénom (premier mot = prénom, reste = nom)
            parts = nom_prenom.strip().split(None, 1)
            if len(parts) >= 2:
                validated_data['first_name'] = parts[0]
                validated_data['last_name'] = parts[1]
            elif len(parts) == 1:
                validated_data['first_name'] = parts[0]
                validated_data['last_name'] = ''
        return super().update(instance, validated_data)


class CustomerListSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(read_only=True)

    class Meta:
        model = Customer
        fields = ['id', 'full_name', 'email', 'phone', 'city']


class ClientChargementSerializer(serializers.ModelSerializer):
    """Serializer pour les chargements clients"""
    client_name = serializers.CharField(source='client.full_name', read_only=True)
    statut_dette_display = serializers.SerializerMethodField()
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)

    class Meta:
        model = ClientChargement
        fields = [
            'id', 'date_chargement', 'client', 'client_name', 'type_operation', 'nom_produit', 'nombre_sacs',
            'poids', 'poids_sac_vide', 'tonnage', 'prix', 'somme_totale', 'avance', 'somme_restante',
            'statut_dette', 'statut_dette_display', 'notes',
            'created_by', 'created_by_username', 'created_at', 'updated_at'
        ]
        read_only_fields = ['tonnage', 'somme_totale', 'somme_restante', 'statut_dette', 'created_at', 'updated_at', 'created_by']

    def get_statut_dette_display(self, obj):
        statut = obj.statut_dette
        if statut == "client_doit":
            return "Client doit"
        elif statut == "on_doit":
            return "On doit au client"
        else:
            return "Solde"


class ClientChargementCreateSerializer(serializers.ModelSerializer):
    """Serializer pour créer des chargements clients"""
    
    class Meta:
        model = ClientChargement
        fields = [
            'date_chargement', 'client', 'type_operation', 'nom_produit', 'nombre_sacs', 'poids', 'poids_sac_vide', 'prix', 'somme_totale', 'avance', 'notes'
        ]
        extra_kwargs = {
            'somme_totale': {'required': False, 'allow_null': True},
        }

    def create(self, validated_data):
        # Les calculs seront faits automatiquement dans le modèle
        # Pour les lignes de règlement, on peut définir manuellement somme_totale
        return ClientChargement.objects.create(**validated_data)


class ClientChargementListSerializer(serializers.ModelSerializer):
    """Serializer pour la liste des chargements clients"""
    client_name = serializers.CharField(source='client.full_name', read_only=True)
    statut_dette_display = serializers.SerializerMethodField()

    class Meta:
        model = ClientChargement
        fields = [
            'id', 'date_chargement', 'client_name', 'type_operation', 'nom_produit', 'nombre_sacs',
            'poids', 'poids_sac_vide', 'tonnage', 'prix', 'somme_totale', 'avance', 'somme_restante',
            'statut_dette_display', 'created_at'
        ]

    def get_statut_dette_display(self, obj):
        statut = obj.statut_dette
        if statut == "client_doit":
            return "Client doit"
        elif statut == "on_doit":
            return "On doit au client"
        else:
            return "Solde"


