from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ArgentEntryViewSet

router = DefaultRouter()
router.register(r'argent', ArgentEntryViewSet, basename='argent')

urlpatterns = [
    path('', include(router.urls)),
]

