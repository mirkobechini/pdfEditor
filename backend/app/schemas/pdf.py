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
    is_password_protected: bool = False
    created_at: datetime
    updated_at: datetime


class UnlockRequest(BaseModel):
    """Schema for unlocking a password-protected PDF."""
    password: str


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


class ReorderRequest(BaseModel):
    """Schema for reorder request — new page order (1-based)."""

    page_order: list[int]


class RemovePagesRequest(BaseModel):
    """Schema for remove-pages request — page numbers to remove (1-based)."""

    page_numbers: list[int]


class ReplaceTextRequest(BaseModel):
    """Schema for find & replace text in a PDF."""

    search: str
    replace: str
    occurrence: int | None = None  # None = replace all


class TextResponse(BaseModel):
    """Schema for extracted text response."""

    text: str
    pages: int


class MetadataResponse(BaseModel):
    """Schema for PDF metadata."""

    title: str | None = None
    author: str | None = None
    subject: str | None = None
    keywords: str | None = None


class UpdateMetadataRequest(BaseModel):
    """Schema for updating PDF metadata. All fields optional."""

    title: str | None = None
    author: str | None = None
    subject: str | None = None
    keywords: str | None = None


class BugReportRequest(BaseModel):
    """Schema for creating a bug report."""

    title: str
    description: str
    page_url: str | None = None
    platform: str | None = None
    app_version: str | None = None
    os_info: str | None = None


class BugReportResponse(BaseModel):
    """Schema for bug report response."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    title: str
    description: str
    page_url: str | None = None
    platform: str | None = None
    app_version: str | None = None
    os_info: str | None = None
    status: str
    report_count: int = 1
    created_at: datetime
    updated_at: datetime


class BugReportStatusUpdate(BaseModel):
    """Schema for updating a bug report status."""

    status: str  # "open", "in_progress", "resolved", "closed"


class ErrorResponse(BaseModel):
    """Schema for error responses."""

    detail: str