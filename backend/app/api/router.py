from fastapi import APIRouter
from app.api import auth, users, teams, events, dashboard, uploads

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(teams.router, prefix="/teams", tags=["teams"])
api_router.include_router(events.router, prefix="/events", tags=["events"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
api_router.include_router(uploads.router, prefix="/uploads", tags=["uploads"])

@api_router.get("/health")
def health():
    return {"status": "ok"}
