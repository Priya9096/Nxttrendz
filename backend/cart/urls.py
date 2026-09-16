from django.urls import path

from .views import AddToCartView, CartItemDetailView, CartView

urlpatterns = [
    # GET     /api/cart/                 the whole cart
    path('', CartView.as_view(), name='cart'),
    # POST    /api/cart/add/             {"product": 12, "quantity": 2}
    path('add/', AddToCartView.as_view(), name='cart-add'),
    # PATCH   /api/cart/items/<id>/      {"quantity": 3}
    # DELETE  /api/cart/items/<id>/
    path('items/<int:pk>/', CartItemDetailView.as_view(), name='cart-item'),
]
