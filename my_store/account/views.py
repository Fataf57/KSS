from django.contrib.auth import authenticate
from django.db.models import Sum, Count, Q
from django.utils import timezone
from datetime import timedelta

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .models import User
from .serializers import UserSerializer


class LoginView(APIView):
    """
    API endpoint that accepts username/password and returns JWT tokens.
    """

    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')

        if not username or not password:
            return Response(
                {'detail': "Le nom d'utilisateur et le mot de passe sont requis."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = authenticate(request, username=username, password=password)
        if not user:
            return Response(
                {'detail': "Identifiants invalides."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        refresh = RefreshToken.for_user(user)
        return Response(
            {
                'refresh': str(refresh),
                'access': str(refresh.access_token),
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email if hasattr(user, 'email') else None,
                },
            }
        )


class ProfileView(APIView):
    """Return basic information about the currently authenticated user."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        return Response(
            {
                'id': user.id,
                'username': user.username,
                'email': user.email if hasattr(user, 'email') else None,
            }
        )


class DashboardStatsView(APIView):
    """Return dashboard statistics."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            from products.models import Product
            from orders.models import Order
            from customers.models import Customer

            # Total products
            total_products = Product.objects.count()
            active_products = Product.objects.filter(is_active=True).count()

            # Total orders
            total_orders = Order.objects.count()
            pending_orders = Order.objects.filter(status='pending').count()
            completed_orders = Order.objects.filter(status='delivered').count()

            # Total customers
            total_customers = Customer.objects.count()

            # Revenue
            total_revenue = Order.objects.filter(
                status__in=['delivered', 'shipped']
            ).aggregate(total=Sum('total_amount'))['total'] or 0

            # Recent orders (last 30 days)
            thirty_days_ago = timezone.now() - timedelta(days=30)
            recent_orders = Order.objects.filter(created_at__gte=thirty_days_ago).count()

            # Recent customers (last 30 days)
            recent_customers = Customer.objects.filter(created_at__gte=thirty_days_ago).count()

            # Low stock products
            low_stock_products = Product.objects.filter(stock__lt=10, is_active=True).count()

            return Response({
                'products': {
                    'total': total_products,
                    'active': active_products,
                    'low_stock': low_stock_products,
                },
                'orders': {
                    'total': total_orders,
                    'pending': pending_orders,
                    'completed': completed_orders,
                    'recent': recent_orders,
                },
                'customers': {
                    'total': total_customers,
                    'recent': recent_customers,
                },
                'revenue': {
                    'total': float(total_revenue),
                },
            })
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class UserListView(APIView):
    """
    Liste simple des utilisateurs pour configurer les accès aux tableaux privés.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        users = User.objects.all().order_by("username")
        serializer = UserSerializer(users, many=True)
        return Response(serializer.data)
