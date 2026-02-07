from django.db import models
from account.models import User


class TransiteurEntry(models.Model):
    """
    Entrée de transiteur avec les informations sur les camions, chauffeurs,
    villes de départ et d'arrivée, dépenses et argent donné.
    """
    date = models.DateField(verbose_name="Date")
    nom_produit = models.CharField(
        max_length=255,
        blank=True,
        default="",
        verbose_name="Nom produit",
        help_text="Nom du produit"
    )
    numero_camion = models.CharField(
        max_length=255,
        blank=True,
        default="",
        verbose_name="N° Camion",
        help_text="Numéro du camion"
    )
    numero_chauffeur = models.CharField(
        max_length=255,
        blank=True,
        default="",
        verbose_name="N° Chauffeur",
        help_text="Numéro du chauffeur"
    )
    ville_depart = models.CharField(
        max_length=255,
        blank=True,
        default="",
        verbose_name="Ville départ",
        help_text="Ville de départ"
    )
    ville_arrivant = models.CharField(
        max_length=255,
        blank=True,
        default="",
        verbose_name="Ville arrivant",
        help_text="Ville d'arrivée"
    )
    depenses = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name="Dépenses",
        help_text="Dépenses du camion"
    )
    argent_donne = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name="Argent donné",
        help_text="Argent donné au transitaire"
    )
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='transiteur_entries_created'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.date.strftime('%d/%m/%Y')} - {self.numero_camion} - {self.argent_donne or 0} FCFA"

    class Meta:
        verbose_name = "Entrée transiteur"
        verbose_name_plural = "Entrées transiteur"
        ordering = ['id']

