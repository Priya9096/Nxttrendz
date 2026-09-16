from rest_framework import serializers

from orders.models import OrderItem
from products.models import Product

# An item moves forward, one step at a time, and never backwards: a parcel that
# has been delivered cannot go back to "still to ship". Written down once, so
# the API, the serializer and the screen all agree on what may happen next.
NEXT_STATUS = {
    'placed': 'shipped',
    'shipped': 'delivered',
}


class SellerProductSerializer(serializers.ModelSerializer):
    """One row of the My Products table.

    Exactly the eight fields that table draws, and nothing else — the
    description and the review count belong to the details page, so they are
    not sent here.
    """

    # The model column is imageUrl (camelCase, from the very first session).
    # Every field the seller screens use is snake_case, so this is the one
    # place where the two names are introduced to each other.
    image_url = serializers.URLField(source='imageUrl', read_only=True)

    class Meta:
        model = Product
        fields = ['id', 'title', 'brand', 'category', 'rating', 'price',
                  'availability', 'image_url']


class SellerOrderItemSerializer(serializers.ModelSerializer):
    """One of *your* rows inside somebody else's order.

    An order can hold two sellers' products. This serializer is only ever fed
    the rows that belong to the caller, so a seller never sees what the same
    customer bought from a competitor.
    """

    subtotal = serializers.DecimalField(
        max_digits=12, decimal_places=2, read_only=True)
    # Whether this row may still be moved along, decided on the server.
    next_status = serializers.SerializerMethodField()

    class Meta:
        model = OrderItem
        fields = ['id', 'product', 'title', 'brand', 'image_url', 'price',
                  'quantity', 'subtotal', 'status', 'next_status']

    def get_next_status(self, item):
        return NEXT_STATUS.get(item.status)


class UpdateItemStatusSerializer(serializers.Serializer):
    """The body of PATCH /api/seller/orders/items/<id>/ — {"status": "shipped"}"""

    status = serializers.ChoiceField(choices=list(NEXT_STATUS.values()))
