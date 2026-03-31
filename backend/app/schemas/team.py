from pydantic import BaseModel

class TeamCreate(BaseModel):
    name: str
    city: str | None = None
    description: str | None = None
    leader_id: int | None = None
