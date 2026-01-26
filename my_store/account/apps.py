from django.apps import AppConfig
from django.db.models.signals import post_migrate


def create_superuser(sender, **kwargs):
    """Créer un superuser automatiquement si CREATE_SUPERUSER est activé"""
    from django.conf import settings
    from django.contrib.auth import get_user_model
    
    if getattr(settings, 'CREATE_SUPERUSER', False):
        User = get_user_model()
        username = getattr(settings, 'SUPERUSER_USERNAME', 'admin')
        email = getattr(settings, 'SUPERUSER_EMAIL', 'admin@example.com')
        password = getattr(settings, 'SUPERUSER_PASSWORD', 'admin123')
        
        if not User.objects.filter(username=username).exists():
            User.objects.create_superuser(
                username=username,
                email=email,
                password=password
            )
            print(f"✅ Superuser '{username}' créé automatiquement")


class AccountConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'account'
    
    def ready(self):
        # Connecter le signal pour créer le superuser après les migrations
        post_migrate.connect(create_superuser, sender=self)
