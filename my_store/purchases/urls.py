from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AchatViewSet, EntreeAchatViewSet

router = DefaultRouter()
router.register(r'entrees-achat', EntreeAchatViewSet, basename='entree-achat')
router.register(r'achats', AchatViewSet, basename='achat')

urlpatterns = [
    path('', include(router.urls)),
]

