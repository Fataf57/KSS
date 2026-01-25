from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CustomerViewSet, ClientChargementViewSet

router = DefaultRouter()
router.register(r'customers', CustomerViewSet, basename='customer')
router.register(r'client-chargements', ClientChargementViewSet, basename='client-chargement')

urlpatterns = [
    path('', include(router.urls)),
]

