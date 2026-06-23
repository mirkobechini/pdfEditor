from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    APP_NAME: str = "PdfEditor API"
    VERSION: str = "0.1.0"
    DEBUG: bool = True

    # Security
    SECRET_KEY: str = "dev-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # Database
    DATABASE_URL: str = "sqlite:///./pdf_editor.db"

    # Storage
    UPLOAD_DIR: str = "storage/pdfs"
    MAX_UPLOAD_SIZE_MB: int = 50
    ALLOWED_EXTENSIONS: list[str] = [".pdf"]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()