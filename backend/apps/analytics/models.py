from django.db import models

from apps.profiles.models import Link, Profile


class AnalyticsEvent(models.Model):
    """One page view or link click on a public profile.

    No IP addresses or user agents are stored: `visitor` is a hash that changes every day,
    enough to count unique visitors per day and nothing more.
    """

    class Type(models.TextChoices):
        VIEW = "view"
        CLICK = "click"

    class Device(models.TextChoices):
        DESKTOP = "desktop"
        MOBILE = "mobile"
        TABLET = "tablet"

    profile = models.ForeignKey(Profile, on_delete=models.CASCADE, related_name="events")
    type = models.CharField(max_length=10, choices=Type.choices)
    # Kept as SET_NULL so deleting a link doesn't rewrite past totals
    link = models.ForeignKey(Link, on_delete=models.SET_NULL, null=True, blank=True)
    visitor = models.CharField(max_length=32)
    referrer = models.CharField(max_length=255, blank=True)  # host only, "" = direct
    device = models.CharField(max_length=10, choices=Device.choices)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        indexes = [models.Index(fields=["profile", "created_at"])]

    def __str__(self):
        return f"{self.type} @{self.profile_id} {self.created_at:%Y-%m-%d %H:%M}"
