from rest_framework import serializers

from .models import Address, Order, OrderItem


class AddressSerializer(serializers.ModelSerializer):
    """The six boxes on the checkout form.

    The two rules below are checked here, not in React, so a bad value comes
    back as a 400 that names the field — which is exactly what the form needs
    to put the message under the right box.
    """

    phone = serializers.RegexField(
        r'^\d{10}$',
        error_messages={'invalid': 'Enter a 10-digit mobile number.'},
    )
    pincode = serializers.RegexField(
        r'^\d{6}$',
        error_messages={'invalid': 'Enter a 6-digit pincode.'},
    )

    class Meta:
        model = Address
        fields = ['full_name', 'phone', 'address', 'city', 'state', 'pincode']


class OrderItemSerializer(serializers.ModelSerializer):
    """One row of the Items card on the order page."""

    subtotal = serializers.DecimalField(
        max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = OrderItem
        fields = ['id', 'product', 'title', 'brand', 'image_url', 'price',
                  'quantity', 'subtotal', 'status']


class OrderDetailSerializer(serializers.ModelSerializer):
    """Everything the order page draws — in one answer.

    items, address and payment all arrive together, so the screen needs exactly
    one request and never has to stitch two responses into one view.
    """

    items = OrderItemSerializer(many=True, read_only=True)
    address = AddressSerializer(read_only=True)
    # Both of these are properties on the model. The rule behind can_cancel
    # lives on the server; React only reads the answer.
    can_cancel = serializers.BooleanField(read_only=True)
    item_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Order
        fields = ['id', 'placed_at', 'status', 'payment_method', 'is_paid',
                  'total', 'shipping', 'can_cancel', 'item_count', 'address',
                  'items']


class OrderListSerializer(serializers.ModelSerializer):
    """One card of My Orders.

    Deliberately smaller than the detail serializer: the list draws a number, a
    date, a status word, one picture and two amounts, so that is all it asks
    for.
    """

    item_count = serializers.IntegerField(read_only=True)
    thumbnail = serializers.CharField(read_only=True)

    class Meta:
        model = Order
        fields = ['id', 'placed_at', 'status', 'total', 'item_count',
                  'payment_method', 'is_paid', 'thumbnail']


class CreateOrderSerializer(serializers.Serializer):
    """The body of POST /api/orders/.

    Two keys, and neither of them is the cart: the server already has the cart
    and the prices. A browser that could send its own total could send its own
    discount too.
    """

    payment_method = serializers.ChoiceField(
        choices=[choice[0] for choice in Order.PAYMENT_CHOICES])
    address = AddressSerializer()
