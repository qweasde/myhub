from datetime import timedelta

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from apps.analytics.models import AnalyticsEvent
from apps.analytics.tasks import purge_old_events
from apps.analytics.tracking import device_from, is_bot, referrer_host

BROWSER = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140.0 Safari/537.36"
IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Mobile/15E148 Safari/604.1"


def visitor(ip="1.2.3.4", ua=BROWSER):
    return APIClient(HTTP_USER_AGENT=ua, HTTP_X_FORWARDED_FOR=ip)


def track(client, **data):
    response = client.post("/api/v1/track", {"username": "islam", **data}, format="json")
    assert response.status_code == 204
    return response


@pytest.fixture
def link(api):
    return api.post(
        "/api/v1/me/links", {"title": "GitHub", "url": "https://github.com/x"}, format="json"
    ).json()


def test_helpers():
    assert is_bot("TelegramBot (like TwitterBot)")
    assert is_bot("")
    assert not is_bot(BROWSER)
    assert device_from(IPHONE) == "mobile"
    assert device_from(BROWSER) == "desktop"
    assert referrer_host("https://www.google.com/search?q=x", "myhub.site") == "google.com"
    assert referrer_host("https://myhub.site/@other", "myhub.site") == ""


def test_view_and_click_are_recorded(user, link):
    client = visitor()
    track(client, type="view", referrer="https://t.me/somechat")
    track(client, type="click", link=link["id"])

    view = AnalyticsEvent.objects.get(type="view")
    assert view.referrer == "t.me"
    assert view.device == "desktop"
    assert len(view.visitor) == 32
    assert AnalyticsEvent.objects.get(type="click").link_id == link["id"]


def test_ignored_events(user, link, api):
    track(visitor(ua="Googlebot/2.1"), type="view")  # bot
    track(visitor(), type="view", username="nobody")  # unknown profile
    track(visitor(), type="click", link=999999)  # someone else's / missing link
    api.patch(f"/api/v1/me/links/{link['id']}", {"is_visible": False}, format="json")
    track(visitor(), type="click", link=link["id"])  # hidden link
    track(visitor(), type="nonsense")  # invalid payload still answers 204
    assert AnalyticsEvent.objects.count() == 0


def test_owner_views_are_not_counted(user):
    owner = APIClient(HTTP_USER_AGENT=BROWSER)
    owner.force_login(user)
    track(owner, type="view")
    assert AnalyticsEvent.objects.count() == 0


def test_unpublished_profile_not_tracked(user, api):
    api.patch("/api/v1/me/profile", {"is_published": False}, format="json")
    track(visitor(), type="view")
    assert AnalyticsEvent.objects.count() == 0


def test_dashboard_stats(api, user, link):
    a, b = visitor("1.1.1.1"), visitor("2.2.2.2", IPHONE)
    track(a, type="view", referrer="https://google.com/")
    track(a, type="view")  # same visitor, same day: one unique
    track(b, type="view", referrer="https://t.me/x")
    track(a, type="click", link=link["id"])

    data = api.get("/api/v1/me/analytics?days=7").json()

    assert data["days"] == 7
    assert len(data["daily"]) == 7
    assert data["daily"][-1] == {
        "date": timezone.localdate().isoformat(),
        "views": 3,
        "unique_visitors": 2,
        "clicks": 1,
    }
    assert data["totals"] == {"views": 3, "unique_visitors": 2, "clicks": 1, "ctr": 0.3333}
    assert data["top_links"] == [{"id": link["id"], "title": "GitHub", "clicks": 1}]
    assert {r["host"]: r["views"] for r in data["referrers"]} == {"google.com": 1, "t.me": 1, "": 1}
    assert {d["device"]: d["views"] for d in data["devices"]} == {"desktop": 2, "mobile": 1}


def test_dashboard_period_and_isolation(api, user, db):
    track(visitor(), type="view")
    AnalyticsEvent.objects.update(created_at=timezone.now() - timedelta(days=10))

    assert api.get("/api/v1/me/analytics?days=7").json()["totals"]["views"] == 0
    assert api.get("/api/v1/me/analytics?days=30").json()["totals"]["views"] == 1
    assert api.get("/api/v1/me/analytics?days=999").json()["days"] == 30

    from apps.accounts.models import User

    other = APIClient()
    other.force_authenticate(User.objects.create_user("other", "o@example.com", "x"))
    assert other.get("/api/v1/me/analytics?days=30").json()["totals"]["views"] == 0


def test_purge_old_events(user, settings):
    settings.ANALYTICS_RETENTION_DAYS = 30
    track(visitor(), type="view")
    track(visitor("9.9.9.9"), type="view")
    AnalyticsEvent.objects.filter(pk=AnalyticsEvent.objects.first().pk).update(
        created_at=timezone.now() - timedelta(days=31)
    )
    assert purge_old_events() == 1
    assert AnalyticsEvent.objects.count() == 1


def test_seed_demo_analytics(db):
    from django.core.management import call_command

    call_command("seed_demo")
    call_command("seed_demo_analytics", days=14)
    events = AnalyticsEvent.objects.filter(profile__user__username="demo")
    assert events.filter(type="view").count() > 50
    assert events.filter(type="click").exists()
    oldest = events.order_by("created_at").first().created_at
    assert (timezone.now() - oldest).days >= 12


def test_previous_period_totals(api, user):
    track(visitor("1.1.1.1"), type="view")
    track(visitor("2.2.2.2"), type="view")
    AnalyticsEvent.objects.update(created_at=timezone.now() - timedelta(days=9))
    track(visitor("3.3.3.3"), type="view")

    data = api.get("/api/v1/me/analytics?days=7").json()
    assert data["totals"]["views"] == 1
    assert data["previous"] == {"views": 2, "unique_visitors": 2, "clicks": 0}
