from rest_framework import serializers
from .models import Invoice, InvoiceItem
from customers.serializers import CustomerSerializer


class InvoiceItemSerializer(serializers.ModelSerializer):
    subtotal = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = InvoiceItem
        fields = ['id', 'description', 'quantity', 'unit_price', 'subtotal']


class InvoiceSerializer(serializers.ModelSerializer):
    items = InvoiceItemSerializer(many=True, read_only=True)
    customer_name = serializers.CharField(source='customer.full_name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    order_number = serializers.CharField(source='order.order_number', read_only=True)

    class Meta:
        model = Invoice
        fields = [
            'id', 'invoice_number', 'customer', 'customer_name', 'order', 'order_number',
            'issue_date', 'due_date', 'status', 'status_display',
            'subtotal', 'tax_rate', 'tax_amount', 'total_amount',
            'notes', 'items', 'created_at', 'updated_at', 'created_by'
        ]
        read_only_fields = [
            'invoice_number', 'subtotal', 'tax_amount', 'total_amount',
            'created_at', 'updated_at', 'created_by'
        ]


class InvoiceCreateSerializer(serializers.ModelSerializer):
    items = InvoiceItemSerializer(many=True)

    class Meta:
        model = Invoice
        fields = [
            'customer', 'order', 'issue_date', 'due_date',
            'status', 'tax_rate', 'notes', 'items'
        ]

    def create(self, validated_data):
        items_data = validated_data.pop('items')
        invoice = Invoice.objects.create(**validated_data)
        
        # Generate invoice number
        import random
        from django.utils import timezone
        timestamp = timezone.now().strftime('%Y%m%d%H%M%S')
        random_suffix = random.randint(1000, 9999)
        invoice_number = f"INV-{timestamp}-{random_suffix}"
        
        # Ensure uniqueness
        while Invoice.objects.filter(invoice_number=invoice_number).exists():
            random_suffix = random.randint(1000, 9999)
            invoice_number = f"INV-{timestamp}-{random_suffix}"
        
        invoice.invoice_number = invoice_number
        
        # Create invoice items
        for item_data in items_data:
            InvoiceItem.objects.create(
                invoice=invoice,
                description=item_data['description'],
                quantity=item_data['quantity'],
                unit_price=item_data['unit_price']
            )
        
        invoice.calculate_totals()
        
        return invoice


class InvoiceListSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source='customer.full_name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = Invoice
        fields = [
            'id', 'invoice_number', 'customer_name', 'issue_date',
            'due_date', 'status', 'status_display', 'total_amount', 'created_at'
        ]


