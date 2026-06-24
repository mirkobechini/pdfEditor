from datetime import datetime

from pydantic import BaseModel, ConfigDict, field_validator


class UserRegisterRequest(BaseModel):
    """Schema for user registration."""

    email: str
    password: str
    full_name: str

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        if "@" not in v or "." not in v.split("@")[-1]:
            raise ValueError("Invalid email address")
        return v.lower().strip()


class UserLoginRequest(BaseModel):
    """Schema for user login."""

    email: str
    password: str


class UserResponse(BaseModel):
    """Schema for user response (never includes password)."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    email: str
    full_name: str
    is_active: bool
    created_at: datetime
    updated_at: datetime


class TokenResponse(BaseModel):
    """Schema for JWT token response."""

    access_token: str
    token_type: str = "bearer"


class GoogleLoginRequest(BaseModel):
    """Schema for Google SSO login request."""

    id_token: str