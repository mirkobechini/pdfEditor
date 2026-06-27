from pathlib import Path

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
    ALLOWED_EXTENSIONS: list[str] = [".pdf"]

    # Super admin (cannot be revoked)
    SUPER_ADMIN_EMAIL: str = "mirkobechini@gmail.com"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()