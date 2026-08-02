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
    is_admin: bool
    is_guest: bool
    license_tier: str
    license_tier_source: str
    google_id: str | None = None
    created_at: datetime
    updated_at: datetime


class UpdateLicenseRequest(BaseModel):
    """Schema for updating a user's license tier (admin only)."""

    license_tier: str


class UpdateAdminRequest(BaseModel):
    """Schema for promoting/demoting a user to/from admin."""

    is_admin: bool


class UserUpdateRequest(BaseModel):
    """Schema for updating user profile."""

    full_name: str | None = None


class LicenseFeatureResponse(BaseModel):
    """Schema for a single license feature."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    tier: str
    feature_key: str
    enabled: bool


class TokenResponse(BaseModel):
    """Schema for JWT token response."""

    access_token: str
    token_type: str = "bearer"
    csrf_token: str | None = None


class GoogleLoginRequest(BaseModel):
    """Schema for Google SSO login request."""

    id_token: str


class UnlinkGoogleRequest(BaseModel):
    """Schema for unlinking Google from account."""

    password: str


class ForgotPasswordRequest(BaseModel):
    """Schema for requesting a password reset email."""

    email: str


class SyncUserRequest(BaseModel):
    """Schema for syncing a cloud user to the local sidecar database."""

    id: str
    email: str
    full_name: str
    is_active: bool = True
    is_admin: bool = False
    is_guest: bool = False
    license_tier: str = "free"
    license_tier_source: str = "admin"
    google_id: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None


class ResetPasswordRequest(BaseModel):
    """Schema for resetting password with a token."""

    token: str
    new_password: str


class GuestTokenResponse(BaseModel):
    """Schema for guest authentication response."""

    access_token: str
    token_type: str = "bearer"
    csrf_token: str | None = None
    user: UserResponse


class GuestConvertRequest(BaseModel):
    """Schema for converting guest account to full registration."""

    email: str
    password: str
    full_name: str

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        if "@" not in v or "." not in v.split("@")[-1]:
            raise ValueError("Invalid email address")
        return v.lower().strip()