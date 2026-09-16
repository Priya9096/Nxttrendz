from django.conf import settings
from django.db import models


class Order(models.Model):
    """One checkout by one customer.

    Everything the order page and the My Orders list need is on this row or on
    one of its items — one read fills a whole screen.
    """

    # The same four words are used by the order, by every item inside it, and
    # by the dashboard. Writing them down once is what keeps them the same.
    STATUS_CHOICES = [
        ('placed', 'Placed'),
        ('shipped', 'Shipped'),
        ('delivered', 'Delivered'),
        ('cancelled', 'Cancelled'),
    ]

    PAYMENT_CHOICES = [
        ('COD', 'Cash on Delivery'),
        ('CARD', 'Credit / Debit Card'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='orders',
    )
    placed_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default='placed')
    payment_method = models.CharField(
        max_length=10, choices=PAYMENT_CHOICES, default='COD')
    is_paid = models.BooleanField(default=False)

    # The amount that was actually charged. It is stored, not worked out again
    # later, because a price change next month must not rewrite this order.
    total = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    shipping = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    class Meta:
        # Newest first — the order My Orders draws its cards in.
        ordering = ['-placed_at', '-id']

    def __str__(self):
        return f"Order #{self.id} by {self.user.username}"

    @property
    def item_count(self):
        return sum(item.quantity for item in self.items.all())

    @property
    def can_cancel(self):
        """The server decides this, never React.

        A customer may call an order off while it is still sitting with us. Once
        it has been handed over it is out of our hands.
        """
        return self.status == 'placed'

    @property
    def thumbnail(self):
        first_item = self.items.first()
        return first_item.image_url if first_item is not None else ''

    def sync_status_from_items(self):
        """Roll the items' statuses up into the order's own status.

        A seller marks *their* items shipped, and an order can hold items from
        more than one seller — so the order moves at the pace of the slowest
        one. This is the only place the order's status is worked out from its
        items, which is why the customer's badge can never disagree with the
        rows behind it.
        """
        live_statuses = set(
            self.items.exclude(status='cancelled').values_list(
                'status', flat=True)
        )

        if len(live_statuses) == 0:
            # Every item was cancelled, so the order is.
            self.status = 'cancelled'
        elif live_statuses == {'delivered'}:
            self.status = 'delivered'
            # Cash on delivery: the money arrived with the delivery.
            self.is_paid = True
        elif live_statuses <= {'shipped', 'delivered'}:
            self.status = 'shipped'
        else:
            self.status = 'placed'

        self.save()


class OrderItem(models.Model):
    """One product inside one order.

    `title`, `brand`, `image_url` and `price` are copied off the product at
    checkout time on purpose. If they were only looked up through the foreign
    key, editing a product would silently rewrite history, and deleting one
    would erase the row from an order that was already paid for.
    """

    order = models.ForeignKey(
        Order, on_delete=models.CASCADE, related_name='items')

    # SET_NULL, not CASCADE: a seller may delete a product from the shop, and
    # the orders it was already part of have to survive that.
    product = models.ForeignKey(
        'products.Product',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='order_items',
    )
    # Who sold it. Every number on the seller dashboard is counted off this
    # column, so it is stored instead of being reached through the product.
    seller = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='sold_items',
    )

    title = models.CharField(max_length=255)
    brand = models.CharField(max_length=255, blank=True, default='')
    image_url = models.URLField(blank=True, default='')
    price = models.DecimalField(max_digits=10, decimal_places=2)
    quantity = models.PositiveIntegerField(default=1)
    status = models.CharField(
        max_length=20, choices=Order.STATUS_CHOICES, default='placed')

    class Meta:
        ordering = ['id']

    def __str__(self):
        return f"{self.quantity} x {self.title}"

    @property
    def subtotal(self):
        return self.price * self.quantity


class Address(models.Model):
    """Where one order is going.

    One order, one address — so it hangs off the order and not off the user: a
    customer can send the next order somewhere else without changing this one.
    """

    order = models.OneToOneField(
        Order, on_delete=models.CASCADE, related_name='address')
    full_name = models.CharField(max_length=120)
    phone = models.CharField(max_length=15)
    address = models.CharField(max_length=255)
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100)
    pincode = models.CharField(max_length=10)

    def __str__(self):
        return f"{self.full_name}, {self.city}"
