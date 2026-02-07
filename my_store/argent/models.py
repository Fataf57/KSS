from django.db import models
from account.models import User


class ArgentEntry(models.Model):
    """
    Entrée d'argent saisie par un agent et visible par le boss.
    Ce modèle permet de synchroniser les données entre tous les appareils
    (ordinateur, téléphone, etc.).
    """
    date = models.DateField(verbose_name="Date")
    nom_recuperant = models.CharField(
        max_length=255,
        blank=True,
        default="",
        verbose_name="Nom de Récupérant",
        help_text="Nom de la personne qui récupère"
    )
    nom_boss = models.CharField(
        max_length=255,
        blank=True,
        default="",
        verbose_name="Nom du boss",
        help_text="Nom du boss"
    )
    lieu_retrait = models.CharField(
        max_length=255,
        blank=True,
        default="",
        verbose_name="Lieu de retrait",
        help_text="Lieu où l'argent est retiré"
    )
    somme = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name="Somme",
        help_text="Montant de l'entrée d'argent"
    )
    nom_recevant = models.CharField(
        max_length=255,
        blank=True,
        default="",
        verbose_name="Nom de Recevant",
        help_text="Nom de la personne qui reçoit"
    )
    date_sortie = models.DateField(null=True, blank=True, verbose_name="Date sortie")
    somme_sortie = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name="Somme sortie",
        help_text="Montant de la sortie d'argent"
    )
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='argent_entries_created'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.date.strftime('%d/%m/%Y')} - {self.somme} FCFA"

    class Meta:
        verbose_name = "Entrée d'argent"
        verbose_name_plural = "Entrées d'argent"
        ordering = ['id']

