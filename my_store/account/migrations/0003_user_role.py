from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("account", "0002_user_email"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="role",
            field=models.CharField(
                choices=[("agent", "Agent"), ("boss", "Boss")],
                default="agent",
                max_length=20,
                help_text="Profil de l'utilisateur (agent ou boss).",
            ),
        ),
    ]


