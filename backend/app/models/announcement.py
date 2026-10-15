from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database.database import Base

class Announcement(Base):
    __tablename__ = "announcements"

    id = Column(Integer, primary_key=True, index=True)
    college_id = Column(Integer, ForeignKey("colleges.id"))
    title = Column(String)
    message = Column(String)
    priority = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True))
    created_by = Column(Integer, ForeignKey("colleges.id")) # Assuming admin belongs to a college

    college = relationship("College", back_populates="announcements", foreign_keys=[college_id])
