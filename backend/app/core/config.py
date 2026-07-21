from pathlib import Path

from pydantic import ConfigDict, field_validator
from pydantic_settings import BaseSettings

# Backend root = 3 levels up from app/core/config.py
BACKEND_DIR = Path(__file__).parent.parent.parent


class Settings(BaseSettings):
    APP_NAME: str = "PdfEditor API"
    VERSION: str = "0.1.0"
    DEBUG: bool = False

    # Security — JWT_SECRET_KEY is required in production (via .env or env variable)
    # SECRET_KEY empty by default; must be set explicitly in .env for production
    SECRET_KEY: str = ""
    # Alternative env var name for Render/Docker deployments
    JWT_SECRET_KEY: str = ""
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # CORS origins (production should restrict this)
    ALLOWED_ORIGINS: str = "http://localhost:3000"

    @field_validator("ALLOWED_ORIGINS", mode="before")
    @classmethod
    def parse_allowed_origins(cls, v: str) -> str:
        """Normalize comma-separated origins — strip spaces around commas."""
        if isinstance(v, str):
            return ",".join(url.strip() for url in v.split(",") if url.strip())
        return v

    # Google OAuth
    GOOGLE_CLIENT_ID: str = ""  # Set in .env for production
    GOOGLE_CLIENT_SECRET: str = ""  # Set in .env for production

    # Database — use as_posix() to get forward slashes for SQLAlchemy URI
    DATABASE_URL: str = f"sqlite:///{(BACKEND_DIR / 'pdf_editor.db').as_posix()}"

    @field_validator("DATABASE_URL", mode="after")
    @classmethod
    def normalize_database_url(cls, v: str) -> str:
        """Ensure PostgreSQL URLs use psycopg (v3) dialect instead of psycopg2."""
        if v.startswith("postgresql://") and "+psycopg" not in v:
            # Convert postgresql:// to postgresql+psycopg://
            return v.replace("postgresql://", "postgresql+psycopg://", 1)
        return v

    # Storage — absolute path to backend/storage/pdfs
    UPLOAD_DIR: str = (BACKEND_DIR / "storage" / "pdfs").as_posix()
    MAX_UPLOAD_SIZE_MB: int = 50
    MAX_PAGE_COUNT: int = 500

    # S3-compatible storage (Cloudflare R2 / AWS S3)
    # Set STORAGE_BACKEND=s3 to use S3 instead of local filesystem
    STORAGE_BACKEND: str = "local"  # "local" | "s3"
    S3_BUCKET: str = ""
    S3_ENDPOINT: str = ""  # Required for R2 (e.g. https://<id>.r2.cloudflarestorage.com)
    S3_ACCESS_KEY: str = ""
    S3_SECRET_KEY: str = ""
    S3_REGION: str = "auto"  # "auto" for R2, "us-east-1" for AWS
    # Store as comma-separated string in .env for compatibility with Pydantic Settings
    ALLOWED_EXTENSIONS: str = ".pdf"

    @property
    def allowed_extensions_list(self) -> list[str]:
        """Return ALLOWED_EXTENSIONS as a list."""
        return [ext.strip() for ext in self.ALLOWED_EXTENSIONS.split(",") if ext.strip()]

    @property
    def effective_secret_key(self) -> str:
        """Return JWT_SECRET_KEY if set, otherwise fall back to SECRET_KEY."""
        return self.JWT_SECRET_KEY if self.JWT_SECRET_KEY else self.SECRET_KEY

    @property
    def allowed_origins_list(self) -> list[str]:
        """Return ALLOWED_ORIGINS as a list of URLs (spaces already normalized)."""
        return [url.strip() for url in self.ALLOWED_ORIGINS.split(",") if url.strip()]

    # Admin Configuration
    # Super admin email (cannot be revoked) — read from .env or use default
    SUPER_ADMIN_EMAIL: str = "admin@pdfeditor.local"

    # SMTP / SendGrid (for password reset emails)
    # Uses SendGrid HTTP API (not SMTP) because Render free tier blocks port 587.
    # SMTP_PASSWORD should be the SendGrid API key.
    # SMTP_FROM_EMAIL should be a verified sender in SendGrid.
    SMTP_SERVER: str = "smtp.sendgrid.net"  # Not used directly (HTTP API fallback)
    SMTP_PORT: int = 587  # Not used directly (HTTP API fallback)
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: str = "noreply@mirkobechini.com"

    # Password reset
    RESET_TOKEN_EXPIRE_MINUTES: int = 30

    # Frontend URL (for password reset link)
    FRONTEND_URL: str = "http://localhost:3000"

    # Undo/redo snapshots
    MAX_SNAPSHOTS: int = 10

    # License enforcement
    # When True, all features are available to all users regardless of tier.
    # Set to False in production when license system is activated.
    DISABLE_LICENSE_ENFORCEMENT: bool = False

    # CSRF protection
    # Set to True to disable CSRF (e.g., in tests)
    DISABLE_CSRF: bool = False

    model_config = ConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
    )


settings = Settings()