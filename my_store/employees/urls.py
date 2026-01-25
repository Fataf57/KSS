from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import EmployeeViewSet, EmployeeExpenseViewSet

router = DefaultRouter()
router.register(r'employees', EmployeeViewSet, basename='employee')
router.register(r'employee-expenses', EmployeeExpenseViewSet, basename='employee-expense')

urlpatterns = [
    path('', include(router.urls)),
]

