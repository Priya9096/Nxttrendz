from django.shortcuts import get_object_or_404

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Cart, CartItem
from .serializers import (
    AddToCartSerializer,
    CartItemSerializer,
    CartSerializer,
    UpdateQuantitySerializer,
)


def get_cart(user):
    """A user has exactly one cart, and it is created the first time it is
    asked for. Every view below starts here, so nobody has to handle "this
    user has never had a cart".
    """
    cart, _ = Cart.objects.get_or_create(user=user)
    return cart


class CartView(APIView):
    """GET /api/cart/ — the whole cart of the logged-in user."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(CartSerializer(get_cart(request.user)).data)


class AddToCartView(APIView):
    """POST /api/cart/add/  {"product": 12, "quantity": 2}

    Returns the whole cart, not just the new row, so one call is enough to
    redraw the screen.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = AddToCartSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        product = serializer.validated_data['product']
        quantity = serializer.validated_data['quantity']

        cart = get_cart(request.user)
        item, created = CartItem.objects.get_or_create(
            cart=cart, product=product, defaults={'quantity': quantity},
        )
        if not created:
            # Already in the cart, so this is a top-up — not a second row for
            # the same product. The frontend does not have to check first.
            item.quantity += quantity
            item.save()

        return Response(
            CartSerializer(cart).data, status=status.HTTP_201_CREATED,
        )


class CartItemDetailView(APIView):
    """PATCH / DELETE /api/cart/items/<id>/ — one row of *your* cart."""

    permission_classes = [IsAuthenticated]

    def get_item(self, request, pk):
        # Scoped to the caller: the id in the URL can only ever reach a row
        # this user owns. Somebody else's item id gives 404, not their item.
        return get_object_or_404(CartItem, pk=pk, cart__user=request.user)

    def patch(self, request, pk):
        item = self.get_item(request, pk)
        serializer = UpdateQuantitySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        item.quantity = serializer.validated_data['quantity']
        item.save()
        return Response(CartItemSerializer(item).data)

    def delete(self, request, pk):
        self.get_item(request, pk).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
