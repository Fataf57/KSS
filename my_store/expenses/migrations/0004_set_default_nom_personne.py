# Generated manually to fix existing data

from django.db import migrations


def set_default_nom_personne(apps, schema_editor):
    """Mettre à jour toutes les dépenses existantes pour avoir nom_personne='' si None"""
    Depense = apps.get_model('expenses', 'Depense')
    Depense.objects.filter(nom_personne__isnull=True).update(nom_personne='')
    # S'assurer aussi que les chaînes vides sont bien des chaînes vides
    Depense.objects.filter(nom_personne=None).update(nom_personne='')


def reverse_migration(apps, schema_editor):
    """Migration inverse - rien à faire"""
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('expenses', '0003_depense_nom_personne'),
    ]

    operations = [
        migrations.RunPython(set_default_nom_personne, reverse_migration),
    ]

