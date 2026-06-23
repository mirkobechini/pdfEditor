from collections.abc import Generator

from fastapi import Depends
from sqlalchemy.orm import Session

from app.core.database import get_db as _get_db
from app.services.pdf_service import PdfService


def get_db() -> Generator[Session, None, None]:
    yield from _get_db()


def get_pdf_service(db: Session = Depends(get_db)) -> PdfService:
    return PdfService(db)