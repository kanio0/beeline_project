from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.session import Base

class Participation(Base):
    __tablename__ = "participations"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    event_id = Column(Integer, ForeignKey("events.id"), nullable=False)
    role = Column(String(32), default="participant")
    status = Column(String(32), default="registered")
    attendance_confirmed = Column(Boolean, default=False)
    coins_awarded = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="participations")
    event = relationship("Event", back_populates="participations")
