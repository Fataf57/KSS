from django.db import models
from decimal import Decimal
from account.models import User
from customers.models import Customer
from products.models import Product


class EntreeAchat(models.Model):
    """Modèle pour regrouper les achats par entrée"""
    numero_entree = models.CharField(
        max_length=50,
        unique=True,
        null=True,
        blank=True,
        verbose_name="Numéro d'entrée",
        help_text="Numéro unique de l'entrée (généré automatiquement si non fourni)"
    )
    date = models.DateField(verbose_name="Date")
    client = models.ForeignKey(
        Customer,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='entrees_achat',
        verbose_name="Client"
    )
    nom_client = models.CharField(
        max_length=255,
        verbose_name="Nom du client",
        help_text="Nom du client (si non enregistré)"
    )
    transport = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        verbose_name="Transport",
        help_text="Coûts de transport"
    )
    autres_charges = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        verbose_name="Autres charges",
        help_text="Autres charges additionnelles"
    )
    avance = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        verbose_name="Avance",
        help_text="Avance payée"
    )
    restant = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        verbose_name="Restant",
        help_text="Montant restant à ajouter"
    )
    paye = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        verbose_name="Somme payée",
        help_text="Montant déjà payé"
    )
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='entrees_achat_created'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        # Générer automatiquement le numéro d'entrée si non fourni ou vide
        if not self.numero_entree or not self.numero_entree.strip():
            # Numérotation séquentielle simple commençant à 1
            last_entree = EntreeAchat.objects.exclude(
                numero_entree__isnull=True
            ).exclude(
                numero_entree=''
            ).order_by('-id').first()
            
            if last_entree and last_entree.numero_entree:
                try:
                    # Essayer de convertir le numéro en entier
                    last_num = int(last_entree.numero_entree)
                    next_num = last_num + 1
                except (ValueError, TypeError):
                    # Si le numéro n'est pas un entier, chercher le plus grand numéro entier
                    all_numbers = []
                    for entree in EntreeAchat.objects.exclude(numero_entree__isnull=True).exclude(numero_entree=''):
                        try:
                            all_numbers.append(int(entree.numero_entree))
                        except (ValueError, TypeError):
                            continue
                    if all_numbers:
                        next_num = max(all_numbers) + 1
                    else:
                        next_num = 1
            else:
                next_num = 1
            
            # Formater avec des zéros devant (001, 002, ...) jusqu'à 999, puis sans zéros (1000, 1001, ...)
            if next_num <= 999:
                self.numero_entree = f"{next_num:03d}"  # Format 001, 002, ..., 999
            else:
                self.numero_entree = str(next_num)  # Format 1000, 1001, ... sans zéros
        
        super().save(*args, **kwargs)

    @property
    def montant_ht(self):
        """Montant Hors Taxe (somme de tous les montants des lignes d'achat)"""
        return sum(achat.somme_totale for achat in self.achats.all() if achat.somme_totale)

    @property
    def montant_net(self):
        """Montant Net (HT - Autres charges - Avance + Restant)"""
        ht = self.montant_ht
        autres_charges = Decimal(self.autres_charges) if self.autres_charges else Decimal('0.00')
        avance = Decimal(self.avance) if self.avance else Decimal('0.00')
        restant = Decimal(self.restant) if self.restant else Decimal('0.00')
        return ht - autres_charges - avance + restant

    def __str__(self):
        client_nom = self.client.full_name if self.client else self.nom_client
        return f"Entrée {self.numero_entree} - {client_nom} - {self.date.strftime('%d/%m/%Y')}"

    class Meta:
        verbose_name = "Entrée d'achat"
        verbose_name_plural = "Entrées d'achat"
        ordering = ['-date', '-created_at']


class Achat(models.Model):
    """Modèle pour enregistrer les lignes d'achat (produits)"""
    entree = models.ForeignKey(
        EntreeAchat,
        on_delete=models.CASCADE,
        related_name='achats',
        verbose_name="Entrée d'achat",
        null=True,
        blank=True
    )
    date = models.DateField(verbose_name="Date")
    client = models.ForeignKey(
        Customer,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='achats',
        verbose_name="Client"
    )
    nom_client = models.CharField(
        max_length=255,
        blank=True,
        verbose_name="Nom du client",
        help_text="Nom du client (si non enregistré)"
    )
    produit = models.ForeignKey(
        Product,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='achats',
        verbose_name="Produit"
    )
    nom_produit = models.CharField(
        max_length=255,
        verbose_name="Nom du produit",
        help_text="Nom du produit (si non enregistré)"
    )
    quantite_kg = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        verbose_name="Quantité (kg)",
        help_text="Quantité en kilogrammes"
    )
    prix_unitaire = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        verbose_name="Prix unitaire (FCFA/kg)",
        help_text="Prix par kilogramme"
    )
    somme_totale = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        verbose_name="Somme totale",
        help_text="Quantité × Prix unitaire"
    )
    gros = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        verbose_name="Gros",
        help_text="Quantité en gros"
    )
    unit = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        verbose_name="Unit",
        help_text="Quantité en unités"
    )
    notes = models.TextField(blank=True, verbose_name="Notes", help_text="Notes additionnelles (optionnel)")
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='achats_created'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        # Calcul automatique de la somme totale (quantité × prix unitaire)
        if self.quantite_kg is not None and self.prix_unitaire is not None:
            self.somme_totale = Decimal(self.quantite_kg) * Decimal(self.prix_unitaire)
        else:
            self.somme_totale = Decimal('0.00')
        
        # Si l'achat est lié à une entrée, mettre à jour les infos de l'entrée
        if self.entree:
            if not self.date:
                self.date = self.entree.date
            if not self.client and not self.nom_client:
                self.client = self.entree.client
                self.nom_client = self.entree.nom_client
        
        super().save(*args, **kwargs)

    def __str__(self):
        client_nom = self.client.full_name if self.client else self.nom_client
        produit_nom = self.produit.name if self.produit else self.nom_produit
        return f"Achat {client_nom} - {produit_nom} - {self.date.strftime('%d/%m/%Y')}"

    class Meta:
        verbose_name = "Achat"
        verbose_name_plural = "Achats"
        ordering = ['-date', '-created_at']
