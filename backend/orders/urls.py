from django.urls import path

from .views import CancelOrderView, OrderDetailView, OrderListCreateView

urlpatterns = [
    # GET  /api/orders/            all orders of the logged-in customer
    # POST /api/orders/            {"payment_method": "COD", "address": {...}}
    path('', OrderListCreateView.as_view(), name='order-list-create'),
    # GET  /api/orders/<id>/       one order, with items and address
    path('<int:pk>/', OrderDetailView.as_view(), name='order-detail'),
    # POST /api/orders/<id>/cancel/
    path('<int:pk>/cancel/', CancelOrderView.as_view(), name='order-cancel'),
]
