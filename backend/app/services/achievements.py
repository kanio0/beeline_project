from sqlalchemy.orm import Session
from app.models.achievement import Achievement, UserAchievement
from app.models.participation import Participation

AUTO_RULES = [
    ("Новичок", "first_event", 1, "🌱", "Первое подтверждённое участие"),
    ("Активист", "confirmed_events", 5, "⚡", "5 подтверждённых активностей"),
    ("Организатор", "confirmed_events", 10, "🎯", "10 подтверждённых активностей"),
]


def ensure_default_achievements(db: Session):
    for name, rule_type, threshold, icon, description in AUTO_RULES:
        item = db.query(Achievement).filter(Achievement.name == name).first()
        if not item:
            db.add(Achievement(name=name, rule_type=rule_type, threshold=threshold, icon=icon, description=description))
    db.commit()


def refresh_user_achievements(db: Session, user_id: int):
    ensure_default_achievements(db)
    confirmed_count = (
        db.query(Participation)
        .filter(Participation.user_id == user_id, Participation.attendance_confirmed == True)
        .count()
    )
    for achievement in db.query(Achievement).all():
        should_issue = False
        if achievement.rule_type in {"first_event", "confirmed_events"} and confirmed_count >= achievement.threshold:
            should_issue = True
        exists = db.query(UserAchievement).filter(
            UserAchievement.user_id == user_id,
            UserAchievement.achievement_id == achievement.id,
        ).first()
        if should_issue and not exists:
            db.add(UserAchievement(user_id=user_id, achievement_id=achievement.id))
    db.commit()
