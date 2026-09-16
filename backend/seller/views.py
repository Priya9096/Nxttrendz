from datetime import timedelta
from decimal import Decimal

from django.db.models import Count, DecimalField, F, Sum
from django.db.models.functions import TruncDate
from django.shortcuts import get_object_or_404
from django.utils import timezone

from rest_framework import filters, status as http_status
from rest_framework.generics import ListAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from orders.models import Order, OrderItem
from products.models import Product

from .pagination import SellerProductPagination
from .serializers import (
    NEXT_STATUS,
    SellerOrderItemSerializer,
    SellerProductSerializer,
    UpdateItemStatusSerializer,
)

# The whole dashboard is one endpoint, and this is the sum it is built on:
# price × quantity, added up. Written once, used by every number below.
ITEM_REVENUE = Sum(
    F('price') * F('quantity'),
    output_field=DecimalField(max_digits=12, decimal_places=2),
)


def money(value):
    """Money leaves this API as a string with two decimals — "22490.00".

    The same shape DRF gives a DecimalField, so React can treat every amount in
    the app the same way.
    """
    return str(Decimal(value or 0).quantize(Decimal('0.01')))


class SellerProductListView(ListAPIView):
    """GET /api/seller/products/?page=1&search=watch

    The seller's own products. Which products those are is decided here, from
    the token — never from a query parameter the browser could change.
    """

    serializer_class = SellerProductSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = SellerProductPagination

    # ?search= is the same server-side search the shop already uses. The
    # browser never filters the list it was given; it asks a better question.
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['title', 'brand']
    ordering_fields = ['price', 'rating', 'title', 'id']

    def get_queryset(self):
        # order_by is not decoration: without a stable order, page 2 can hand
        # back a row that was already on page 1.
        return Product.objects.filter(seller=self.request.user).order_by('id')


class SellerSummaryView(APIView):
    """GET /api/seller/summary/ — every number on the Overview tab.

    One request fills four cards, a seven-bar chart and two panels. React adds
    nothing up; it prints what arrives.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        seller = request.user

        # Every item this seller has ever sold...
        items = OrderItem.objects.filter(seller=seller)
        # ...minus the cancelled ones, which are not revenue and not work.
        live_items = items.exclude(status='cancelled')

        revenue = live_items.aggregate(value=ITEM_REVENUE)['value']
        units_sold = live_items.aggregate(value=Sum('quantity'))['value'] or 0
        # Count the *orders* the items sit in, not the items: one order holding
        # three of your products is still one order.
        orders_count = live_items.values('order').distinct().count()
        products_count = Product.objects.filter(seller=seller).count()
        awaiting_shipment = live_items.filter(status='placed').count()

        return Response({
            'revenue': money(revenue),
            'orders': orders_count,
            'units_sold': units_sold,
            'products': products_count,
            'awaiting_shipment': awaiting_shipment,
            'last_7_days': self.last_7_days(live_items),
            'by_status': self.by_status(items),
            'top_products': self.top_products(live_items),
        })

    def last_7_days(self, live_items):
        """Seven entries, today last — including the days nothing sold.

        The empty days are in the answer on purpose. A chart that only receives
        the days with sales cannot draw a gap; it draws a lie.
        """
        today = timezone.localdate()
        first_day = today - timedelta(days=6)

        rows = (
            live_items
            .filter(order__placed_at__date__gte=first_day)
            .annotate(day=TruncDate('order__placed_at'))
            .values('day')
            .annotate(revenue=ITEM_REVENUE)
        )
        revenue_by_day = {row['day']: row['revenue'] for row in rows}

        days = []
        for offset in range(6, -1, -1):
            day = today - timedelta(days=offset)
            days.append({
                'date': day.isoformat(),
                'label': day.strftime('%a'),
                'revenue': money(revenue_by_day.get(day)),
            })
        return days

    def by_status(self, items):
        """How many of your items are placed, shipped, delivered, cancelled.

        Counted off all the items, cancelled ones included — this panel is the
        one place that has to show them.
        """
        counts = {status: 0 for status, _ in Order.STATUS_CHOICES}
        rows = items.values('status').annotate(total=Count('id'))
        for row in rows:
            counts[row['status']] = row['total']
        return counts

    def top_products(self, live_items):
        """Your best sellers, most units first.

        Grouped by title as well as by product id, so a product that has since
        been deleted still has a name to show.
        """
        rows = (
            live_items
            .values('product', 'title')
            .annotate(units=Sum('quantity'), revenue=ITEM_REVENUE)
            .order_by('-units', '-revenue')[:5]
        )
        return [
            {
                'product_id': row['product'],
                'title': row['title'],
                'units': row['units'],
                'revenue': money(row['revenue']),
            }
            for row in rows
        ]


class SellerOrderListView(APIView):
    """GET /api/seller/orders/?status=placed — the orders that hold your products.

    This is the seller's side of the shop, and it is not the same list as
    GET /api/orders/:

        GET /api/orders/          what *I* bought
        GET /api/seller/orders/   what somebody bought *from me*

    One entry per order, newest first, carrying only the rows that are yours —
    plus the buyer and the address, because those are what a parcel needs.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        items = (
            OrderItem.objects
            .filter(seller=request.user)
            .select_related('order', 'order__user')
            .order_by('-order__placed_at', '-order_id', 'id')
        )

        # ?status=placed is how the "still to ship" strip on the Overview tab
        # opens this screen already filtered.
        wanted_status = request.query_params.get('status', '')
        if wanted_status in dict(Order.STATUS_CHOICES):
            items = items.filter(status=wanted_status)

        # Group the rows by the order they arrived in. The queryset is already
        # sorted, so one pass is enough — no second query per order.
        orders = []
        rows_by_order = {}
        for item in items:
            order = item.order
            if order.id not in rows_by_order:
                rows_by_order[order.id] = []
                orders.append(order)
            rows_by_order[order.id].append(item)

        results = []
        for order in orders:
            order_items = rows_by_order[order.id]
            results.append({
                'order_id': order.id,
                'placed_at': order.placed_at,
                'status': order.status,
                'payment_method': order.payment_method,
                'is_paid': order.is_paid,
                'buyer': order.user.username,
                'ship_to': self.ship_to(order),
                # What this order is worth *to you* — not the order total,
                # which may include another seller's products.
                'your_total': money(
                    sum(row.subtotal for row in order_items)),
                'your_items': SellerOrderItemSerializer(
                    order_items, many=True).data,
            })

        return Response({'count': len(results), 'results': results})

    def ship_to(self, order):
        address = getattr(order, 'address', None)
        if address is None:
            return None
        return {
            'full_name': address.full_name,
            'phone': address.phone,
            'address': address.address,
            'city': address.city,
            'state': address.state,
            'pincode': address.pincode,
        }


class SellerOrderItemView(APIView):
    """PATCH /api/seller/orders/items/<id>/  {"status": "shipped"}

    How "1 item waiting to be shipped" ever becomes zero. A seller moves their
    own rows forward; the order's own status follows, so the customer's badge
    changes at the same moment.
    """

    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        # seller=request.user is the lock: another seller's item id gives a
        # 404, not their item.
        item = get_object_or_404(OrderItem, pk=pk, seller=request.user)

        serializer = UpdateItemStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        new_status = serializer.validated_data['status']

        # One step forward, and only from where the row actually is. A
        # cancelled row has no next step at all.
        if NEXT_STATUS.get(item.status) != new_status:
            return Response(
                {'detail': f'An item that is {item.status} cannot become '
                           f'{new_status}.'},
                status=http_status.HTTP_400_BAD_REQUEST,
            )

        item.status = new_status
        item.save()
        # The order moves at the pace of its slowest item.
        item.order.sync_status_from_items()

        return Response(SellerOrderItemSerializer(item).data)
