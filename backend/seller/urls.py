from django.urls import path

from .views import (
    SellerOrderItemView,
    SellerOrderListView,
    SellerProductListView,
    SellerSummaryView,
)

urlpatterns = [
    # GET /api/seller/products/?page=1&search=  the seller's own products
    path('products/', SellerProductListView.as_view(),
         name='seller-products'),
    # GET /api/seller/orders/?status=            what people bought from you
    path('orders/', SellerOrderListView.as_view(), name='seller-orders'),
    # PATCH /api/seller/orders/items/<id>/       {"status": "shipped"}
    path('orders/items/<int:pk>/', SellerOrderItemView.as_view(),
         name='seller-order-item'),
    # GET /api/seller/summary/                  the Overview tab, in one call
    path('summary/', SellerSummaryView.as_view(), name='seller-summary'),
]
