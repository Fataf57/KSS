from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('account', '0003_user_role'),
        ('expenses', '0005_alter_depense_nom_personne'),
    ]

    operations = [
        migrations.CreateModel(
            name='ArgentEntry',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('date', models.DateField(verbose_name='Date')),
                ('nom', models.CharField(max_length=255, verbose_name='Nom')),
                ('lieu_retrait', models.CharField(max_length=255, verbose_name='Lieu de retrait')),
                ('somme', models.DecimalField(decimal_places=2, help_text="Montant de l'entrée d'argent", max_digits=12, verbose_name='Somme')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('created_by', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='argent_entries_created', to='account.user')),
            ],
            options={
                'verbose_name': "Entrée d'argent",
                'verbose_name_plural': "Entrées d'argent",
                'ordering': ['-date', '-created_at'],
            },
        ),
    ]


