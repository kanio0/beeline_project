from datetime import datetime
from pydantic import BaseModel


class EventCreate(BaseModel):
    title: str
    description: str | None = None
    event_type: str
    city: str | None = None
    starts_at: datetime
    ends_at: datetime | None = None
    status: str = "planned"
    base_coins: int = 10
    quality: str = "base"
    audience_size: int = 0
    organizer_id: int | None = None
    required_roles: list[str] | None = None


class ParticipationCreate(BaseModel):
    user_id: int
    event_id: int
    role: str = "participant"


class ParticipationConfirm(BaseModel):
    attendance_confirmed: bool | None = None
    quality: str | None = None
    role: str | None = None
    status: str | None = None
