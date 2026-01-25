from django.db import models
from decimal import Decimal
from account.models import User


class Customer(models.Model):
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    email = models.EmailField(blank=True, null=True)
    phone = models.CharField(max_length=20, blank=True)
    address = models.TextField(blank=True)
    city = models.CharField(max_length=100, blank=True)
    postal_code = models.CharField(max_length=20, blank=True)
    country = models.CharField(max_length=100, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.first_name} {self.last_name}"

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"

    class Meta:
        ordering = ['-created_at']


class ClientChargement(models.Model):
    """Modèle pour suivre les chargements des clients"""
    TYPE_OPERATION_CHOICES = [
        ('produit', 'Produit'),
        ('avance', 'Avance'),
        ('reglement', 'Règlement'),
    ]
    
    date_chargement = models.DateField(verbose_name="Date du chargement")
    client = models.ForeignKey(
        Customer, 
        on_delete=models.CASCADE, 
        related_name='chargements',
        verbose_name="Client"
    )
    type_operation = models.CharField(
        max_length=20,
        choices=TYPE_OPERATION_CHOICES,
        default='produit',
        verbose_name="Type d'opération"
    )
    nom_produit = models.CharField(
        max_length=200,
        blank=True,
        default="",
        verbose_name="Nom du produit"
    )
    nombre_sacs = models.IntegerField(verbose_name="Nombre de sacs", null=True, blank=True, default=None)
    poids = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        verbose_name="Poids (kg)",
        null=True,
        blank=True,
        default=None
    )
    poids_sac_vide = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        verbose_name="Poids sac vide (kg)",
        null=True,
        blank=True,
        default=None,
        help_text="Poids d'un sac vide (généralement 0.5kg ou 1kg)"
    )
    tonnage = models.DecimalField(
        max_digits=12, 
        decimal_places=2, 
        verbose_name="Tonnage (kg)",
        null=True,
        blank=True,
        default=None
    )
    prix = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        verbose_name="Prix par kg",
        null=True,
        blank=True,
        default=None
    )
    somme_totale = models.DecimalField(
        max_digits=12, 
        decimal_places=2, 
        verbose_name="Somme totale",
        null=True,
        blank=True,
        default=None
    )
    avance = models.DecimalField(
        max_digits=12, 
        decimal_places=2, 
        verbose_name="Avance",
        default=Decimal('0.00')
    )
    somme_restante = models.DecimalField(
        max_digits=12, 
        decimal_places=2, 
        verbose_name="Somme restante",
        null=True,
        blank=True,
        default=None
    )
    notes = models.TextField(blank=True, verbose_name="Notes")
    created_by = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True, 
        related_name='client_chargements_created'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        # Calcul automatique du tonnage (nombre de sacs × poids) si les deux sont fournis
        if self.nombre_sacs is not None and self.poids is not None:
            tonnage_brut = Decimal(self.nombre_sacs) * Decimal(self.poids)
            
            # Soustraire le poids des sacs vides si fourni
            if self.poids_sac_vide is not None and self.poids_sac_vide > 0:
                poids_total_sacs_vides = Decimal(self.nombre_sacs) * Decimal(self.poids_sac_vide)
                self.tonnage = tonnage_brut - poids_total_sacs_vides
            else:
                self.tonnage = tonnage_brut
        else:
            self.tonnage = None
        
        # Calcul automatique de la somme totale (tonnage × prix) si les deux sont fournis
        # SAUF pour les lignes de règlement où on peut définir manuellement somme_totale
        if self.type_operation == 'reglement':
            # Pour les règlements, on garde la somme_totale telle quelle si elle est définie
            # Sinon, on la calcule normalement si tonnage et prix sont fournis
            if self.somme_totale is None and self.tonnage is not None and self.prix is not None:
                self.somme_totale = Decimal(self.tonnage) * Decimal(self.prix)
        else:
            # Pour les autres types, calculer normalement
            if self.tonnage is not None and self.prix is not None:
                self.somme_totale = Decimal(self.tonnage) * Decimal(self.prix)
            else:
                self.somme_totale = None
        
        # Calcul automatique de la somme restante (formule Excel: I2+G3-H3)
        # I2 = somme_restante précédente, G3 = somme_totale actuelle, H3 = avance actuelle
        somme_totale = Decimal(self.somme_totale) if self.somme_totale is not None else Decimal('0.00')
        avance = Decimal(self.avance) if self.avance is not None else Decimal('0.00')
        
        # Récupérer la somme restante de la ligne précédente
        # IMPORTANT : Les lignes de règlement doivent toujours être en bas
        # On trie d'abord par type_operation (règlements en dernier), puis par date et ID
        somme_restante_precedente = Decimal('0.00')
        
        # Récupérer la dernière ligne précédente pour ce client (date <= date actuelle)
        # Trier pour mettre les règlements en bas : type_operation != 'reglement' d'abord, puis date, puis ID
        if self.pk:  # Si l'objet existe déjà, exclure cette ligne
            queryset = ClientChargement.objects.filter(
                client=self.client,
                date_chargement__lte=self.date_chargement
            ).exclude(pk=self.pk)
        else:
            # Nouvel objet : récupérer la dernière ligne pour ce client
            queryset = ClientChargement.objects.filter(
                client=self.client,
                date_chargement__lte=self.date_chargement
            )
        
        # Trier : lignes normales d'abord (type != 'reglement'), puis règlements, puis par date et ID
        # Utiliser une expression Case pour forcer l'ordre : reglement = 1, autres = 0
        from django.db.models import Case, When, IntegerField
        derniere_ligne = queryset.annotate(
            type_order=Case(
                When(type_operation='reglement', then=1),
                default=0,
                output_field=IntegerField()
            )
        ).order_by('type_order', 'date_chargement', 'id').last()
        
        if derniere_ligne and derniere_ligne.somme_restante is not None:
            somme_restante_precedente = Decimal(derniere_ligne.somme_restante)
        
        # Formule : somme_restante_précédente + somme_totale - avance
        self.somme_restante = somme_restante_precedente + somme_totale - avance
        
        super().save(*args, **kwargs)

    @property
    def statut_dette(self):
        """Retourne le statut de la dette"""
        # Calculer la différence réelle (sans valeur absolue) pour déterminer qui doit
        somme_totale = Decimal(self.somme_totale) if self.somme_totale is not None else Decimal('0.00')
        avance = Decimal(self.avance) if self.avance is not None else Decimal('0.00')
        difference = somme_totale - avance
        
        if difference > 0:
            return "client_doit"  # Le client nous doit
        elif difference < 0:
            return "on_doit"  # On doit au client
        else:
            return "solde"  # Solde

    def __str__(self):
        return f"Chargement {self.client.full_name} - {self.date_chargement.strftime('%d/%m/%Y')}"

    class Meta:
        verbose_name = "Chargement client"
        verbose_name_plural = "Chargements clients"
        ordering = ['-date_chargement', '-created_at']

