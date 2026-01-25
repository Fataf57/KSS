from django.db import models
from decimal import Decimal
from account.models import User
from products.models import Product
from customers.models import Customer


class Sale(models.Model):
    """Modèle pour les ventes"""
    customer = models.ForeignKey(Customer, on_delete=models.SET_NULL, null=True, blank=True, related_name='sales')
    sale_date = models.DateTimeField(auto_now_add=True)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    payment_method = models.CharField(
        max_length=50,
        choices=[
            ('cash', 'Espèces'),
            ('card', 'Carte bancaire'),
            ('check', 'Chèque'),
            ('transfer', 'Virement'),
            ('other', 'Autre'),
        ],
        default='cash'
    )
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='sales_created')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Vente #{self.id} - {self.sale_date.strftime('%d/%m/%Y')}"

    def calculate_total(self):
        total = sum(item.subtotal for item in self.items.all())
        self.total_amount = total
        self.save()
        return total

    class Meta:
        ordering = ['-sale_date']


class SaleItem(models.Model):
    """Items d'une vente"""
    sale = models.ForeignKey(Sale, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    quantity = models.IntegerField(default=1)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)

    @property
    def subtotal(self):
        return self.quantity * self.unit_price

    def __str__(self):
        return f"{self.product.name} x {self.quantity}"

    class Meta:
        ordering = ['id']

