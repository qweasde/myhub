from datetime import timedelta

from celery import shared_task
from django.conf import settings
from django.utils import timezone

from .models import AnalyticsEvent


@shared_task
def purge_old_events() -> int:
    """Raw events are kept for ANALYTICS_RETENTION_DAYS; the dashboard shows at most 90."""
    cutoff = timezone.now() - timedelta(days=settings.ANALYTICS_RETENTION_DAYS)
    deleted, _ = AnalyticsEvent.objects.filter(created_at__lt=cutoff).delete()
    return deleted
