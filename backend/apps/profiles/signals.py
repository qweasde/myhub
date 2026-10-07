from django.conf import settings
from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import Profile, create_default_blocks


@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def create_profile(sender, instance, created, **kwargs):
    if created:
        create_default_blocks(Profile.objects.create(user=instance))
