from rest_framework import serializers
from .models import Sale, SaleItem
from products.serializers import ProductSerializer
from customers.serializers import CustomerSerializer


class SaleItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    subtotal = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = SaleItem
        fields = ['id', 'product', 'product_name', 'quantity', 'unit_price', 'subtotal']


class SaleSerializer(serializers.ModelSerializer):
    items = SaleItemSerializer(many=True, read_only=True)
    customer_name = serializers.CharField(source='customer.full_name', read_only=True)
    payment_method_display = serializers.CharField(source='get_payment_method_display', read_only=True)

    class Meta:
        model = Sale
        fields = [
            'id', 'customer', 'customer_name', 'sale_date', 'total_amount',
            'payment_method', 'payment_method_display', 'notes', 'items',
            'created_at', 'updated_at', 'created_by'
        ]
        read_only_fields = ['total_amount', 'created_at', 'updated_at', 'created_by']


class SaleCreateSerializer(serializers.ModelSerializer):
    items = SaleItemSerializer(many=True)

    class Meta:
        model = Sale
        fields = ['customer', 'payment_method', 'notes', 'items']

    def create(self, validated_data):
        items_data = validated_data.pop('items')
        sale = Sale.objects.create(**validated_data)
        
        # Create sale items
        total = 0
        for item_data in items_data:
            product = item_data['product']
            quantity = item_data['quantity']
            unit_price = item_data.get('unit_price', product.price)
            
            SaleItem.objects.create(
                sale=sale,
                product=product,
                quantity=quantity,
                unit_price=unit_price
            )
            total += quantity * unit_price
        
        sale.total_amount = total
        sale.save()
        
        return sale


class SaleListSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source='customer.full_name', read_only=True)
    payment_method_display = serializers.CharField(source='get_payment_method_display', read_only=True)
    items_count = serializers.SerializerMethodField()

    class Meta:
        model = Sale
        fields = [
            'id', 'customer_name', 'sale_date', 'total_amount',
            'payment_method', 'payment_method_display', 'items_count', 'created_at'
        ]

    def get_items_count(self, obj):
        return obj.items.count()


