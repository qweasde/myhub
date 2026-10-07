import pytest
from rest_framework.test import APIClient

from apps.accounts.models import User


@pytest.fixture(autouse=True)
def local_media(settings, tmp_path):
    # Never touch MinIO/S3 from tests
    settings.MEDIA_ROOT = tmp_path / "media"
    settings.STORAGES = {
        "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
        "staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"},
    }


@pytest.fixture
def user(db):
    return User.objects.create_user(username="islam", email="islam@example.com", password="x")


@pytest.fixture
def api(user):
    client = APIClient()
    client.force_authenticate(user)
    return client


@pytest.fixture
def anon():
    return APIClient()
