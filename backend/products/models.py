from django.db import models
from django.conf import settings


class Product(models.Model):
    id = models.AutoField(primary_key=True)
    title = models.CharField(max_length=255)
    brand = models.CharField(max_length=255)
    category = models.CharField(max_length=100, null=True, blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    imageUrl = models.URLField()
    rating = models.FloatField(default=0.0)
    is_prime    = models.BooleanField(default=False)   # ← new!

    # Details-page fields. The list page never shows them, the details page
    # needs all three.
    description   = models.TextField(blank=True, default='')
    availability  = models.CharField(max_length=50, blank=True, default='In Stock')
    total_reviews = models.IntegerField(default=0)

    seller = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='products',
    )




    def __str__(self):
        return self.title