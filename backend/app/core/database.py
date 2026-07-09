import datetime
import sqlite3

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.core.config import settings

# Register datetime adapter for SQLite to suppress Python 3.12+ deprecation warning
sqlite3.register_adapter(datetime.datetime, lambda dt: dt.isoformat())

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