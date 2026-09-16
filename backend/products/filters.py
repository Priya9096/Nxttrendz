import django_filters

from .models import Product


class ProductFilter(django_filters.FilterSet):
    """The filters the products page actually needs.

    `category`, `brand` and `is_prime` are plain exact matches — the same three
    `filterset_fields` gave us before.

    `rating` is the one worth reading twice. The buttons in the UI say
    "4 & up", so an exact match would be wrong: a 4.5-star product belongs
    under the 4-star button. `lookup_expr='gte'` is what makes "& up" true.
    """

    rating = django_filters.NumberFilter(field_name='rating', lookup_expr='gte')

    class Meta:
        model = Product
        fields = ['category', 'brand', 'is_prime', 'rating']
