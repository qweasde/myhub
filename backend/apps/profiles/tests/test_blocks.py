from apps.profiles.models import DEFAULT_BLOCKS


def blocks(api):
    return api.get("/api/v1/me/blocks").json()


def test_new_profile_gets_default_blocks(api):
    assert [b["type"] for b in blocks(api)] == list(DEFAULT_BLOCKS)


def test_add_text_block_with_config_defaults(api):
    response = api.post(
        "/api/v1/me/blocks", {"type": "text", "config": {"title": "Обо мне"}}, format="json"
    )
    assert response.status_code == 201
    assert response.json()["config"] == {"title": "Обо мне", "body": ""}
    assert response.json()["order"] == len(DEFAULT_BLOCKS) + 1


def test_text_block_is_repeatable_others_are_not(api):
    assert api.post("/api/v1/me/blocks", {"type": "text"}, format="json").status_code == 201
    assert api.post("/api/v1/me/blocks", {"type": "text"}, format="json").status_code == 201
    response = api.post("/api/v1/me/blocks", {"type": "links"}, format="json")
    assert response.status_code == 400
    assert "type" in response.json()


def test_config_is_validated_and_unknown_keys_dropped(api):
    bad = api.post(
        "/api/v1/me/blocks", {"type": "contact", "config": {"title": "x" * 61}}, format="json"
    )
    assert bad.status_code == 400

    ok = api.post(
        "/api/v1/me/blocks",
        {"type": "contact", "config": {"title": "Связь", "evil": "<script>"}},
        format="json",
    )
    assert ok.json()["config"] == {"title": "Связь", "text": ""}


def test_update_config_and_visibility(api):
    links = next(b for b in blocks(api) if b["type"] == "links")
    response = api.patch(
        f"/api/v1/me/blocks/{links['id']}",
        {"config": {"layout": "icons"}, "is_visible": False},
        format="json",
    )
    assert response.status_code == 200
    assert response.json()["config"] == {"layout": "icons"}
    assert response.json()["is_visible"] is False

    bad = api.patch(
        f"/api/v1/me/blocks/{links['id']}", {"config": {"layout": "grid"}}, format="json"
    )
    assert bad.status_code == 400


def test_type_cannot_change(api):
    links = next(b for b in blocks(api) if b["type"] == "links")
    response = api.patch(f"/api/v1/me/blocks/{links['id']}", {"type": "skills"}, format="json")
    assert response.status_code == 400


def test_profile_block_cannot_be_deleted(api):
    header = next(b for b in blocks(api) if b["type"] == "profile")
    assert api.delete(f"/api/v1/me/blocks/{header['id']}").status_code == 400

    skills = next(b for b in blocks(api) if b["type"] == "skills")
    assert api.delete(f"/api/v1/me/blocks/{skills['id']}").status_code == 204


def test_public_profile_returns_visible_blocks_in_order(anon, api):
    ids = [b["id"] for b in blocks(api)]
    api.post("/api/v1/me/blocks/reorder", {"ids": ids[::-1]}, format="json")
    api.patch(f"/api/v1/me/blocks/{ids[1]}", {"is_visible": False}, format="json")

    public = anon.get("/api/v1/profiles/islam").json()["blocks"]

    assert [b["id"] for b in public] == [i for i in ids[::-1] if i != ids[1]]
    assert set(public[0]) == {"id", "type", "config"}
