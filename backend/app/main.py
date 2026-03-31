from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text

from app.api.router import api_router
from app.core.config import settings
from app.db.session import Base, engine, SessionLocal
from app.db.seed import seed_database
from app.bot.runner import maybe_start_bot

Base.metadata.create_all(bind=engine)


def ensure_schema():
    with engine.begin() as conn:
        if settings.database_url.startswith("sqlite"):
            columns = {row[1] for row in conn.exec_driver_sql("PRAGMA table_info(users)").fetchall()}
            if "about" not in columns:
                conn.exec_driver_sql("ALTER TABLE users ADD COLUMN about TEXT")
            if "photo_url" not in columns:
                conn.exec_driver_sql("ALTER TABLE users ADD COLUMN photo_url VARCHAR(255)")
            event_columns = {row[1] for row in conn.exec_driver_sql("PRAGMA table_info(events)").fetchall()}
            if "required_roles" not in event_columns:
                conn.exec_driver_sql("ALTER TABLE events ADD COLUMN required_roles TEXT")


def ensure_seeded():
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()


ensure_schema()
ensure_seeded()


@asynccontextmanager
async def lifespan(app: FastAPI):
    maybe_start_bot()
    yield


BASE_DIR = Path(__file__).resolve().parent
UPLOADS_DIR = BASE_DIR / "static" / "uploads"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(title=settings.app_name, lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.mount("/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")
app.include_router(api_router, prefix="/api")


@app.get("/")
def root():
    return {"status": "ok", "app": settings.app_name}
