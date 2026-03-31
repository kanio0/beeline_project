from pydantic import BaseModel, EmailStr

class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    telegram_username: str | None = None
    phone: str | None = None
    team_id: int | None = None
    role: str = "volunteer"
    city: str | None = None
    about: str | None = None

class UserUpdate(BaseModel):
    name: str | None = None
    telegram_username: str | None = None
    phone: str | None = None
    team_id: int | None = None
    city: str | None = None
    status: str | None = None
    coins_balance: int | None = None
    about: str | None = None
    photo_url: str | None = None
