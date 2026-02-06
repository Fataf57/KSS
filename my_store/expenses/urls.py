from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DepenseViewSet, PeriodStopViewSet, ArgentEntryViewSet

router = DefaultRouter()
router.register(r'depenses', DepenseViewSet, basename='depense')
router.register(r'period-stops', PeriodStopViewSet, basename='period-stop')
router.register(r'argent', ArgentEntryViewSet, basename='argent')

urlpatterns = [
    path('', include(router.urls)),
]

