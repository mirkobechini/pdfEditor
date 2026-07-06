from pathlib import Path

from pydantic import ConfigDict
from pydantic_settings import BaseSettings

# Backend root = 3 levels up from app/core/config.py
BACKEND_DIR = Path(__file__).parent.parent.parent


class Settings(BaseSettings):
    APP_NAME: str = "PdfEditor API"
    VERSION: str = "0.1.0"
    DEBUG: bool = True

    # Security
    SECRET_KEY: str = "dev-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # Google OAuth
    GOOGLE_CLIENT_ID: str = ""  # Set in .env for production
    GOOGLE_CLIENT_SECRET: str = ""  # Set in .env for production

    # Database — use as_posix() to get forward slashes for SQLAlchemy URI
    DATABASE_URL: str = f"sqlite:///{(BACKEND_DIR / 'pdf_editor.db').as_posix()}"

    # Storage — absolute path to backend/storage/pdfs
    UPLOAD_DIR: str = (BACKEND_DIR / "storage" / "pdfs").as_posix()
    MAX_UPLOAD_SIZE_MB: int = 50
    MAX_PAGE_COUNT: int = 500
    # Store as comma-separated string in .env for compatibility with Pydantic Settings
    ALLOWED_EXTENSIONS: str = ".pdf"

    @property
    def allowed_extensions_list(self) -> list[str]:
        """Return ALLOWED_EXTENSIONS as a list."""
        return [ext.strip() for ext in self.ALLOWED_EXTENSIONS.split(",") if ext.strip()]

    # Admin Configuration
    # Super admin email (cannot be revoked) — read from .env or use default
    SUPER_ADMIN_EMAIL: str = "admin@pdfeditor.local"

    # SMTP (for password reset emails)
    SMTP_HOST: str = "localhost"
    SMTP_PORT: int = 1025
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_USE_TLS: bool = False
    SMTP_FROM_EMAIL: str = "noreply@pdfeditor.app"

    # Password reset
    RESET_TOKEN_EXPIRE_MINUTES: int = 30

    # Frontend URL (for password reset link)
    FRONTEND_URL: str = "http://localhost:3000"

    # Undo/redo snapshots
    MAX_SNAPSHOTS: int = 10

    model_config = ConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
    )


settings = Settings()