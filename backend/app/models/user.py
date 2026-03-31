from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.session import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(120), nullable=False)
    email = Column(String(120), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    telegram_username = Column(String(120), nullable=True)
    telegram_id = Column(String(120), nullable=True)
    phone = Column(String(30), nullable=True)
    photo_url = Column(String(255), nullable=True)
    city = Column(String(120), nullable=True)
    about = Column(Text, nullable=True)
    role = Column(String(32), default="volunteer")
    status = Column(String(32), default="active")
    is_active = Column(Boolean, default=True)
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=True)
    coins_balance = Column(Integer, default=0)
    streak_weeks = Column(Integer, default=0)
    registered_at = Column(DateTime(timezone=True), server_default=func.now())
    last_activity_at = Column(DateTime(timezone=True), server_default=func.now())

    team = relationship("Team", back_populates="members", foreign_keys=[team_id])
    organized_events = relationship("Event", back_populates="organizer", foreign_keys="Event.organizer_id")
    participations = relationship("Participation", back_populates="user")
    coin_transactions = relationship("CoinTransaction", back_populates="user")
    achievements = relationship("UserAchievement", back_populates="user")
