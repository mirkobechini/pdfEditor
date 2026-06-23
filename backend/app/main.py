from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.metadata import router as metadata_router
from app.api.v1.merge_split import router as merge_split_router
from app.api.v1.reorder import router as reorder_router
from app.api.v1.text import router as text_router
from app.api.v1.upload import router as pdf_router
from app.core.config import settings
from app.core.database import Base, engine


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create tables
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    lifespan=lifespan,
)

# CORS — allow all origins in dev (Tauri and Next.js)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(pdf_router)
app.include_router(merge_split_router)
app.include_router(metadata_router)
app.include_router(reorder_router)
app.include_router(text_router)