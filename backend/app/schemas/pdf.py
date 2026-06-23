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


class MergeRequest(BaseModel):
    """Schema for merge request — list of PDF IDs to merge."""

    pdf_ids: list[str]


class SplitRequest(BaseModel):
    """Schema for split request."""

    mode: str  # "range" or "every"
    ranges: list[str] | None = None  # e.g. ["1-3", "5-7"] — required when mode="range"


class SplitResponse(BaseModel):
    """Schema for split response — list of resulting PDFs."""

    items: list[PdfResponse]


class ErrorResponse(BaseModel):
    """Schema for error responses."""

    detail: str