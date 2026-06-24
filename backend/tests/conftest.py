import os
import uuid

import fitz
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.api.deps import get_db as deps_get_db
from app.core.database import Base
from app.main import app

_engine = None  # Store the current test engine


@pytest.fixture(autouse=True)
def per_test_db(tmp_path):
    """Each test gets its OWN SQLite file + overrides deps.get_db correctly."""
    global _engine
    db_path = os.path.join(tmp_path, f"test_{uuid.uuid4().hex}.db")
    engine = create_engine(
        f"sqlite:///{db_path}",
        connect_args={"check_same_thread": False},
    )
    Base.metadata.create_all(bind=engine)
    _engine = engine

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
    engine.dispose()
    _engine = None


@pytest.fixture()
def db_engine():
    """Return the current test database engine."""
    return _engine


@pytest.fixture()
def client():
    with TestClient(app) as c:
        yield c


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
    yield
    for f in os.listdir(storage_dir):
        if f != ".gitkeep":
            os.remove(os.path.join(storage_dir, f))