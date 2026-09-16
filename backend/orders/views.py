from decimal import Decimal

from django.db import transaction
from django.shortcuts import get_object_or_404

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from cart.views import get_cart

from .models import Address, Order, OrderItem
from .serializers import (
    CreateOrderSerializer,
    OrderDetailSerializer,
    OrderListSerializer,
)


class OrderListCreateView(APIView):
    """GET  /api/orders/   every order of the logged-in customer, newest first
    POST /api/orders/   turn the cart into one order
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Scoped to the caller. A customer must only ever see their own orders,
        # and that is decided here — not by which URL React asks for.
        orders = (
            Order.objects
            .filter(user=request.user)
            .prefetch_related('items')
        )
        data = OrderListSerializer(orders, many=True).data
        return Response({'count': len(data), 'results': data})

    # All of it or none of it. Half an order — a row with no items, or items
    # with no address — is worse than a 400.
    @transaction.atomic
    def post(self, request):
        serializer = CreateOrderSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        cart = get_cart(request.user)
        cart_items = list(cart.items.select_related('product'))
        if len(cart_items) == 0:
            return Response(
                {'detail': 'Your cart is empty.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        payment_method = serializer.validated_data['payment_method']
        order = Order.objects.create(
            user=request.user,
            payment_method=payment_method,
            # A card is charged at once; cash is collected at the door.
            is_paid=payment_method == 'CARD',
            shipping=Decimal('0.00'),
        )
        Address.objects.create(
            order=order, **serializer.validated_data['address'])

        total = Decimal('0.00')
        for cart_item in cart_items:
            product = cart_item.product
            # The price is copied, not linked. This order keeps the amount the
            # customer agreed to, whatever happens to the product later.
            OrderItem.objects.create(
                order=order,
                product=product,
                seller=product.seller,
                title=product.title,
                brand=product.brand,
                image_url=product.imageUrl,
                price=product.price,
                quantity=cart_item.quantity,
            )
            total += product.price * cart_item.quantity

        order.total = total + order.shipping
        order.save()

        # The cart has become an order, so it is empty now. Doing it here means
        # the same items can never be bought twice, even if the browser closes
        # before it gets a chance to tidy up.
        cart.items.all().delete()

        return Response(
            OrderDetailSerializer(order).data,
            status=status.HTTP_201_CREATED,
        )


class OrderDetailView(APIView):
    """GET /api/orders/<id>/ — one order of the logged-in customer."""

    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        # pk=..., user=request.user — somebody else's order id gives 404, not
        # their order.
        order = get_object_or_404(Order, pk=pk, user=request.user)
        return Response(OrderDetailSerializer(order).data)


class CancelOrderView(APIView):
    """POST /api/orders/<id>/cancel/ — call off an order that is still ours."""

    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        order = get_object_or_404(Order, pk=pk, user=request.user)

        # The same rule the response advertises as can_cancel. The button being
        # hidden in React is a courtesy; this line is the actual lock.
        if not order.can_cancel:
            return Response(
                {'detail': 'This order can no longer be cancelled.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        order.status = 'cancelled'
        order.save()
        # The items go with it, so the seller dashboard stops counting them as
        # revenue and as something still to ship.
        order.items.update(status='cancelled')

        return Response(OrderDetailSerializer(order).data)
