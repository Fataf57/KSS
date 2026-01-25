from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import StockEntryViewSet, CamionChargementViewSet

router = DefaultRouter()
router.register(r'stock-entries', StockEntryViewSet, basename='stock-entry')
router.register(r'camion-chargements', CamionChargementViewSet, basename='camion-chargement')

urlpatterns = router.urls

