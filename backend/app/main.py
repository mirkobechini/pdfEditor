from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.v1.admin import router as admin_router
from app.api.v1.auth import router as auth_router
from app.api.v1.bug_report import router as bug_report_router
from app.api.v1.convert import router as convert_router
from app.api.v1.metadata import router as metadata_router
from app.api.v1.merge_split import router as merge_split_router
from app.api.v1.reorder import router as reorder_router
from app.api.v1.text import router as text_router
from app.api.v1.unlock import router as unlock_router
from app.api.v1.upload import router as pdf_router
from app.api.v1.undo_redo import router as undo_redo_router
from app.core.config import settings
from app.core.database import Base, engine


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create tables (skip if running in test mode)
    if not getattr(app.state, "testing", False):
        Base.metadata.create_all(bind=engine)
        # Seed license features
        _seed_license_features()
        # Seed super admin if not exists
        _seed_super_admin()
    yield


def _seed_license_features():
    """Seed default license features if table is empty."""
    from sqlalchemy import text

    from app.core.database import SessionLocal
    from app.models.license import LicenseFeature

    db = SessionLocal()
    try:
        count = db.execute(text("SELECT COUNT(*) FROM license_features")).scalar()
        if count and count > 0:
            return  # Already seeded

        import uuid
        from datetime import datetime, timezone

        features = [
            # Free
            ("free", "upload_pdf"), ("free", "download_pdf"), ("free", "extract_text"),
            # Pro — all free + advanced
            ("pro", "upload_pdf"), ("pro", "download_pdf"), ("pro", "extract_text"),
            ("pro", "merge_pdf"), ("pro", "split_pdf"), ("pro", "reorder_pages"),
            ("pro", "remove_pages"), ("pro", "replace_text"), ("pro", "edit_metadata"),
            ("pro", "export_txt"), ("pro", "export_png"), ("pro", "export_jpg"),
            ("pro", "import_txt"), ("pro", "max_file_size_50mb"),
            # Enterprise — all
            ("enterprise", "upload_pdf"), ("enterprise", "download_pdf"),
            ("enterprise", "extract_text"), ("enterprise", "merge_pdf"),
            ("enterprise", "split_pdf"), ("enterprise", "reorder_pages"),
            ("enterprise", "remove_pages"), ("enterprise", "replace_text"),
            ("enterprise", "edit_metadata"), ("enterprise", "export_txt"),
            ("enterprise", "export_png"), ("enterprise", "export_jpg"),
            ("enterprise", "export_svg"), ("enterprise", "import_txt"),
            ("enterprise", "import_images"), ("enterprise", "max_file_size_100mb"),
        ]

        for tier, key in features:
            lf = LicenseFeature(
                id=str(uuid.uuid4()),
                tier=tier,
                feature_key=key,
                enabled=True,
            )
            db.add(lf)

        db.commit()
    finally:
        db.close()


def _seed_super_admin():
    """Ensure the super admin user exists. Does NOT create if not already registered."""
    from app.core.database import SessionLocal
    from app.models.user import User
    from app.repositories.user_repo import UserRepository

    db = SessionLocal()
    try:
        repo = UserRepository(db)
        user = repo.get_by_email(settings.SUPER_ADMIN_EMAIL)
        if user and not user.is_admin:
            user.is_admin = True
            db.flush()
            db.commit()
            print(f"🔐 Super admin '{settings.SUPER_ADMIN_EMAIL}' promoted on startup.")
    finally:
        db.close()


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    lifespan=lifespan,
)


# ---------------------------------------------------------------------------
# Custom exception handler — flatten Pydantic validation errors
# ---------------------------------------------------------------------------

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Return a flat error message instead of Pydantic's nested structure."""
    first_error = exc.errors()[0] if exc.errors() else {}
    msg = first_error.get("msg", str(exc))
    # Pydantic prepends "Value error, " — strip it
    if msg.startswith("Value error, "):
        msg = msg[len("Value error, "):]
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        content={"detail": msg},
    )


# CORS — restrict origins in production (read from ALLOWED_ORIGINS env var)
# For local development, defaults to http://localhost:3000
allow_origins = settings.allowed_origins_list if settings.allowed_origins_list else ["http://localhost:3000"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth_router)
app.include_router(admin_router)
app.include_router(bug_report_router)
app.include_router(pdf_router)
app.include_router(merge_split_router)
app.include_router(metadata_router)
app.include_router(convert_router)
app.include_router(reorder_router)
app.include_router(text_router)
app.include_router(unlock_router)
app.include_router(undo_redo_router)