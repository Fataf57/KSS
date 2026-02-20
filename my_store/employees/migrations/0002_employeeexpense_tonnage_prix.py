from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("employees", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="employeeexpense",
            name="tonnage",
            field=models.DecimalField(
                verbose_name="Tonnage",
                max_digits=12,
                decimal_places=2,
                null=True,
                blank=True,
                default=None,
                help_text="Tonnage correspondant à la dépense (en kg).",
            ),
        ),
        migrations.AddField(
            model_name="employeeexpense",
            name="prix",
            field=models.DecimalField(
                verbose_name="Prix du jour",
                max_digits=12,
                decimal_places=2,
                null=True,
                blank=True,
                default=None,
                help_text="Prix unitaire du jour utilisé pour calculer la somme dépensée.",
            ),
        ),
    ]


