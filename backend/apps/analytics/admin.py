from django.contrib import admin

from .models import AnalyticsEvent


@admin.register(AnalyticsEvent)
class AnalyticsEventAdmin(admin.ModelAdmin):
    list_display = ["created_at", "profile", "type", "link", "referrer", "device"]
    list_filter = ["type", "device"]
    date_hierarchy = "created_at"
