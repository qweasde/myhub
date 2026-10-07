import pytest

from apps.accounts.models import User

SIGNUP_URL = "/_allauth/browser/v1/auth/signup"


@pytest.mark.django_db
def test_signup_lowercases_username(client):
    response = client.post(
        SIGNUP_URL,
        {"email": "islam@example.com", "username": "Islam", "password": "s3cure-Passw0rd"},
        content_type="application/json",
    )
    assert response.status_code == 200, response.json()
    assert User.objects.get(email="islam@example.com").username == "islam"


@pytest.mark.django_db
def test_signup_rejects_reserved_username(client):
    response = client.post(
        SIGNUP_URL,
        {"email": "a@example.com", "username": "dashboard", "password": "s3cure-Passw0rd"},
        content_type="application/json",
    )
    assert response.status_code == 400
