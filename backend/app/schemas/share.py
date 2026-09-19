from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class ShareLinkCreate(BaseModel):
    """Request to create a shareable link for a PDF."""
    password: Optional[str] = None
    expires_in_days: Optional[int] = None  # None = no expiry


class ShareLinkResponse(BaseModel):
    """Response with the shareable link details."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    pdf_id: str
    token: str
    url: str
    has_password: bool = False
    expires_at: Optional[datetime] = None
    created_at: datetime


class ShareAccessRequest(BaseModel):
    """Request to access a shared PDF (password required if set)."""
    password: Optional[str] = None


class ShareInfoResponse(BaseModel):
    """Public info about a shared PDF (no auth required)."""

    model_config = ConfigDict(from_attributes=True)

    token: str
    filename: str
    has_password: bool = False
    expires_at: Optional[datetime] = None