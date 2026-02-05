from django.db import models
from decimal import Decimal
from account.models import User


class Employee(models.Model):
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    email = models.EmailField(blank=True, null=True)
    phone = models.CharField(max_length=20, blank=True)
    address = models.TextField(blank=True)
    city = models.CharField(max_length=100, blank=True)
    postal_code = models.CharField(max_length=20, blank=True)
    country = models.CharField(max_length=100, blank=True)
    # Gestion des tableaux privés par employé
    is_private = models.BooleanField(
        default=False,
        help_text="Si coché, le tableau de cet employé est visible uniquement par certains utilisateurs."
    )
    allowed_users = models.ManyToManyField(
        User,
        blank=True,
        related_name="employees_with_access",
        help_text="Utilisateurs autorisés à voir ce tableau lorsque celui-ci est privé."
    )
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="employees_created",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.first_name} {self.last_name}"

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"

    class Meta:
        ordering = ['-created_at']


class EmployeeExpense(models.Model):
    """Modèle pour suivre les remises et dépenses des employés"""
    date = models.DateField(verbose_name="Date")
    employee = models.ForeignKey(
        Employee, 
        on_delete=models.CASCADE, 
        related_name='expenses',
        verbose_name="Employé"
    )
    somme_remise = models.DecimalField(
        max_digits=12, 
        decimal_places=2, 
        verbose_name="Somme remise",
        default=Decimal('0.00')
    )
    nom_depense = models.CharField(
        max_length=200,
        verbose_name="Nom de la dépense",
        blank=True,
        null=True
    )
    somme_depense = models.DecimalField(
        max_digits=12, 
        decimal_places=2, 
        verbose_name="Somme dépensée",
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
        related_name='employee_expenses_created'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        # Calcul automatique de la somme restante de manière cumulative
        # Formule : somme_restante_précédente + somme_remise - somme_depense
        somme_remise = Decimal(self.somme_remise) if self.somme_remise is not None else Decimal('0.00')
        somme_depense = Decimal(self.somme_depense) if self.somme_depense is not None else Decimal('0.00')
        
        # Récupérer la somme restante de la ligne précédente (triée par date puis par ID)
        somme_restante_precedente = Decimal('0.00')
        
        # Récupérer la dernière ligne précédente pour cet employé (date <= date actuelle)
        if self.pk:  # Si l'objet existe déjà, exclure cette ligne
            derniere_ligne = EmployeeExpense.objects.filter(
                employee=self.employee,
                date__lte=self.date
            ).exclude(pk=self.pk).order_by('date', 'id').last()
        else:
            # Nouvel objet : récupérer la dernière ligne pour cet employé
            derniere_ligne = EmployeeExpense.objects.filter(
                employee=self.employee,
                date__lte=self.date
            ).order_by('date', 'id').last()
        
        if derniere_ligne and derniere_ligne.somme_restante is not None:
            somme_restante_precedente = Decimal(derniere_ligne.somme_restante)
        
        # Formule : somme_restante_précédente + somme_remise - somme_depense
        self.somme_restante = somme_restante_precedente + somme_remise - somme_depense
        
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Dépense {self.employee.full_name} - {self.date.strftime('%d/%m/%Y')}"

    class Meta:
        verbose_name = "Dépense employé"
        verbose_name_plural = "Dépenses employés"
        ordering = ['-date', '-created_at']

