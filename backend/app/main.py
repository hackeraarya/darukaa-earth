from contextlib import asynccontextmanager

import logging

from fastapi import FastAPI, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app.config import settings
from app.database import Base, engine
from app.models import Project, Simulation, Site, User  # noqa: F401
from app.routers import auth, projects, sites

logger = logging.getLogger(__name__)

FRONTEND_ORIGINS = [
    origin.strip().strip("[]").strip("\"'")
    for origin in settings.frontend_origins.split(",")
    if origin.strip().strip("[]").strip("\"'")
]


@asynccontextmanager
async def lifespan(_app: FastAPI):
    try:
        with engine.begin() as connection:
            connection.execute(text("CREATE EXTENSION IF NOT EXISTS postgis"))
        Base.metadata.create_all(bind=engine)
    except SQLAlchemyError:
        logger.exception("Database setup failed; API started without persistence")
    yield


app = FastAPI(
    title="Darukaa.Earth API",
    description="Hackathon backend for restoration projects and PostGIS sites.",
    version="0.1.0",
    lifespan=lifespan,
)


@app.exception_handler(SQLAlchemyError)
async def database_exception_handler(_request: Request, _exc: SQLAlchemyError):
    return Response(
        content='{"detail":"Database unavailable. Check DATABASE_URL and PostgreSQL connectivity."}',
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        media_type="application/json",
    )

app.add_middleware(
    CORSMiddleware,
    allow_origins=FRONTEND_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(projects.router)
app.include_router(sites.router)

@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/health/db")
def database_health(response: Response):
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
    except SQLAlchemyError as exc:
        logger.warning("Database health check failed: %s", exc)
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return {"status": "error", "database": "unavailable"}
    return {"status": "ok", "database": "ok"}
