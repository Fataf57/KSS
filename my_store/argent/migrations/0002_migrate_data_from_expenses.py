# Generated migration to copy data from expenses.ArgentEntry to argent.ArgentEntry

from django.db import migrations


def migrate_data_forward(apps, schema_editor):
    """Copy data from expenses_argententry to argent_argententry"""
    # Get the old and new models
    OldArgentEntry = apps.get_model('expenses', 'ArgentEntry')
    NewArgentEntry = apps.get_model('argent', 'ArgentEntry')
    
    # Copy all data
    for old_entry in OldArgentEntry.objects.all():
        NewArgentEntry.objects.create(
            id=old_entry.id,
            date=old_entry.date,
            nom=old_entry.nom,
            nom_boss=old_entry.nom_boss,
            lieu_retrait=old_entry.lieu_retrait,
            somme=old_entry.somme,
            nom_sortie=old_entry.nom_sortie,
            date_sortie=old_entry.date_sortie,
            somme_sortie=old_entry.somme_sortie,
            created_by=old_entry.created_by,
            created_at=old_entry.created_at,
            updated_at=old_entry.updated_at,
        )


def migrate_data_backward(apps, schema_editor):
    """Copy data back from argent_argententry to expenses_argententry"""
    # This is a reverse migration - not typically needed but included for completeness
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('argent', '0001_initial'),
        ('expenses', '0011_alter_argententry_lieu_retrait_alter_argententry_nom_and_more'),
    ]

    operations = [
        migrations.RunPython(migrate_data_forward, migrate_data_backward),
    ]

