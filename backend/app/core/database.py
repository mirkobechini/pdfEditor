import datetime
import sqlite3
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.core.config import settings

# Register datetime adapter for SQLite to suppress Python 3.12+ deprecation warning
sqlite3.register_adapter(datetime.datetime, lambda dt: dt.isoformat())

# Ensure the database directory exists (important for PyInstaller bundles)
db_path = Path(settings.DATABASE_URL.replace("sqlite:///", ""))
db_path.parent.mkdir(parents=True, exist_ok=True)

# Ensure the PDF storage directory exists (important for PyInstaller bundles)
storage_path = Path(settings.UPLOAD_DIR)
try:
    storage_path.mkdir(parents=True, exist_ok=True)
    # Write debug log to confirm path
    log_path = db_path.parent / "startup_debug.log"
    log_path.write_text(
        f"DB_URL: {settings.DATABASE_URL}\n"
        f"UPLOAD_DIR: {settings.UPLOAD_DIR}\n"
        f"storage_path: {storage_path}\n"
        f"storage_exists: {storage_path.exists()}\n"
        f"_MEIPASS: {hasattr(sys, '_MEIPASS')}\n"
    )
except Exception as e:
    log_path = db_path.parent / "startup_error.log"
    log_path.write_text(f"ERROR creating storage dir: {e}\nUPLOAD_DIR: {settings.UPLOAD_DIR}\n")

# Configure engine based on database type
if "postgresql" in settings.DATABASE_URL:
    # PostgreSQL with psycopg v3 — connection pooling for production
    engine = create_engine(
        settings.DATABASE_URL,
        echo=settings.DEBUG,
        pool_size=10,
        max_overflow=20,
        pool_pre_ping=True,
        pool_recycle=3600,
    )
else:
    # SQLite (local development)
    engine = create_engine(
        settings.DATABASE_URL,
        connect_args={"check_same_thread": False},  # Needed for SQLite
        echo=settings.DEBUG,
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()