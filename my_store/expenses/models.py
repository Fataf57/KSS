from django.db import models
from account.models import User
from decimal import Decimal


class Depense(models.Model):
    """Modèle pour enregistrer les dépenses"""
    date = models.DateField(verbose_name="Date")
    nom_personne = models.CharField(
        max_length=255,
        blank=True,
        default="",
        verbose_name="Nom personne",
        help_text="Nom de la personne concernée"
    )
    nom_depense = models.CharField(max_length=255, verbose_name="Nom de la dépense")
    somme = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        verbose_name="Somme",
        help_text="Montant de la dépense"
    )
    notes = models.TextField(blank=True, verbose_name="Notes", help_text="Notes additionnelles (optionnel)")
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='depenses_created'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.nom_depense} - {self.date.strftime('%d/%m/%Y')} - {self.somme} FCFA"

    class Meta:
        verbose_name = "Dépense"
        verbose_name_plural = "Dépenses"
        ordering = ['-date', '-created_at']


class PeriodStop(models.Model):
    """Modèle pour stocker les arrêts de compte (coupures de périodes)"""
    stop_index = models.IntegerField(
        verbose_name="Index d'arrêt",
        help_text="Index de la dépense où s'arrête la période"
    )
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='period_stops_created'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Arrêt à l'index {self.stop_index}"

    class Meta:
        verbose_name = "Arrêt de compte"
        verbose_name_plural = "Arrêts de compte"
        ordering = ['stop_index']


class ArgentEntry(models.Model):
    """
    Entrée d'argent saisie par un agent et visible par le boss.
    Ce modèle permet de synchroniser les données entre tous les appareils
    (ordinateur, téléphone, etc.).
    """
    date = models.DateField(verbose_name="Date")
    nom = models.CharField(max_length=255, verbose_name="Nom")
    lieu_retrait = models.CharField(max_length=255, verbose_name="Lieu de retrait")
    somme = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        verbose_name="Somme",
        help_text="Montant de l'entrée d'argent"
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
        return f"{self.date.strftime('%d/%m/%Y')} - {self.nom} - {self.somme} FCFA"

    class Meta:
        verbose_name = "Entrée d'argent"
        verbose_name_plural = "Entrées d'argent"
        ordering = ['-date', '-created_at']
