from rest_framework import serializers
from .models import Employee, EmployeeExpense


class EmployeeSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(read_only=True)
    nom_prenom = serializers.CharField(write_only=True, required=True, allow_blank=False)

    class Meta:
        model = Employee
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


class EmployeeListSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(read_only=True)

    class Meta:
        model = Employee
        fields = ['id', 'full_name', 'email', 'phone', 'city']


class EmployeeExpenseSerializer(serializers.ModelSerializer):
    """Serializer pour les dépenses employés"""
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)

    class Meta:
        model = EmployeeExpense
        fields = [
            'id', 'date', 'employee', 'employee_name', 'somme_remise',
            'nom_depense', 'somme_depense', 'somme_restante', 'notes',
            'created_by', 'created_by_username', 'created_at', 'updated_at'
        ]
        read_only_fields = ['somme_restante', 'created_at', 'updated_at', 'created_by']


class EmployeeExpenseCreateSerializer(serializers.ModelSerializer):
    """Serializer pour créer des dépenses employés"""
    
    class Meta:
        model = EmployeeExpense
        fields = [
            'date', 'employee', 'somme_remise', 'nom_depense', 'somme_depense', 'notes'
        ]

    def create(self, validated_data):
        # Les calculs seront faits automatiquement dans le modèle
        return EmployeeExpense.objects.create(**validated_data)


class EmployeeExpenseListSerializer(serializers.ModelSerializer):
    """Serializer pour la liste des dépenses employés"""
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)

    class Meta:
        model = EmployeeExpense
        fields = [
            'id', 'date', 'employee_name', 'somme_remise',
            'nom_depense', 'somme_depense', 'somme_restante', 'created_at'
        ]

