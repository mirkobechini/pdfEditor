from contextlib import asynccontextmanager
import logging
import signal

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

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
from app.core.csrf import CSRFMiddleware
from app.core.database import Base, engine
from app.core.limiter import limiter

logger = logging.getLogger("pdfeditor")


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
    # Shutdown: cleanup resources
    logger.info("Shutting down — cleaning up resources...")
    _cleanup_on_shutdown()


def _cleanup_on_shutdown():
    """Cleanup resources on shutdown — close PyMuPDF handles, release locks."""
    from app.services.pdf_service import _cleanup_all_pdf_handles
    _cleanup_all_pdf_handles()
    logger.info("Cleanup complete.")


def _seed_license_features():
    """Seed default license features if table is empty."""
    from sqlalchemy import text

    from app.core.database import SessionLocal
    from app.core.license_seed import DEFAULT_LICENSE_FEATURES
    from app.models.license import LicenseFeature

    db = SessionLocal()
    try:
        count = db.execute(text("SELECT COUNT(*) FROM license_features")).scalar()
        if count and count > 0:
            return  # Already seeded

        import uuid
        from datetime import datetime, timezone

        for tier, key in DEFAULT_LICENSE_FEATURES:
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
            logger.info("Super admin '%s' promoted on startup.", settings.SUPER_ADMIN_EMAIL)
    finally:
        db.close()


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    lifespan=lifespan,
)

# ---------------------------------------------------------------------------
# Rate limiter — registered on app state
# ---------------------------------------------------------------------------

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


# ---------------------------------------------------------------------------
# Health check — required by Render/Railway for zero-downtime deploys
# ---------------------------------------------------------------------------

@app.get("/health", tags=["system"])
def health_check():
    """Return 200 if the application is running."""
    return {"status": "ok"}


# ---------------------------------------------------------------------------
# Request ID middleware
# ---------------------------------------------------------------------------

@app.middleware("http")
async def add_request_id(request: Request, call_next):
    import uuid
    request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
    request.state.request_id = request_id
    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    return response


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
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
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

# CSRF protection — must be after CORS middleware
app.add_middleware(CSRFMiddleware)

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