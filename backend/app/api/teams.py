from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.deps import get_current_user, get_db, require_roles
from app.models.team import Team
from app.models.user import User
from app.schemas.team import TeamCreate

router = APIRouter()


def _serialize_team(team: Team):
    members = sorted(team.members, key=lambda item: (item.coins_balance or 0), reverse=True)
    total_coins = sum(m.coins_balance for m in members)
    avg_activity = round(sum(1 for m in members if m.status == "active") / max(len(members), 1) * 100, 1)
    return {
        "id": team.id,
        "name": team.name,
        "city": team.city,
        "description": team.description,
        "leader_id": team.leader_id,
        "members_count": len(members),
        "total_coins": total_coins,
        "average_activity": avg_activity,
        "members": [
            {
                "id": m.id,
                "name": m.name,
                "role": m.role,
                "city": m.city,
                "status": m.status,
                "photo_url": m.photo_url,
                "rating": m.coins_balance,
                "coins_balance": m.coins_balance,
                "telegram_username": m.telegram_username,
            }
            for m in members
        ],
    }


@router.get("")
def list_teams(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    teams = db.query(Team).all()
    result = [_serialize_team(team) for team in teams]
    return sorted(result, key=lambda x: x["total_coins"], reverse=True)


@router.get("/{team_id}")
def get_team(team_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Команда не найдена")
    return _serialize_team(team)


@router.post("")
def create_team(payload: TeamCreate, db: Session = Depends(get_db), _: User = Depends(require_roles("organizer"))):
    if db.query(Team).filter(Team.name == payload.name).first():
        raise HTTPException(status_code=400, detail="Команда уже существует")
    team = Team(**payload.model_dump())
    db.add(team)
    db.commit()
    db.refresh(team)
    return {"id": team.id, "message": "Команда создана"}


@router.patch("/{team_id}")
def update_team(team_id: int, payload: TeamCreate, db: Session = Depends(get_db), _: User = Depends(require_roles("organizer"))):
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Команда не найдена")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(team, field, value)
    db.commit()
    return {"message": "Команда обновлена"}


@router.delete("/{team_id}")
def delete_team(team_id: int, db: Session = Depends(get_db), _: User = Depends(require_roles("organizer"))):
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Команда не найдена")
    db.delete(team)
    db.commit()
    return {"message": "Команда удалена"}
