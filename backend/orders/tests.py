"""End-to-end checks for everything Session 7 adds.

Run them with:

    python manage.py test

They talk to a throw-away database, so nothing here touches db.sqlite3 or the
54 products it holds.
"""
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.urls import reverse

from rest_framework.test import APITestCase

from orders.models import Order
from products.models import Product

User = get_user_model()


ADDRESS = {
    'full_name': 'Priya',
    'phone': '7095407564',
    'address': 'Narsingi',
    'city': 'Hyderabad',
    'state': 'Telangana',
    'pincode': '522403',
}


class SellerAndOrderTests(APITestCase):
    def setUp(self):
        self.seller = User.objects.create_user(
            username='priya', password='secret123', user_type='seller')
        self.other_seller = User.objects.create_user(
            username='ravi', password='secret123', user_type='seller')
        self.customer = User.objects.create_user(
            username='buyer', password='secret123', user_type='customer')

        self.product = Product.objects.create(
            title='True Wireless Earbuds', brand='LG', category='Electronics',
            price=Decimal('13499.00'),
            imageUrl='https://example.com/earbuds.png', rating=4.3,
            availability='In Stock', seller=self.seller,
        )
        # A second seller's row, so "only your own products" can be tested.
        Product.objects.create(
            title='Somebody Else Watch', brand='Titan', category='Clothing',
            price=Decimal('1999.00'),
            imageUrl='https://example.com/watch.png', rating=4.0,
            availability='In Stock', seller=self.other_seller,
        )

    def login(self, user):
        self.client.force_authenticate(user=user)

    # ---------------------------------------------------------- Part 1 ------
    def test_seller_products_returns_only_my_products(self):
        self.login(self.seller)
        response = self.client.get('/api/seller/products/')
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body['count'], 1)
        self.assertEqual(body['total_pages'], 1)
        row = body['results'][0]
        self.assertEqual(row['title'], 'True Wireless Earbuds')
        self.assertEqual(row['image_url'], 'https://example.com/earbuds.png')
        self.assertEqual(row['availability'], 'In Stock')

    def test_seller_products_search_and_login(self):
        self.login(self.seller)
        found = self.client.get('/api/seller/products/?search=earbuds').json()
        self.assertEqual(found['count'], 1)
        missed = self.client.get('/api/seller/products/?search=fridge').json()
        self.assertEqual(missed['count'], 0)

        self.client.force_authenticate(user=None)
        self.assertEqual(
            self.client.get('/api/seller/products/').status_code, 401)

    def test_create_product(self):
        self.login(self.seller)
        response = self.client.post('/api/products/', {
            'title': 'Fresh Lemon, 100g',
            'brand': 'Amazon',
            'category': 'Grocery',
            'price': 50,
            'image_url': 'https://example.com/lemon.png',
            'availability': 'In Stock',
            'rating': 4.5,
        }, format='json')
        self.assertEqual(response.status_code, 201)
        body = response.json()
        self.assertIn('id', body)
        # The owner comes off the token, never out of the request body.
        self.assertEqual(
            Product.objects.get(pk=body['id']).seller, self.seller)

    def test_create_product_is_locked(self):
        # A visitor cannot create a product...
        self.assertEqual(
            self.client.post('/api/products/', {}, format='json').status_code,
            401)
        # ...and neither can a customer.
        self.login(self.customer)
        self.assertEqual(
            self.client.post('/api/products/', {}, format='json').status_code,
            403)

    def test_create_product_missing_field_names_the_field(self):
        self.login(self.seller)
        response = self.client.post(
            '/api/products/', {'title': 'No price here'}, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertIn('price', response.json())

    def test_patch_only_changes_what_was_sent(self):
        self.login(self.seller)
        response = self.client.patch(
            f'/api/products/{self.product.id}/', {'price': 999},
            format='json')
        self.assertEqual(response.status_code, 200)
        self.product.refresh_from_db()
        self.assertEqual(self.product.price, Decimal('999.00'))
        self.assertEqual(self.product.brand, 'LG')

    def test_a_seller_cannot_touch_another_sellers_product(self):
        self.login(self.other_seller)
        self.assertEqual(
            self.client.patch(f'/api/products/{self.product.id}/',
                              {'price': 1}, format='json').status_code, 403)
        self.assertEqual(
            self.client.delete(
                f'/api/products/{self.product.id}/').status_code, 403)

    def test_delete_product_answers_204(self):
        self.login(self.seller)
        response = self.client.delete(f'/api/products/{self.product.id}/')
        self.assertEqual(response.status_code, 204)
        self.assertEqual(response.content, b'')

    # ---------------------------------------------------------- Part 2 ------
    def place_order(self, user, payment_method='COD', quantity=1):
        self.login(user)
        self.client.post(
            '/api/cart/add/',
            {'product': self.product.id, 'quantity': quantity},
            format='json')
        return self.client.post('/api/orders/', {
            'payment_method': payment_method,
            'address': ADDRESS,
        }, format='json')

    def test_checkout_creates_the_order_and_empties_the_cart(self):
        response = self.place_order(self.customer, quantity=2)
        self.assertEqual(response.status_code, 201)
        body = response.json()

        self.assertEqual(body['status'], 'placed')
        self.assertEqual(body['payment_method'], 'COD')
        self.assertFalse(body['is_paid'])
        self.assertEqual(body['total'], '26998.00')
        self.assertEqual(body['item_count'], 2)
        self.assertTrue(body['can_cancel'])
        self.assertEqual(body['address']['city'], 'Hyderabad')

        item = body['items'][0]
        self.assertEqual(item['title'], 'True Wireless Earbuds')
        self.assertEqual(item['price'], '13499.00')
        self.assertEqual(item['quantity'], 2)
        self.assertEqual(item['status'], 'placed')

        # The cart became an order, so it is empty now.
        cart = self.client.get('/api/cart/').json()
        self.assertEqual(cart['items'], [])

    def test_card_orders_are_paid_at_once(self):
        body = self.place_order(self.customer, payment_method='CARD').json()
        self.assertTrue(body['is_paid'])

    def test_checkout_needs_a_full_address(self):
        self.login(self.customer)
        self.client.post('/api/cart/add/', {'product': self.product.id},
                         format='json')
        bad_address = {**ADDRESS, 'pincode': '52'}
        response = self.client.post('/api/orders/', {
            'payment_method': 'COD', 'address': bad_address}, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertIn('pincode', response.json()['address'])

    def test_checkout_refuses_an_empty_cart(self):
        self.login(self.customer)
        response = self.client.post('/api/orders/', {
            'payment_method': 'COD', 'address': ADDRESS}, format='json')
        self.assertEqual(response.status_code, 400)

    def test_orders_list_is_only_mine(self):
        self.place_order(self.customer)
        self.place_order(self.seller)

        self.login(self.customer)
        body = self.client.get('/api/orders/').json()
        self.assertEqual(body['count'], 1)
        card = body['results'][0]
        self.assertEqual(card['item_count'], 1)
        self.assertEqual(card['thumbnail'],
                         'https://example.com/earbuds.png')
        self.assertEqual(card['status'], 'placed')

    def test_another_customers_order_is_a_404(self):
        order_id = self.place_order(self.customer).json()['id']
        self.login(self.seller)
        self.assertEqual(
            self.client.get(f'/api/orders/{order_id}/').status_code, 404)

    def test_cancel_marks_the_order_and_its_items(self):
        order_id = self.place_order(self.customer).json()['id']
        response = self.client.post(f'/api/orders/{order_id}/cancel/')
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body['status'], 'cancelled')
        self.assertFalse(body['can_cancel'])
        self.assertEqual(body['items'][0]['status'], 'cancelled')
        # ...and it cannot be cancelled twice.
        self.assertEqual(
            self.client.post(f'/api/orders/{order_id}/cancel/').status_code,
            400)

    def test_a_deleted_product_stays_inside_old_orders(self):
        order_id = self.place_order(self.customer).json()['id']
        self.login(self.seller)
        self.client.delete(f'/api/products/{self.product.id}/')

        self.login(self.customer)
        body = self.client.get(f'/api/orders/{order_id}/').json()
        self.assertEqual(body['items'][0]['title'], 'True Wireless Earbuds')
        self.assertIsNone(body['items'][0]['product'])

    # ---------------------------------------------------------- Part 3 ------
    def test_summary_counts_only_this_sellers_sales(self):
        self.place_order(self.customer, quantity=2)

        self.login(self.seller)
        body = self.client.get('/api/seller/summary/').json()

        self.assertEqual(body['revenue'], '26998.00')
        self.assertEqual(body['orders'], 1)
        self.assertEqual(body['units_sold'], 2)
        self.assertEqual(body['products'], 1)
        # One row still to ship — awaiting_shipment counts items, not pieces,
        # the same way the "Items by Status" panel does.
        self.assertEqual(body['awaiting_shipment'], 1)
        self.assertEqual(body['by_status'],
                         {'placed': 1, 'shipped': 0, 'delivered': 0,
                          'cancelled': 0})
        self.assertEqual(len(body['last_7_days']), 7)
        self.assertEqual(body['last_7_days'][-1]['revenue'], '26998.00')
        self.assertEqual(body['last_7_days'][0]['revenue'], '0.00')
        self.assertEqual(body['top_products'][0], {
            'product_id': self.product.id,
            'title': 'True Wireless Earbuds',
            'units': 2,
            'revenue': '26998.00',
        })

    def test_summary_leaves_cancelled_items_out(self):
        order_id = self.place_order(self.customer).json()['id']
        self.client.post(f'/api/orders/{order_id}/cancel/')

        self.login(self.seller)
        body = self.client.get('/api/seller/summary/').json()
        self.assertEqual(body['revenue'], '0.00')
        self.assertEqual(body['orders'], 0)
        self.assertEqual(body['units_sold'], 0)
        self.assertEqual(body['awaiting_shipment'], 0)
        self.assertEqual(body['by_status']['cancelled'], 1)
        self.assertEqual(body['top_products'], [])

    def test_the_other_sellers_dashboard_is_empty(self):
        self.place_order(self.customer)
        self.login(self.other_seller)
        body = self.client.get('/api/seller/summary/').json()
        self.assertEqual(body['revenue'], '0.00')
        self.assertEqual(body['orders'], 0)
        self.assertEqual(body['products'], 1)

    # -------------------------------------------- the seller's own orders ---
    def test_seller_orders_shows_what_people_bought_from_me(self):
        """GET /api/orders/ is what I bought. This is what was bought from me."""
        self.place_order(self.customer, quantity=2)

        self.login(self.seller)
        body = self.client.get('/api/seller/orders/').json()

        self.assertEqual(body['count'], 1)
        sale = body['results'][0]
        self.assertEqual(sale['buyer'], 'buyer')
        self.assertEqual(sale['status'], 'placed')
        self.assertEqual(sale['your_total'], '26998.00')
        self.assertEqual(sale['ship_to']['city'], 'Hyderabad')
        self.assertEqual(len(sale['your_items']), 1)
        row = sale['your_items'][0]
        self.assertEqual(row['title'], 'True Wireless Earbuds')
        self.assertEqual(row['quantity'], 2)
        self.assertEqual(row['status'], 'placed')
        self.assertEqual(row['next_status'], 'shipped')

        # The customer's own list is untouched by any of this.
        self.login(self.customer)
        self.assertEqual(self.client.get('/api/orders/').json()['count'], 1)

    def two_seller_order(self):
        """One order holding one product from each of the two sellers."""
        other_product = Product.objects.get(title='Somebody Else Watch')
        self.login(self.customer)
        self.client.post('/api/cart/add/', {'product': self.product.id},
                         format='json')
        self.client.post('/api/cart/add/', {'product': other_product.id},
                         format='json')
        return self.client.post('/api/orders/', {
            'payment_method': 'COD', 'address': ADDRESS}, format='json').json()

    def test_seller_orders_never_shows_another_sellers_rows(self):
        self.two_seller_order()

        self.login(self.seller)
        mine = self.client.get('/api/seller/orders/').json()['results'][0]
        self.assertEqual([row['title'] for row in mine['your_items']],
                         ['True Wireless Earbuds'])
        # ...and "your total" is your rows only, not the order total.
        self.assertEqual(mine['your_total'], '13499.00')

        self.login(self.other_seller)
        theirs = self.client.get('/api/seller/orders/').json()['results'][0]
        self.assertEqual([row['title'] for row in theirs['your_items']],
                         ['Somebody Else Watch'])

    def test_seller_orders_can_be_filtered_by_status(self):
        self.place_order(self.customer)
        self.login(self.seller)
        self.assertEqual(
            self.client.get('/api/seller/orders/?status=placed').json()['count'],
            1)
        self.assertEqual(
            self.client.get(
                '/api/seller/orders/?status=delivered').json()['count'], 0)

    def item_id_of(self, seller):
        self.login(seller)
        sale = self.client.get('/api/seller/orders/').json()['results'][0]
        return sale['your_items'][0]['id']

    def test_marking_an_item_shipped_moves_the_order_too(self):
        self.place_order(self.customer)
        item_id = self.item_id_of(self.seller)

        response = self.client.patch(
            f'/api/seller/orders/items/{item_id}/', {'status': 'shipped'},
            format='json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['status'], 'shipped')
        # Nothing is left to ship, so the strip on the Overview tab clears.
        self.assertEqual(
            self.client.get('/api/seller/summary/').json()[
                'awaiting_shipment'], 0)

        # The customer sees the same word, and can no longer call it off.
        self.login(self.customer)
        order = self.client.get('/api/orders/').json()['results'][0]
        self.assertEqual(order['status'], 'shipped')
        detail = self.client.get(f"/api/orders/{order['id']}/").json()
        self.assertFalse(detail['can_cancel'])
        self.assertEqual(
            self.client.post(f"/api/orders/{order['id']}/cancel/").status_code,
            400)

    def test_an_order_waits_for_the_slowest_seller(self):
        self.two_seller_order()
        item_id = self.item_id_of(self.seller)
        self.client.patch(f'/api/seller/orders/items/{item_id}/',
                          {'status': 'shipped'}, format='json')

        # One seller has shipped, the other has not, so the order has not.
        self.login(self.customer)
        self.assertEqual(
            self.client.get('/api/orders/').json()['results'][0]['status'],
            'placed')

        other_item_id = self.item_id_of(self.other_seller)
        self.client.patch(f'/api/seller/orders/items/{other_item_id}/',
                          {'status': 'shipped'}, format='json')

        self.login(self.customer)
        self.assertEqual(
            self.client.get('/api/orders/').json()['results'][0]['status'],
            'shipped')

    def test_delivering_a_cod_order_marks_it_paid(self):
        order_id = self.place_order(self.customer).json()['id']
        item_id = self.item_id_of(self.seller)
        for step in ['shipped', 'delivered']:
            self.client.patch(f'/api/seller/orders/items/{item_id}/',
                              {'status': step}, format='json')

        self.login(self.customer)
        body = self.client.get(f'/api/orders/{order_id}/').json()
        self.assertEqual(body['status'], 'delivered')
        # Cash on delivery: the money arrived with the parcel.
        self.assertTrue(body['is_paid'])

    def test_an_item_moves_one_step_at_a_time(self):
        self.place_order(self.customer)
        item_id = self.item_id_of(self.seller)
        response = self.client.patch(
            f'/api/seller/orders/items/{item_id}/', {'status': 'delivered'},
            format='json')
        self.assertEqual(response.status_code, 400)

    def test_a_cancelled_item_cannot_be_shipped(self):
        order_id = self.place_order(self.customer).json()['id']
        item_id = self.item_id_of(self.seller)
        self.login(self.customer)
        self.client.post(f'/api/orders/{order_id}/cancel/')

        self.login(self.seller)
        self.assertEqual(
            self.client.patch(f'/api/seller/orders/items/{item_id}/',
                              {'status': 'shipped'},
                              format='json').status_code, 400)

    def test_a_seller_cannot_move_another_sellers_item(self):
        self.place_order(self.customer)
        item_id = self.item_id_of(self.seller)

        self.login(self.other_seller)
        self.assertEqual(
            self.client.patch(f'/api/seller/orders/items/{item_id}/',
                              {'status': 'shipped'},
                              format='json').status_code, 404)

    def test_profile_says_who_you_are(self):
        self.login(self.seller)
        body = self.client.get('/api/users/profile/').json()
        self.assertEqual(body['username'], 'priya')
        self.assertEqual(body['user_type'], 'seller')
