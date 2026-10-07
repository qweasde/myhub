import pytest
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.profiles.serializers import detect_icon


@pytest.mark.parametrize(
    ("url", "icon"),
    [
        ("https://github.com/islam", "github"),
        ("https://www.linkedin.com/in/islam", "linkedin"),
        ("https://t.me/islam", "telegram"),
        ("https://youtu.be/abc", "youtube"),
        ("https://notgithub.com/x", "website"),
        ("mailto:me@example.com", "email"),
    ],
)
def test_detect_icon(url, icon):
    assert detect_icon(url) == icon


def test_link_crud_and_order(api):
    first = api.post("/api/v1/me/links", {"title": "A", "url": "https://a.dev"}, format="json")
    second = api.post("/api/v1/me/links", {"title": "B", "url": "https://b.dev"}, format="json")
    assert first.status_code == 201
    assert (first.json()["order"], second.json()["order"]) == (1, 2)

    link_id = first.json()["id"]
    response = api.patch(f"/api/v1/me/links/{link_id}", {"is_visible": False}, format="json")
    assert response.json()["is_visible"] is False

    assert api.delete(f"/api/v1/me/links/{link_id}").status_code == 204
    assert [link["title"] for link in api.get("/api/v1/me/links").json()] == ["B"]


def test_explicit_icon_is_kept(api):
    response = api.post(
        "/api/v1/me/links",
        {"title": "Portfolio", "url": "https://github.com/x", "icon": "website"},
        format="json",
    )
    assert response.json()["icon"] == "website"


def test_reorder(api):
    ids = [
        api.post("/api/v1/me/skills", {"name": name}, format="json").json()["id"]
        for name in ["Python", "Django", "Docker"]
    ]
    response = api.post("/api/v1/me/skills/reorder", {"ids": ids[::-1]}, format="json")
    assert response.status_code == 204
    assert [s["name"] for s in api.get("/api/v1/me/skills").json()] == [
        "Docker",
        "Django",
        "Python",
    ]


def test_reorder_requires_exact_set(api):
    ids = [api.post("/api/v1/me/skills", {"name": n}, format="json").json()["id"] for n in "ab"]
    response = api.post("/api/v1/me/skills/reorder", {"ids": ids[:1]}, format="json")
    assert response.status_code == 400


def test_skill_unique_case_insensitive(api):
    api.post("/api/v1/me/skills", {"name": "Django"}, format="json")
    response = api.post("/api/v1/me/skills", {"name": " django "}, format="json")
    assert response.status_code == 400


def test_project_technologies_deduplicated(api):
    response = api.post(
        "/api/v1/me/projects",
        {"title": "MyHub", "technologies": ["Django", " django", "Next.js", ""]},
        format="json",
    )
    assert response.status_code == 201
    assert response.json()["technologies"] == ["Django", "Next.js"]


def test_project_put_not_allowed(api):
    project = api.post("/api/v1/me/projects", {"title": "X"}, format="json").json()
    response = api.put(f"/api/v1/me/projects/{project['id']}", {"title": "Y"}, format="json")
    assert response.status_code == 405


def test_cannot_touch_other_users_items(api, db):
    link = api.post(
        "/api/v1/me/links", {"title": "A", "url": "https://a.dev"}, format="json"
    ).json()
    other = User.objects.create_user(username="other", email="o@example.com", password="x")
    client = APIClient()
    client.force_authenticate(other)

    assert (
        client.patch(f"/api/v1/me/links/{link['id']}", {"title": "pwn"}, format="json").status_code
        == 404
    )
    assert client.delete(f"/api/v1/me/links/{link['id']}").status_code == 404
    assert client.get("/api/v1/me/links").json() == []


@pytest.mark.parametrize(
    ("url", "status"),
    [
        ("mailto:me@example.com", 201),
        ("mailto:not-an-email", 400),
        ("javascript:alert(1)", 400),
        ("ftp://example.com", 400),
    ],
)
def test_link_url_schemes(api, url, status):
    response = api.post("/api/v1/me/links", {"title": "x", "url": url}, format="json")
    assert response.status_code == status


def test_seed_demo_is_idempotent(db, capsys):
    from django.core.management import call_command

    call_command("seed_demo")
    call_command("seed_demo")
    demo = User.objects.get(username="demo")
    assert demo.profile.links.count() == 6
    assert demo.profile.blocks.count() == 6
    assert demo.profile.links.get(title="GitHub").icon == "github"
    assert "Сброшен @demo" in capsys.readouterr().out
