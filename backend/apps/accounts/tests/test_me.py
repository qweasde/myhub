import pytest

from apps.accounts.models import User


@pytest.mark.django_db
def test_me_requires_auth(client):
    response = client.get("/api/v1/me")
    assert response.status_code == 403


@pytest.mark.django_db
def test_me_returns_current_user(client):
    user = User.objects.create_user(username="islam", email="islam@example.com", password="x")
    client.force_login(user)

    response = client.get("/api/v1/me")

    assert response.status_code == 200
    data = response.json()
    assert data["username"] == "islam"
    assert data["email"] == "islam@example.com"
    assert data["email_verified"] is False
