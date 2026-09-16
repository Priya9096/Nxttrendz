from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response


class SellerProductPagination(PageNumberPagination):
    """Five rows a page, and it says how many pages there are.

    DRF's default answer carries count/next/previous. The footer of My Products
    prints "Page 1 of 11", so the number of pages is added here — worked out on
    the server, where the page size actually lives.
    """

    page_size = 5
    page_size_query_param = 'page_size'
    max_page_size = 100

    def get_paginated_response(self, data):
        return Response({
            'count': self.page.paginator.count,
            'total_pages': self.page.paginator.num_pages,
            'next': self.get_next_link(),
            'previous': self.get_previous_link(),
            'results': data,
        })
