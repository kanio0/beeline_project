from datetime import datetime, timezone
from pathlib import Path
import shutil

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.db.deps import get_current_user, get_db, require_roles
from app.models.coin_transaction import CoinTransaction
from app.models.event import Event
from app.models.participation import Participation
from app.models.photo_report import PhotoReport
from app.models.user import User
from app.schemas.event import EventCreate, ParticipationConfirm, ParticipationCreate
from app.services.achievements import refresh_user_achievements
from app.services.ics import event_to_ics
from app.services.scoring import calculate_event_score

router = APIRouter()
BASE_DIR = Path(__file__).resolve().parents[1]
UPLOADS_DIR = BASE_DIR / "static" / "uploads"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)


def _roles_to_list(value):
    if not value:
        return []
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()]
    return [item.strip() for item in str(value).split(",") if item.strip()]


def _serialize_report(report: PhotoReport):
    return {
        "id": report.id,
        "image_url": report.image_url,
        "comment": report.comment,
        "likes": report.likes,
        "created_at": report.created_at,
        "user_name": report.user.name if getattr(report, "user", None) else None,
    }


def _serialize_event(e: Event, current_user: User | None = None):
    my_participation = None
    if current_user is not None:
        my_participation = next((p for p in e.participations if p.user_id == current_user.id), None)
    return {
        "id": e.id,
        "title": e.title,
        "description": e.description,
        "event_type": e.event_type,
        "city": e.city,
        "starts_at": e.starts_at,
        "ends_at": e.ends_at,
        "status": e.status,
        "base_coins": e.base_coins,
        "quality": e.quality,
        "audience_size": e.audience_size,
        "participants_count": len(e.participations),
        "attendance_count": sum(1 for p in e.participations if p.attendance_confirmed),
        "organizer": e.organizer.name if e.organizer else None,
        "required_roles": _roles_to_list(e.required_roles),
        "photo_reports_count": len(e.photo_reports),
        "is_registered": my_participation is not None,
        "my_participation_id": my_participation.id if my_participation else None,
        "my_role": my_participation.role if my_participation else None,
        "my_status": my_participation.status if my_participation else None,
    }


@router.get("")
def list_events(
    status: str | None = None,
    event_type: str | None = None,
    mine: bool = False,
    available: bool = False,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    query = db.query(Event)
    if status:
        query = query.filter(Event.status == status)
    if event_type:
        query = query.filter(Event.event_type == event_type)
    events = query.order_by(Event.starts_at.asc()).all()
    if mine:
        events = [e for e in events if any(p.user_id == user.id for p in e.participations)]
    if available:
        events = [e for e in events if not any(p.user_id == user.id for p in e.participations)]
    return [_serialize_event(e, user) for e in events]


@router.get("/{event_id}")
def get_event(event_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Событие не найдено")
    payload = _serialize_event(event, user)
    payload["participants"] = [
        {
            "id": p.id,
            "user_id": p.user_id,
            "name": p.user.name if p.user else "—",
            "role": p.role,
            "status": p.status,
            "attendance_confirmed": p.attendance_confirmed,
            "coins_awarded": p.coins_awarded,
            "photo_url": p.user.photo_url if p.user else None,
        }
        for p in event.participations
    ]
    payload["photo_reports"] = [_serialize_report(r) for r in event.photo_reports]
    return payload


@router.post("")
def create_event(payload: EventCreate, db: Session = Depends(get_db), user: User = Depends(require_roles("organizer"))):
    event = Event(**payload.model_dump(exclude={"required_roles"}))
    event.required_roles = ", ".join(_roles_to_list(payload.required_roles))
    if not event.organizer_id:
        event.organizer_id = user.id
    db.add(event)
    db.commit()
    db.refresh(event)
    return {"id": event.id, "message": "Событие создано"}


@router.patch("/{event_id}")
def update_event(event_id: int, payload: EventCreate, db: Session = Depends(get_db), _: User = Depends(require_roles("organizer"))):
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Событие не найдено")
    for field, value in payload.model_dump(exclude_unset=True, exclude={"required_roles"}).items():
        setattr(event, field, value)
    if payload.required_roles is not None:
        event.required_roles = ", ".join(_roles_to_list(payload.required_roles))
    db.commit()
    return {"message": "Событие обновлено"}


@router.post("/participation")
def join_event(payload: ParticipationCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    target_user_id = payload.user_id if user.role in {"organizer"} else user.id
    event = db.query(Event).filter(Event.id == payload.event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Событие не найдено")
    exists = db.query(Participation).filter(Participation.user_id == target_user_id, Participation.event_id == payload.event_id).first()
    if exists:
        raise HTTPException(status_code=400, detail="Участие уже создано")
    p = Participation(user_id=target_user_id, event_id=payload.event_id, role=payload.role)
    db.add(p)
    db.commit()
    db.refresh(p)
    return {"message": "Запись на событие выполнена", "participation_id": p.id}


@router.patch("/participation/{participation_id}")
def update_participation(
    participation_id: int,
    payload: ParticipationConfirm,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    participation = db.query(Participation).filter(Participation.id == participation_id).first()
    if not participation:
        raise HTTPException(status_code=404, detail="Запись не найдена")

    is_owner = participation.user_id == user.id
    if not (is_owner or user.role == "organizer"):
        raise HTTPException(status_code=403, detail="Недостаточно прав")

    # volunteer can edit role/cancel before confirmation; organizer can confirm attendance
    if payload.role is not None:
        participation.role = payload.role
    if payload.status is not None and payload.status in {"registered", "cancelled", "completed"}:
        if user.role == "organizer" or payload.status != "completed":
            participation.status = payload.status
    if payload.attendance_confirmed is not None and user.role == "organizer":
        participation.attendance_confirmed = payload.attendance_confirmed

    event = participation.event
    if user.role == "organizer" and payload.attendance_confirmed:
        participation.status = "completed"
        participants = max(len(event.participations), event.audience_size or 1)
        same_day_count = sum(
            1
            for item in participation.user.participations
            if item.event and item.event.starts_at and event.starts_at and item.event.starts_at.date() == event.starts_at.date()
        )
        score = calculate_event_score({
            "coins": event.base_coins,
            "participants": participants,
            "role": participation.role,
            "quality": payload.quality or event.quality,
            "events_today": max(same_day_count, 1),
        })
        awarded = round(score)
        participation.coins_awarded = awarded
        participation.user.coins_balance += awarded
        participation.user.last_activity_at = datetime.now(timezone.utc)
        db.add(CoinTransaction(user_id=participation.user_id, amount=awarded, reason=f"Участие в {event.title}", meta=str(event.id)))

    db.commit()
    refresh_user_achievements(db, participation.user_id)
    return {
        "message": "Запись обновлена",
        "participation": {
            "id": participation.id,
            "role": participation.role,
            "status": participation.status,
            "attendance_confirmed": participation.attendance_confirmed,
            "coins_awarded": participation.coins_awarded,
        },
    }


@router.delete("/participation/{participation_id}")
def cancel_participation(participation_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    participation = db.query(Participation).filter(Participation.id == participation_id).first()
    if not participation:
        raise HTTPException(status_code=404, detail="Запись не найдена")
    if participation.user_id != user.id and user.role != "organizer":
        raise HTTPException(status_code=403, detail="Недостаточно прав")
    if participation.attendance_confirmed:
        raise HTTPException(status_code=400, detail="Нельзя отменить подтверждённое участие")
    db.delete(participation)
    db.commit()
    return {"message": "Запись отменена"}


@router.post("/{event_id}/photo-report")
def upload_photo_report(event_id: int, file: UploadFile = File(...), comment: str = Form(default=""), db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Событие не найдено")
    filename = f"event_{event_id}_{user.id}_{Path(file.filename or 'report.jpg').name}"
    target = UPLOADS_DIR / filename
    with target.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    report = PhotoReport(event_id=event_id, user_id=user.id, image_url=f"/uploads/{filename}", comment=comment)
    db.add(report)
    db.commit()
    db.refresh(report)
    return {"message": "Фотоотчёт загружен", "report": _serialize_report(report)}


@router.get("/{event_id}/photo-reports")
def list_photo_reports(event_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    reports = db.query(PhotoReport).filter(PhotoReport.event_id == event_id).all()
    return [_serialize_report(r) for r in reports]


@router.get("/{event_id}/ics")
def download_ics(event_id: int, db: Session = Depends(get_db)):
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Событие не найдено")
    return Response(content=event_to_ics(event), media_type="text/calendar", headers={"Content-Disposition": f"attachment; filename=event-{event_id}.ics"})
