from datetime import timedelta
from urllib.parse import urlparse

from django.conf import settings
from django.contrib.auth import get_user
from django.db.models import Count, Q
from django.db.models.functions import TruncDate
from django.utils import timezone
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import serializers, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from apps.profiles.models import Profile

from .models import AnalyticsEvent
from .tracking import client_ip, device_from, is_bot, referrer_host, visitor_hash

PERIODS = (7, 30, 90)


class TrackSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=32)
    type = serializers.ChoiceField(choices=AnalyticsEvent.Type.choices)
    link = serializers.IntegerField(required=False)
    referrer = serializers.CharField(max_length=2000, required=False, allow_blank=True)


class TrackView(APIView):
    """Beacon from the public page. Always 204: never reveals whether anything was counted."""

    # No auth: the beacon comes from anonymous visitors (and must not trip CSRF for the owner)
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "track"

    @extend_schema(request=TrackSerializer, responses={204: None})
    def post(self, request):
        payload = TrackSerializer(data=request.data)
        if payload.is_valid():
            self.record(request, payload.validated_data)
        return Response(status=status.HTTP_204_NO_CONTENT)

    def record(self, request, data):
        user_agent = request.META.get("HTTP_USER_AGENT", "")[:500]
        if is_bot(user_agent):
            return
        profile = (
            Profile.objects.filter(
                user__username=data["username"].lower(), user__is_active=True, is_published=True
            )
            .only("id", "user_id")
            .first()
        )
        if not profile:
            return
        # The owner checking their own page shouldn't inflate the numbers. DRF has replaced
        # request.user with AnonymousUser (no authenticators here), so read the session.
        if get_user(request._request).pk == profile.user_id:
            return

        link = None
        if data["type"] == AnalyticsEvent.Type.CLICK:
            link = profile.links.filter(pk=data.get("link"), is_visible=True).first()
            if not link:
                return

        site_host = urlparse(settings.FRONTEND_URL).hostname or ""
        AnalyticsEvent.objects.create(
            profile=profile,
            type=data["type"],
            link=link,
            visitor=visitor_hash(client_ip(request), user_agent),
            referrer=referrer_host(data.get("referrer", ""), site_host),
            device=device_from(user_agent),
        )


class MyAnalyticsView(APIView):
    permission_classes = [IsAuthenticated]

    @staticmethod
    def previous_totals(user, start, days) -> dict:
        """Same-length period right before `start`, for "+12% vs previous week"."""
        prev_start = start - timedelta(days=days)
        events = AnalyticsEvent.objects.filter(
            profile__user=user, created_at__date__gte=prev_start, created_at__date__lt=start
        )
        per_day = (
            events.filter(type="view")
            .annotate(day=TruncDate("created_at"))
            .values("day")
            .annotate(n=Count("visitor", distinct=True))
        )
        return {
            "views": events.filter(type="view").count(),
            "unique_visitors": sum(row["n"] for row in per_day),
            "clicks": events.filter(type="click").count(),
        }

    @extend_schema(
        parameters=[OpenApiParameter("days", int, enum=list(PERIODS), default=30)],
        responses={200: dict},
    )
    def get(self, request):
        try:
            days = int(request.query_params.get("days", 30))
        except ValueError:
            days = 30
        if days not in PERIODS:
            days = 30

        today = timezone.localdate()
        start = today - timedelta(days=days - 1)
        events = AnalyticsEvent.objects.filter(
            profile__user=request.user,
            created_at__date__gte=start,
        )
        views = events.filter(type=AnalyticsEvent.Type.VIEW)
        clicks = events.filter(type=AnalyticsEvent.Type.CLICK)

        per_day = {
            row["day"]: row
            for row in events.annotate(day=TruncDate("created_at"))
            .values("day")
            .annotate(
                views=Count("id", filter=Q(type="view")),
                # visitor hashes rotate daily, so distinct-per-day is the honest unique count
                unique_visitors=Count("visitor", filter=Q(type="view"), distinct=True),
                clicks=Count("id", filter=Q(type="click")),
            )
        }
        daily = []
        for offset in range(days):
            day = start + timedelta(days=offset)
            row = per_day.get(day, {})
            daily.append(
                {
                    "date": day.isoformat(),
                    "views": row.get("views", 0),
                    "unique_visitors": row.get("unique_visitors", 0),
                    "clicks": row.get("clicks", 0),
                }
            )

        total_views = sum(d["views"] for d in daily)
        total_clicks = sum(d["clicks"] for d in daily)
        return Response(
            {
                "days": days,
                "totals": {
                    "views": total_views,
                    "unique_visitors": sum(d["unique_visitors"] for d in daily),
                    "clicks": total_clicks,
                    "ctr": round(total_clicks / total_views, 4) if total_views else 0,
                },
                "previous": self.previous_totals(request.user, start, days),
                "daily": daily,
                "top_links": [
                    {
                        "id": row["link"],
                        "title": row["link__title"] or "Удалённая ссылка",
                        "clicks": row["n"],
                    }
                    for row in clicks.values("link", "link__title")
                    .annotate(n=Count("id"))
                    .order_by("-n")[:10]
                ],
                "referrers": [
                    {"host": row["referrer"], "views": row["n"]}
                    for row in views.values("referrer").annotate(n=Count("id")).order_by("-n")[:8]
                ],
                "devices": [
                    {"device": row["device"], "views": row["n"]}
                    for row in views.values("device").annotate(n=Count("id")).order_by("-n")
                ],
            }
        )
