from rest_framework import serializers
from .models import Order, OrderItem
from products.serializers import ProductSerializer
from customers.serializers import CustomerSerializer


class OrderItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    subtotal = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    price = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)

    class Meta:
        model = OrderItem
        fields = ['id', 'product', 'product_name', 'quantity', 'price', 'subtotal']


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    customer_name = serializers.CharField(source='customer.full_name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = Order
        fields = [
            'id', 'order_number', 'customer', 'customer_name', 'status',
            'status_display', 'total_amount', 'items', 'created_at',
            'updated_at', 'created_by'
        ]
        read_only_fields = ['order_number', 'total_amount', 'created_at', 'updated_at', 'created_by']


class OrderCreateSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True)

    class Meta:
        model = Order
        fields = ['customer', 'status', 'items']

    def create(self, validated_data):
        items_data = validated_data.pop('items')
        
        # Generate unique order number
        from django.utils import timezone
        import random
        timestamp = timezone.now().strftime('%Y%m%d%H%M%S')
        random_suffix = random.randint(1000, 9999)
        order_number = f"ORD-{timestamp}-{random_suffix}"
        
        # Ensure uniqueness
        while Order.objects.filter(order_number=order_number).exists():
            random_suffix = random.randint(1000, 9999)
            order_number = f"ORD-{timestamp}-{random_suffix}"
        
        validated_data['order_number'] = order_number
        order = Order.objects.create(**validated_data)
        
        # Create order items
        total = 0
        for item_data in items_data:
            product = item_data['product']
            quantity = item_data['quantity']
            price = item_data.get('price', product.price)  # Use product price if not provided
            
            OrderItem.objects.create(
                order=order,
                product=product,
                quantity=quantity,
                price=price
            )
            total += quantity * price
        
        order.total_amount = total
        order.save()
        
        return order


class OrderListSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source='customer.full_name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    items_count = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            'id', 'order_number', 'customer_name', 'status',
            'status_display', 'total_amount', 'items_count', 'created_at'
        ]

    def get_items_count(self, obj):
        return obj.items.count()


