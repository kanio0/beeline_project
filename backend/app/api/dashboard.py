from collections import defaultdict
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.deps import get_current_user, get_db
from app.models.event import Event
from app.models.participation import Participation
from app.models.team import Team
from app.models.user import User
from app.services.scoring import build_user_rating_payload

router = APIRouter()


def _as_utc(dt: datetime | None) -> datetime | None:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


@router.get("")
def dashboard(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    users = db.query(User).all()
    events = db.query(Event).order_by(Event.starts_at.asc()).all()
    participations = db.query(Participation).all()
    teams = db.query(Team).all()

    active_edge = datetime.now(timezone.utc) - timedelta(days=settings.inactivity_days)
    active_users = [u for u in users if _as_utc(u.last_activity_at) and _as_utc(u.last_activity_at) >= active_edge]

    top_users = []
    for current in users:
        confirmed = [p for p in current.participations if p.attendance_confirmed]
        top_users.append({
            "id": current.id,
            "name": current.name,
            "coins": current.coins_balance,
            "team": current.team.name if current.team else None,
            "rating": build_user_rating_payload(current, confirmed),
            "events_done": len(confirmed),
            "city": current.city,
        })
    top_users = sorted(top_users, key=lambda x: (x["rating"], x["coins"]), reverse=True)

    team_rows = []
    city_totals = defaultdict(int)
    for team in teams:
        members = team.members
        total_coins = sum(member.coins_balance for member in members)
        team_rows.append({
            "id": team.id,
            "name": team.name,
            "city": team.city,
            "members": len(members),
            "coins": total_coins,
            "active_percent": round(sum(1 for member in members if member.status == "active") / max(len(members), 1) * 100, 1),
        })
        city_totals[team.city or "Без города"] += total_coins
    team_rows = sorted(team_rows, key=lambda x: x["coins"], reverse=True)

    activity_series = defaultdict(int)
    for participation in participations:
        if participation.attendance_confirmed and participation.event and participation.event.starts_at:
            activity_series[participation.event.starts_at.strftime("%d.%m")] += 1

    event_types = defaultdict(int)
    month_events = []
    for event in events:
        event_types[event.event_type] += 1
        month_events.append({
            "id": event.id,
            "title": event.title,
            "starts_at": event.starts_at,
            "status": event.status,
            "type": event.event_type,
            "city": event.city,
        })

    special = {
        "largest_audience": None,
        "youngest_listener": {"label": "самый младший слушатель", "value": "12 лет"},
    }
    if events:
        largest = max(events, key=lambda item: item.audience_size or 0)
        special["largest_audience"] = {"title": largest.title, "value": largest.audience_size or 0}

    return {
        "summary": {
            "users": len(users),
            "active_users": len(active_users),
            "inactive_users": len(users) - len(active_users),
            "events_total": len(events),
            "events_planned": len([e for e in events if e.status == "planned"]),
            "events_done": len([e for e in events if e.status == "completed"]),
            "attendance_rate": round(sum(1 for p in participations if p.attendance_confirmed) / max(len(participations), 1) * 100, 1),
            "coins_total": sum(u.coins_balance for u in users),
        },
        "top_users": top_users[:10],
        "top_teams": team_rows[:10],
        "charts": {
            "activity_series": [{"date": key, "value": value} for key, value in sorted(activity_series.items())],
            "event_types": [{"type": key, "value": value} for key, value in sorted(event_types.items())],
            "city_totals": [{"city": key, "value": value} for key, value in sorted(city_totals.items(), key=lambda item: item[1], reverse=True)],
        },
        "calendar_events": month_events,
        "special": special,
        "me": {"id": user.id, "name": user.name, "role": user.role},
    }
