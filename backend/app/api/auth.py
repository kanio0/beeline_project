from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from app.core.security import create_access_token, verify_password
from app.db.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.auth import TokenResponse

router = APIRouter()


def serialize_user(user: User):
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role,
        "status": user.status,
        "telegram_username": user.telegram_username,
        "phone": user.phone,
        "team_id": user.team_id,
        "team": user.team.name if user.team else None,
        "city": user.city,
        "about": user.about,
        "photo_url": user.photo_url,
        "coins_balance": user.coins_balance,
    }


@router.post("/login", response_model=TokenResponse)
async def login(request: Request, db: Session = Depends(get_db)):
    """
    Принимает логин в обоих популярных форматах:
    1) JSON: {"email": "...", "password": "..."}
    2) form-urlencoded / multipart: username/email + password
    """
    email = None
    password = None

    content_type = (request.headers.get("content-type") or "").lower()

    if "application/json" in content_type:
        try:
            payload = await request.json()
        except Exception:
            payload = {}
        email = payload.get("email") or payload.get("username")
        password = payload.get("password")
    else:
        try:
            form = await request.form()
        except Exception:
            form = {}
        email = form.get("email") or form.get("username")
        password = form.get("password")

    if not email or not password:
        raise HTTPException(
            status_code=422,
            detail="Ожидались поля email/username и password",
        )

    user = db.query(User).filter(User.email == str(email).strip()).first()
    if not user or not verify_password(str(password), user.password_hash):
        raise HTTPException(status_code=400, detail="Неверный логин или пароль")

    token = create_access_token(user.email)
    return {"access_token": token, "token_type": "bearer", "user": serialize_user(user)}


@router.get("/me")
def me(user: User = Depends(get_current_user)):
    return serialize_user(user)
