from django.db import models
from account.models import User
from decimal import Decimal
from django.core.exceptions import ValidationError


class StockEntry(models.Model):
    """Modèle pour les entrées et sorties de stock"""
    MAGASIN_CHOICES = [
        ('1', 'Djaradougou'),
        ('2', 'Ouezzin-ville'),
        ('3', 'Bamako'),
    ]
    
    TYPE_OPERATION_CHOICES = [
        ('entree', 'Entrée'),
        ('sortie', 'Sortie'),
    ]
    
    date = models.DateField(verbose_name="Date d'opération")
    type_operation = models.CharField(
        max_length=10,
        choices=TYPE_OPERATION_CHOICES,
        default='entree',
        verbose_name="Type d'opération"
    )
    nom_fournisseur = models.CharField(max_length=200, verbose_name="Nom du fournisseur/client", blank=True)
    type_denree = models.CharField(max_length=100, verbose_name="Type de denrée (Karité, Maïs, etc.)")
    nombre_sacs = models.IntegerField(verbose_name="Nombre de sacs", default=0)
    poids_par_sac = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        verbose_name="Poids par sac (kg)",
        default=Decimal('0.00')
    )
    tonnage_total = models.DecimalField(
        max_digits=12, 
        decimal_places=2, 
        verbose_name="Tonnage total (kg)",
        default=Decimal('0.00')
    )
    numero_magasin = models.CharField(
        max_length=20,
        choices=MAGASIN_CHOICES,
        verbose_name="Numéro du magasin",
        default='1'
    )
    notes = models.TextField(blank=True, verbose_name="Notes")
    created_by = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True, 
        related_name='stock_entries_created'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        # Calcul automatique du tonnage total
        self.tonnage_total = Decimal(self.nombre_sacs) * Decimal(self.poids_par_sac)
        super().save(*args, **kwargs)
    

    def __str__(self):
        operation = "Entrée" if self.type_operation == 'entree' else "Sortie"
        return f"{operation} #{self.id} - {self.type_denree} - {self.date.strftime('%d/%m/%Y')}"

    class Meta:
        verbose_name = "Entrée de stock"
        verbose_name_plural = "Entrées de stock"
        ordering = ['-date', '-created_at']


class CamionChargement(models.Model):
    """Modèle pour les chargements de camion"""
    date_chargement = models.DateField(verbose_name="Date du chargement")
    ville_depart = models.CharField(max_length=200, verbose_name="Ville de départ", blank=True)
    type_denree = models.CharField(max_length=100, verbose_name="Type de produits")
    nombre_sacs = models.IntegerField(verbose_name="Nombre de sacs", default=0)
    poids_par_sac = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        verbose_name="Poids de chaque sac (kg)",
        default=Decimal('0.00')
    )
    tonnage_total = models.DecimalField(
        max_digits=12, 
        decimal_places=2, 
        verbose_name="Tonnage (kg)",
        default=Decimal('0.00')
    )
    numero_camion = models.CharField(max_length=100, verbose_name="Numéro de camion", blank=True)
    numero_chauffeur = models.CharField(max_length=200, verbose_name="Numéro de chauffeur", blank=True)
    date_arrivee = models.DateField(verbose_name="Date d'arrivée", null=True, blank=True)
    poids_arrive = models.DecimalField(
        max_digits=12, 
        decimal_places=2, 
        verbose_name="Poids arrivé (kg)",
        null=True,
        blank=True,
        default=None
    )
    numero_magasin = models.CharField(
        max_length=20,
        choices=StockEntry.MAGASIN_CHOICES,
        verbose_name="Numéro du magasin",
        default='1'
    )
    destination = models.CharField(max_length=200, verbose_name="Destination", blank=True)
    chauffeur = models.CharField(max_length=200, verbose_name="Chauffeur", blank=True)  # Gardé pour compatibilité
    depenses = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        verbose_name="Dépenses encourues (FCFA)",
        default=Decimal('0.00'),
        null=True,
        blank=True
    )
    benefices = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        verbose_name="Bénéfices générés (FCFA)",
        default=Decimal('0.00'),
        null=True,
        blank=True
    )
    notes = models.TextField(blank=True, verbose_name="Notes")
    created_by = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True, 
        related_name='camion_chargements_created'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        # Calcul automatique du tonnage total
        self.tonnage_total = Decimal(self.nombre_sacs) * Decimal(self.poids_par_sac)
        super().save(*args, **kwargs)
    
    @property
    def poids_manquant(self):
        """Calcule le poids manquant (tonnage_total - poids_arrive)"""
        if self.poids_arrive is not None:
            return max(Decimal('0.00'), self.tonnage_total - self.poids_arrive)
        return None

    def __str__(self):
        return f"Chargement camion #{self.id} - {self.type_denree} - {self.date_chargement.strftime('%d/%m/%Y')}"

    class Meta:
        verbose_name = "Chargement de camion"
        verbose_name_plural = "Chargements de camion"
        ordering = ['-date_chargement', '-created_at']


class ChargementStockItem(models.Model):
    """Modèle pour lier un chargement de camion aux entrées de stock utilisées"""
    chargement = models.ForeignKey(
        CamionChargement,
        on_delete=models.CASCADE,
        related_name='stock_items'
    )
    stock_entry = models.ForeignKey(
        StockEntry,
        on_delete=models.CASCADE,
        related_name='chargements'
    )
    nombre_sacs_utilises = models.IntegerField(verbose_name="Nombre de sacs utilisés", default=0)
    
    def clean(self):
        # Vérifier que le nombre de sacs utilisés ne dépasse pas le stock disponible
        if self.nombre_sacs_utilises > self.stock_entry.nombre_sacs:
            raise ValidationError(
                f"Le nombre de sacs utilisés ({self.nombre_sacs_utilises}) "
                f"ne peut pas dépasser le stock disponible ({self.stock_entry.nombre_sacs})"
            )
    
    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"{self.chargement} - {self.stock_entry} ({self.nombre_sacs_utilises} sacs)"

    class Meta:
        verbose_name = "Article de stock pour chargement"
        verbose_name_plural = "Articles de stock pour chargement"
        unique_together = ['chargement', 'stock_entry']
