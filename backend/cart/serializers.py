from rest_framework import serializers

from products.models import Product

from .models import Cart, CartItem


class CartItemSerializer(serializers.ModelSerializer):
    """One row of the cart.

    Two ids leave this serializer and they are not the same thing:

      id       the CartItem's own id — the row. PATCH and DELETE address this.
      product  the Product's id — the thing. "Add to cart" sends this.

    The read-only `product_*` fields are copied off the related product so the
    cart screen can be drawn from this one response, without a second call per
    row.
    """

    product_title = serializers.CharField(
        source='product.title', read_only=True)
    product_brand = serializers.CharField(
        source='product.brand', read_only=True)
    product_price = serializers.DecimalField(
        source='product.price', max_digits=10, decimal_places=2,
        read_only=True)
    product_image_url = serializers.URLField(
        source='product.imageUrl', read_only=True)

    class Meta:
        model = CartItem
        fields = [
            'id', 'product', 'product_title', 'product_brand',
            'product_price', 'product_image_url', 'quantity',
        ]


class CartSerializer(serializers.ModelSerializer):
    """The whole cart: the rows, plus the two totals the model already knows."""

    items = CartItemSerializer(many=True, read_only=True)
    total_items = serializers.IntegerField(read_only=True)
    total_price = serializers.DecimalField(
        max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = Cart
        fields = ['id', 'user', 'created_at', 'items', 'total_items',
                  'total_price']


class AddToCartSerializer(serializers.Serializer):
    """The body of POST /api/cart/add/.

    PrimaryKeyRelatedField does the existence check for us: an id no product
    has comes back as a 400 with a readable message, not a 500.
    """

    product = serializers.PrimaryKeyRelatedField(
        queryset=Product.objects.all())
    quantity = serializers.IntegerField(min_value=1, default=1)


class UpdateQuantitySerializer(serializers.Serializer):
    """The body of PATCH /api/cart/items/<id>/.

    `min_value=1` is the rule the model implies — quantity is a
    PositiveIntegerField, and 0 is not a smaller cart, it is a row that should
    have been deleted.
    """

    quantity = serializers.IntegerField(min_value=1)
