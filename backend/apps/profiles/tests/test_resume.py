def test_experience_crud_and_validation(api):
    job = {"position": "Backend developer", "company": "Acme", "start_date": "2022-03-01"}
    response = api.post("/api/v1/me/experience", job, format="json")
    assert response.status_code == 201
    assert response.json()["end_date"] is None  # current job

    bad = api.post(
        "/api/v1/me/experience",
        {**job, "start_date": "2023-01-01", "end_date": "2022-01-01"},
        format="json",
    )
    assert bad.status_code == 400
    assert "end_date" in bad.json()

    job_id = response.json()["id"]
    patch = api.patch(f"/api/v1/me/experience/{job_id}", {"end_date": "2021-01-01"}, format="json")
    assert patch.status_code == 400  # checked against the stored start_date


def test_education_years(api):
    ok = api.post(
        "/api/v1/me/education",
        {"institution": "МГТУ", "degree": "Бакалавр", "start_year": 2016, "end_year": 2020},
        format="json",
    )
    assert ok.status_code == 201
    bad = api.post(
        "/api/v1/me/education",
        {"institution": "X", "start_year": 2020, "end_year": 2019},
        format="json",
    )
    assert bad.status_code == 400


def test_language_levels(api):
    assert (
        api.post(
            "/api/v1/me/languages", {"name": "Русский", "level": "native"}, format="json"
        ).status_code
        == 201
    )
    assert (
        api.post(
            "/api/v1/me/languages", {"name": "English", "level": "Z9"}, format="json"
        ).status_code
        == 400
    )


def test_resume_blocks_and_public_api(api, anon):
    api.post(
        "/api/v1/me/experience",
        {"position": "Dev", "company": "Acme", "start_date": "2022-03-01"},
        format="json",
    )
    api.post("/api/v1/me/languages", {"name": "English", "level": "B2"}, format="json")
    for block_type in ("experience", "education", "languages"):
        assert api.post("/api/v1/me/blocks", {"type": block_type}, format="json").status_code == 201
    assert api.post("/api/v1/me/blocks", {"type": "experience"}, format="json").status_code == 400

    data = anon.get("/api/v1/profiles/islam").json()
    assert data["experience"][0]["company"] == "Acme"
    assert data["languages"] == [
        {"id": data["languages"][0]["id"], "name": "English", "level": "B2", "order": 1}
    ]
    assert data["education"] == []
    assert {"experience", "education", "languages"} <= {b["type"] for b in data["blocks"]}
