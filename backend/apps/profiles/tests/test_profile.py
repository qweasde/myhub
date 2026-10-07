from io import BytesIO

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from PIL import Image

from apps.accounts.models import User
from apps.profiles.models import Profile


def make_image(size=(1200, 800), fmt="PNG"):
    buffer = BytesIO()
    Image.new("RGB", size, "teal").save(buffer, format=fmt)
    return SimpleUploadedFile(f"photo.{fmt.lower()}", buffer.getvalue(), content_type="image/png")


def test_profile_created_on_signup(user):
    assert Profile.objects.filter(user=user).exists()


def test_get_and_update_profile(api):
    response = api.patch(
        "/api/v1/me/profile",
        {"display_name": "Islam", "profession": "Backend developer", "is_published": False},
        format="json",
    )
    assert response.status_code == 200
    data = api.get("/api/v1/me/profile").json()
    assert data["username"] == "islam"
    assert data["display_name"] == "Islam"
    assert data["is_published"] is False


def test_profile_requires_auth(anon, db):
    assert anon.get("/api/v1/me/profile").status_code == 403


def test_avatar_upload_is_square_webp(api, user):
    response = api.put("/api/v1/me/profile/avatar", {"image": make_image()}, format="multipart")
    assert response.status_code == 200, response.json()
    assert response.json()["avatar"].endswith(".webp")

    user.profile.refresh_from_db()
    with Image.open(user.profile.avatar) as image:
        assert image.size == (512, 512)
        assert image.format == "WEBP"


def test_avatar_replace_deletes_old_file(api, user):
    api.put("/api/v1/me/profile/avatar", {"image": make_image()}, format="multipart")
    user.profile.refresh_from_db()
    old = user.profile.avatar
    storage, old_name = old.storage, old.name

    api.put("/api/v1/me/profile/avatar", {"image": make_image()}, format="multipart")
    assert not storage.exists(old_name)

    response = api.delete("/api/v1/me/profile/avatar")
    assert response.json()["avatar"] is None


def test_avatar_rejects_non_image(api):
    junk = SimpleUploadedFile("x.png", b"not an image", content_type="image/png")
    response = api.put("/api/v1/me/profile/avatar", {"image": junk}, format="multipart")
    assert response.status_code == 400


@pytest.mark.django_db
def test_public_profile(anon, api, user):
    api.patch("/api/v1/me/profile", {"display_name": "Islam"}, format="json")
    api.post(
        "/api/v1/me/links", {"title": "GitHub", "url": "https://github.com/islam"}, format="json"
    )
    api.post(
        "/api/v1/me/links",
        {"title": "Hidden", "url": "https://example.com", "is_visible": False},
        format="json",
    )
    api.post("/api/v1/me/skills", {"name": "Django"}, format="json")
    api.post("/api/v1/me/projects", {"title": "MyCar", "technologies": ["Django"]}, format="json")

    data = anon.get("/api/v1/profiles/Islam").json()

    assert data["display_name"] == "Islam"
    assert [link["title"] for link in data["links"]] == ["GitHub"]
    assert data["links"][0]["icon"] == "github"
    assert data["skills"] == ["Django"]
    assert data["projects"][0]["title"] == "MyCar"
    assert "is_published" not in data


def test_public_profile_hidden_when_unpublished(anon, api):
    api.patch("/api/v1/me/profile", {"is_published": False}, format="json")
    assert anon.get("/api/v1/profiles/islam").status_code == 404


def test_public_profile_hidden_for_inactive_user(anon, user):
    User.objects.filter(pk=user.pk).update(is_active=False)
    assert anon.get("/api/v1/profiles/islam").status_code == 404


def test_theme(api, anon):
    assert api.get("/api/v1/me/profile").json()["theme"] == "minimal"
    assert api.patch("/api/v1/me/profile", {"theme": "dark"}, format="json").status_code == 200
    assert anon.get("/api/v1/profiles/islam").json()["theme"] == "dark"
    assert api.patch("/api/v1/me/profile", {"theme": "neon"}, format="json").status_code == 400
