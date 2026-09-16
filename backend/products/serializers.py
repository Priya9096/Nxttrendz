from rest_framework import serializers
from .models import Product

class ProductSerializer(serializers.ModelSerializer):

    # The model column has been called imageUrl since the first session, and
    # the products page, the details page and the cart all read that name. The
    # seller screens send and read snake_case like every other field, so both
    # names are published here:
    #
    #   image_url  what you send on POST and PATCH  (writable)
    #   imageUrl   what the older screens still read  (read-only mirror)
    image_url = serializers.URLField(source='imageUrl')
    imageUrl = serializers.URLField(read_only=True)

    class Meta:
        model  = Product
        fields = [
            'id', 'title', 'brand', 'price', 'category',
            'image_url', 'imageUrl', 'rating',
            'is_prime',
            # ← new: the three columns the details page needs. They were in the
            # model all along; until they were listed here they never left the
            # server.
            'description', 'availability', 'total_reviews',
        ]
        read_only_fields = ['seller']   # ← clients can’t send this


