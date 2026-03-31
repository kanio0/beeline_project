import math
from collections import defaultdict
from datetime import datetime, timezone

ROLE_WEIGHTS = {
    "participant": 1.0,
    "active": 1.2,
    "organizer": 1.5,
    "leader": 2.0,
}

QUALITY_WEIGHTS = {
    "base": 1.0,
    "photo": 1.2,
    "high": 1.4,
}


def scale_factor(num_participants: int) -> float:
    if num_participants <= 0:
        return 1
    return 1 + math.log10(num_participants)



def activity_factor(active_days: int) -> float:
    return min(1 + active_days / 30, 2)



def streak_factor(weeks_streak: int) -> float:
    return 1 + 0.05 * weeks_streak



def anti_spam(base_coins: float, events_per_day: int) -> float:
    return base_coins / (1 + 0.1 * events_per_day)



def calculate_event_score(event: dict) -> float:
    c = anti_spam(event["coins"], event.get("events_today", 1))
    w = ROLE_WEIGHTS.get(event["role"], 1.0)
    m = scale_factor(event["participants"])
    q = QUALITY_WEIGHTS.get(event["quality"], 1.0)
    return c * w * m * q



def calculate_rating(events: list, active_days: int, streak_weeks: int) -> float:
    base_score = sum(calculate_event_score(e) for e in events)
    a = activity_factor(active_days)
    s = streak_factor(streak_weeks)
    return round(base_score * a * s, 2)



def days_active(last_activity_at):
    if not last_activity_at:
        return 0
    now = datetime.now(timezone.utc)
    if last_activity_at.tzinfo is None:
        last_activity_at = last_activity_at.replace(tzinfo=timezone.utc)
    return max(1, (now - last_activity_at).days)



def _to_number(value, default=0.0):
    if value is None:
        return default
    if isinstance(value, (int, float)):
        return value
    try:
        return float(str(value).replace(',', '.').strip())
    except (TypeError, ValueError):
        return default



def build_user_rating_payload(user, confirmed_participations):
    by_day = defaultdict(int)
    for p in confirmed_participations:
        if p.event and p.event.starts_at:
            by_day[p.event.starts_at.date()] += 1

    events = []
    for p in confirmed_participations:
        if not p.event or not p.event.starts_at:
            continue

        role = p.role or "participant"
        if getattr(user, "role", None) == "organizer":
            role = "organizer"

        awarded = _to_number(getattr(p, "coins_awarded", 0), 0)
        base = _to_number(getattr(p.event, "base_coins", 0), 0)
        audience = int(max(_to_number(getattr(p.event, "audience_size", 1), 1), 1))
        participants_count = len(getattr(p.event, "participations", []) or [])

        events.append(
            {
                "coins": max(awarded, base),
                "participants": max(participants_count, audience),
                "role": role,
                "quality": getattr(p.event, "quality", None) or "base",
                "events_today": by_day[p.event.starts_at.date()] or 1,
            }
        )

    return calculate_rating(events, days_active(getattr(user, "last_activity_at", None)), getattr(user, "streak_weeks", 0))
