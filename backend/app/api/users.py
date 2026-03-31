from datetime import datetime, timedelta, timezone
from pathlib import Path
import shutil

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import get_password_hash
from app.db.deps import get_current_user, get_db, require_roles
from app.models.achievement import UserAchievement
from app.models.participation import Participation
from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate
from app.services.achievements import refresh_user_achievements
from app.services.scoring import build_user_rating_payload

router = APIRouter()
BASE_DIR = Path(__file__).resolve().parents[1]
UPLOADS_DIR = BASE_DIR / "static" / "uploads"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

def _as_utc(dt: datetime | None) -> datetime | None:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)

def _serialize_user(user: User, db: Session):
    confirmed = db.query(Participation).filter(Participation.user_id == user.id, Participation.attendance_confirmed == True).all()
    total = db.query(Participation).filter(Participation.user_id == user.id).count()
    upcoming = db.query(Participation).filter(Participation.user_id == user.id, Participation.status.in_(["registered", "planned"])).count()
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "telegram_username": user.telegram_username,
        "phone": user.phone,
        "city": user.city,
        "about": user.about,
        "photo_url": user.photo_url,
        "role": user.role,
        "status": user.status,
        "team": user.team.name if user.team else None,
        "team_id": user.team_id,
        "coins_balance": user.coins_balance,
        "streak_weeks": user.streak_weeks,
        "last_activity_at": user.last_activity_at,
        "rating": build_user_rating_payload(user, confirmed),
        "events_count": total,
        "completed_events_count": len(confirmed),
        "upcoming_events_count": upcoming,
    }

@router.get("")
def list_users(search: str | None = None, team_id: int | None = None, status: str | None = None, inactive_over_days: int | None = None, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    query = db.query(User)
    if search:
        like = f"%{search}%"
        query = query.filter(or_(User.name.ilike(like), User.email.ilike(like), User.telegram_username.ilike(like), User.city.ilike(like)))
    if team_id:
        query = query.filter(User.team_id == team_id)
    if status:
        query = query.filter(User.status == status)
    if inactive_over_days:
        edge = datetime.now(timezone.utc) - timedelta(days=inactive_over_days)
        users_for_filter = query.all()
        matched_ids = [item.id for item in users_for_filter if _as_utc(item.last_activity_at) and _as_utc(item.last_activity_at) < edge]
        query = query.filter(User.id.in_(matched_ids or [-1]))
    users = query.order_by(User.coins_balance.desc(), User.name.asc()).all()
    return [_serialize_user(user, db) for user in users]

@router.post("")
def create_user(payload: UserCreate, db: Session = Depends(get_db), _: User = Depends(require_roles("organizer"))):
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="Email уже занят")
    user = User(
        name=payload.name,
        email=payload.email,
        password_hash=get_password_hash(payload.password),
        telegram_username=payload.telegram_username,
        phone=payload.phone,
        team_id=payload.team_id,
        role="volunteer",
        city=payload.city,
        about=payload.about,
        status="active",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"id": user.id, "message": "Пользователь создан"}

@router.get("/{user_id}")
def get_user(user_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    participations = db.query(Participation).filter(Participation.user_id == user_id).all()
    refresh_user_achievements(db, user_id)
    achievements = db.query(UserAchievement).filter(UserAchievement.user_id == user_id).all()
    payload = _serialize_user(user, db)
    payload.update({
        "activity_history": [
            {
                "event_id": p.event_id,
                "title": p.event.title,
                "status": p.status,
                "attendance_confirmed": p.attendance_confirmed,
                "coins_awarded": p.coins_awarded,
                "date": p.event.starts_at,
            }
            for p in participations
        ],
        "achievements": [
            {
                "name": ua.achievement.name,
                "icon": ua.achievement.icon,
                "description": ua.achievement.description,
            }
            for ua in achievements
        ],
    })
    return payload

@router.patch("/me")
def update_me(payload: UserUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    safe_fields = {"name", "telegram_username", "phone", "team_id", "city", "about", "photo_url"}
    for field, value in payload.model_dump(exclude_unset=True).items():
        if field in safe_fields:
            setattr(user, field, value)
    db.commit()
    db.refresh(user)
    return {"message": "Профиль обновлён", "user": _serialize_user(user, db)}

@router.post("/me/photo")
def upload_my_photo(file: UploadFile = File(...), db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    suffix = Path(file.filename or "avatar.jpg").suffix or ".jpg"
    filename = f"user_{user.id}{suffix}"
    target = UPLOADS_DIR / filename
    with target.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    user.photo_url = f"/uploads/{filename}"
    db.commit()
    db.refresh(user)
    return {"message": "Фото обновлено", "photo_url": user.photo_url}

@router.patch("/{user_id}")
def update_user(user_id: int, payload: UserUpdate, db: Session = Depends(get_db), current: User = Depends(get_current_user)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    allowed = {"name", "telegram_username", "phone", "team_id", "city", "about", "photo_url"}
    if current.role == "organizer":
        allowed |= {"status", "coins_balance"}
    elif current.id != user.id:
        raise HTTPException(status_code=403, detail="Недостаточно прав")
    for field, value in payload.model_dump(exclude_unset=True).items():
        if field in allowed:
            setattr(user, field, value)
    db.commit()
    db.refresh(user)
    return {"message": "Профиль обновлён", "user": _serialize_user(user, db)}

@router.post("/{user_id}/recalculate-status")
def recalc_status(user_id: int, db: Session = Depends(get_db), _: User = Depends(require_roles("organizer"))):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    edge = datetime.now(timezone.utc) - timedelta(days=settings.inactivity_days)
    user.status = "inactive" if _as_utc(user.last_activity_at) and _as_utc(user.last_activity_at) < edge else "active"
    db.commit()
    return {"message": f"Статус: {user.status}"}
