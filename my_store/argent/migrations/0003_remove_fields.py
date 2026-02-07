# Generated migration to remove columns: nom, nom_boss, lieu_retrait, nom_sortie

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('argent', '0002_migrate_data_from_expenses'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='argententry',
            name='nom',
        ),
        migrations.RemoveField(
            model_name='argententry',
            name='nom_boss',
        ),
        migrations.RemoveField(
            model_name='argententry',
            name='lieu_retrait',
        ),
        migrations.RemoveField(
            model_name='argententry',
            name='nom_sortie',
        ),
    ]

