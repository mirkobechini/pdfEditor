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


@pytest.fixture(autouse=True)
def per_test_db(tmp_path):
    """Each test gets its OWN SQLite file + overrides deps.get_db correctly."""
    db_path = os.path.join(tmp_path, f"test_{uuid.uuid4().hex}.db")
    engine = create_engine(
        f"sqlite:///{db_path}",
        connect_args={"check_same_thread": False},
    )
    Base.metadata.create_all(bind=engine)

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