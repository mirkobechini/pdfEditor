from datetime import datetime

from pydantic import BaseModel, ConfigDict


class PdfResponse(BaseModel):
    """Schema for a single PDF document response."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    original_filename: str
    file_size: int
    page_count: int
    title: str | None = None
    author: str | None = None
    created_at: datetime
    updated_at: datetime


class PdfListResponse(BaseModel):
    """Schema for list of PDF documents."""

    items: list[PdfResponse]
    total: int


class ErrorResponse(BaseModel):
    """Schema for error responses."""

    detail: str