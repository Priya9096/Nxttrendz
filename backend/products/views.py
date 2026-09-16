from rest_framework.generics import ListCreateAPIView
from rest_framework.generics import RetrieveUpdateDestroyAPIView
from rest_framework.permissions import IsAuthenticated
from .models import Product
from .serializers import ProductSerializer
from rest_framework import filters
from django_filters.rest_framework import DjangoFilterBackend
from .pagination import ProductPagination
from .permissions import IsSellerOrReadOnly as IsSeller
from .filters import ProductFilter


# Prime products are a members-only benefit. Both views ask this one function
# what the caller is allowed to see, so the rule is written down exactly once.
def visible_products(user):
    if user.is_authenticated:
        return Product.objects.all()
    return Product.objects.exclude(is_prime=True)


# A visitor can spell the filter value in more than one way, and a lock that
# recognises only one spelling is not a lock.
PRIME_VALUES = {'true', '1'}


# Create your views here.
class ProductListView(ListCreateAPIView):
    serializer_class = ProductSerializer

    # Reading is open to everybody; creating needs a logged-in seller. The
    # detail view has had this lock since the Django course — the list view
    # never did, which is why an anonymous POST used to blow up here.
    permission_classes = [IsSeller]

    filter_backends = [DjangoFilterBackend, filters.SearchFilter,filters.OrderingFilter]
    search_fields   = ['title', 'brand']
    ordering_fields = ['price', 'rating']
    # A class instead of a list, because "4 & up" is not an exact match. ← new!
    filterset_class = ProductFilter
    pagination_class = ProductPagination

    def get_queryset(self):
        # Hidden by default: a visitor's list simply has no prime rows in it.
        return visible_products(self.request.user)

    def get_permissions(self):
        # Refused when asked for directly: ?is_prime=true needs a login, so the
        # frontend gets a clear 401 instead of a silently empty list.
        asked_for_prime = self.request.query_params.get('is_prime', '')
        if asked_for_prime.lower() in PRIME_VALUES:
            return [IsAuthenticated()]
        return super().get_permissions()

    def perform_create(self, serializer):
        serializer.save(seller=self.request.user)



class ProductDetailView(RetrieveUpdateDestroyAPIView):
    serializer_class = ProductSerializer

    permission_classes = [IsSeller]   # ← the lock

    def get_queryset(self):
        # The same rule here, or the benefit is one guessed URL away:
        # /api/products/9/ would hand a prime product to anybody.
        return visible_products(self.request.user)
