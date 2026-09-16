from rest_framework.permissions import BasePermission
from rest_framework.permissions import SAFE_METHODS


class IsSellerOrReadOnly(BasePermission):
    """Who may change the shop.

    Two questions, and they are not the same question:

      has_permission         may this caller write at all?  (a logged-in seller)
      has_object_permission  may this caller write *this row*?  (its owner)

    The first one is what stops a visitor from creating a product. The second is
    what stops one seller from editing another seller's product — a lock that
    only makes sense once there is a row to check the owner of.
    """

    message = 'Only the seller who owns this product may change it.'

    def has_permission(self, request, view):

        # rule 1 — safe methods always pass
        if request.method in SAFE_METHODS:
            return True

        # rule 2 — must be a logged-in seller
        return (
            request.user.is_authenticated
            and request.user.user_type == 'seller'
        )

    def has_object_permission(self, request, view, obj):

        # rule 3 — reading somebody else's product is fine; writing is not
        if request.method in SAFE_METHODS:
            return True

        # rule 4 — and it has to be yours
        return obj.seller_id == request.user.id
