
from rest_framework.pagination import PageNumberPagination

class ProductPagination(PageNumberPagination):
    page_size             = 5          # default per page
    page_size_query_param = 'page_size' # user can change it
    max_page_size         = 100         # but never more than 100
