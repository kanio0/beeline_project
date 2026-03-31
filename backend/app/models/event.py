from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.session import Base

class Event(Base):
    __tablename__ = "events"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(180), nullable=False)
    description = Column(Text, nullable=True)
    event_type = Column(String(50), nullable=False)
    city = Column(String(120), nullable=True)
    starts_at = Column(DateTime(timezone=True), nullable=False)
    ends_at = Column(DateTime(timezone=True), nullable=True)
    status = Column(String(32), default="planned")
    base_coins = Column(Integer, default=10)
    quality = Column(String(32), default="base")
    audience_size = Column(Integer, default=0)
    required_roles = Column(Text, nullable=True)
    organizer_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    organizer = relationship("User", back_populates="organized_events", foreign_keys=[organizer_id])
    participations = relationship("Participation", back_populates="event")
    photo_reports = relationship("PhotoReport", back_populates="event")
