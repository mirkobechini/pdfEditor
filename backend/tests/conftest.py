import os
import uuid

import fitz
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Explicitly import models to ensure they are registered with Base
# This MUST come before importing app.main, which imports routers that import models
from app.models import User, PdfDocument, LicenseFeature, BugReport
from app.core.database import Base
from app.api.deps import get_db as deps_get_db
from app.main import app

_engine = None  # Store the current test engine


@pytest.fixture(autouse=True)
def test_secret_key(monkeypatch):
    """Ensure tests always have a valid SECRET_KEY."""
    monkeypatch.setattr("app.core.config.settings.SECRET_KEY", "test-secret-key-for-pytest-32bytes!")


@pytest.fixture(autouse=True)
def force_local_storage(monkeypatch):
    """Force local storage backend for all tests (ignore .env S3 settings)."""
    monkeypatch.setattr("app.core.config.settings.STORAGE_BACKEND", "local")


@pytest.fixture(autouse=True)
def disable_rate_limiting(monkeypatch):
    """Disable rate limiting during tests."""
    from app.core.limiter import limiter
    limiter.enabled = False


@pytest.fixture(autouse=True)
def disable_csrf(monkeypatch):
    """Disable CSRF middleware during tests (cookie handling is complex in TestClient)."""
    monkeypatch.setattr("app.core.config.settings.DISABLE_CSRF", True)


@pytest.fixture(autouse=True)
def per_test_db(tmp_path):
    """Each test gets its OWN SQLite file + overrides deps.get_db correctly."""
    global _engine
    
    # Ensure models are imported before creating tables
    from app.models.user import User
    from app.models.pdf import PdfDocument
    from app.models.license import LicenseFeature
    from app.models.bug_report import BugReport
    
    db_path = os.path.join(tmp_path, f"test_{uuid.uuid4().hex}.db")
    engine = create_engine(
        f"sqlite:///{db_path}",
        connect_args={"check_same_thread": False},
    )
    Base.metadata.create_all(bind=engine)
    _engine = engine
    
    # CRITICAL: Override the main database engine so app.main lifespan uses our test engine
    import app.core.database as database_module
    original_engine = database_module.engine
    database_module.engine = engine

    # Seed license features for this test DB
    from app.models.license import LicenseFeature
    _seed = [
        ("free", "upload_pdf"), ("free", "download_pdf"), ("free", "extract_text"),
        ("pro", "upload_pdf"), ("pro", "download_pdf"), ("pro", "extract_text"),
        ("pro", "merge_pdf"), ("pro", "split_pdf"), ("pro", "reorder_pages"),
        ("pro", "remove_pages"), ("pro", "replace_text"), ("pro", "edit_metadata"),
        ("pro", "export_txt"), ("pro", "export_png"), ("pro", "export_jpg"),
        ("pro", "import_txt"), ("pro", "max_file_size_50mb"),
        ("enterprise", "upload_pdf"), ("enterprise", "download_pdf"),
        ("enterprise", "extract_text"), ("enterprise", "merge_pdf"),
        ("enterprise", "split_pdf"), ("enterprise", "reorder_pages"),
        ("enterprise", "remove_pages"), ("enterprise", "replace_text"),
        ("enterprise", "edit_metadata"), ("enterprise", "export_txt"),
        ("enterprise", "export_png"), ("enterprise", "export_jpg"),
        ("enterprise", "export_svg"), ("enterprise", "import_txt"),
        ("enterprise", "import_images"), ("enterprise", "max_file_size_100mb"),
    ]
    SessionTest = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    s = SessionTest()
    for tier, key in _seed:
        s.add(LicenseFeature(id=str(uuid.uuid4()), tier=tier, feature_key=key, enabled=True))
    s.commit()
    s.close()

    def override_get_db():
        db = sessionmaker(autocommit=False, autoflush=False, bind=engine)()
        try:
            yield db
            db.commit()
        except Exception:
            db.rollback()
            raise
        finally:
            db.close()

    # Override deps.get_db — the function the routes actually use in Depends()
    app.dependency_overrides[deps_get_db] = override_get_db
    yield
    app.dependency_overrides.clear()
    # Restore original engine
    database_module.engine = original_engine
    engine.dispose()
    _engine = None


@pytest.fixture()
def db_engine():
    """Return the current test database engine."""
    return _engine


@pytest.fixture()
def client():
    app.state.testing = True
    with TestClient(app) as c:
        yield c
    app.state.testing = False


@pytest.fixture()
def sample_pdf_content() -> bytes:
    """Generate a minimal valid PDF using PyMuPDF."""
    doc = fitz.open()
    doc.insert_page(-1, width=612, height=792)
    data = doc.tobytes()
    doc.close()
    return data


@pytest.fixture(autouse=True)
def clean_storage():
    """Clean up storage directory after each test."""
    storage_dir = "storage/pdfs"
    os.makedirs(storage_dir, exist_ok=True)
    snapshots_dir = "storage/snapshots"
    yield
    for f in os.listdir(storage_dir):
        if f != ".gitkeep":
            os.remove(os.path.join(storage_dir, f))
    # Clean snapshot directories recursively
    if os.path.isdir(snapshots_dir):
        for root, dirs, files in os.walk(snapshots_dir, topdown=False):
            for name in files:
                os.remove(os.path.join(root, name))
            for name in dirs:
                os.rmdir(os.path.join(root, name))


# ---------------------------------------------------------------------------
# Auth helper fixtures — these register real users in the per-test DB
# ---------------------------------------------------------------------------

@pytest.fixture()
def free_token(client):
    """Register + login a free-tier user, return the JWT token string."""
    client.post(
        "/auth/register",
        json={"email": "free@test.com", "password": "TestPass123", "full_name": "Free"},
    )
    resp = client.post(
        "/auth/login",
        json={"email": "free@test.com", "password": "TestPass123"},
    )
    return resp.json()["access_token"]


@pytest.fixture()
def free_headers(free_token):
    """HTTP headers with free-tier JWT."""
    return {"Authorization": f"Bearer {free_token}"}


@pytest.fixture()
def pro_token(client, db_engine):
    """Register + login a pro-tier user, promote to pro, return the JWT."""
    client.post(
        "/auth/register",
        json={"email": "pro@test.com", "password": "ProPass123", "full_name": "Pro"},
    )
    resp = client.post(
        "/auth/login",
        json={"email": "pro@test.com", "password": "ProPass123"},
    )
    token = resp.json()["access_token"]

    me = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    user_id = me.json()["id"]

    from sqlalchemy import text
    with db_engine.connect() as conn:
        conn.execute(
            text("UPDATE users SET license_tier = 'pro' WHERE id = :uid"),
            {"uid": user_id},
        )
        conn.commit()

    return token


@pytest.fixture()
def pro_headers(pro_token):
    """HTTP headers with pro-tier JWT."""
    return {"Authorization": f"Bearer {pro_token}"}


def upload_pdf(client, headers, content, filename="test.pdf"):
    """Helper: upload a PDF with auth headers, return the doc ID."""
    resp = client.post(
        "/pdfs/upload",
        headers=headers,
        files={"file": (filename, content, "application/pdf")},
    )
    assert resp.status_code == 201, f"Upload failed: {resp.text}"
    return resp.json()["id"]
    for f in os.listdir(storage_dir):
        if f != ".gitkeep":
            os.remove(os.path.join(storage_dir, f))