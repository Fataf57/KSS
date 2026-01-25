from django.urls import path

from . import views

app_name = 'account'

urlpatterns = [
    path('auth/login/', views.LoginView.as_view(), name='login'),
    path('account/profile/', views.ProfileView.as_view(), name='profile'),
    path('dashboard/stats/', views.DashboardStatsView.as_view(), name='dashboard-stats'),
]

