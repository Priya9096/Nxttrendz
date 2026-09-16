from django.contrib import admin

from .models import Address, Order, OrderItem


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0


class AddressInline(admin.StackedInline):
    model = Address
    extra = 0


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'placed_at', 'status', 'payment_method',
                    'is_paid', 'total']
    list_filter = ['status', 'payment_method', 'is_paid']
    inlines = [OrderItemInline, AddressInline]
