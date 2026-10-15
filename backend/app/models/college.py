from sqlalchemy import Column, Integer, String, Float, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database.database import Base

class College(Base):
    __tablename__ = "colleges"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    address = Column(String)
    latitude = Column(Float)
    longitude = Column(Float)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    students = relationship("Student", back_populates="college")
    drivers = relationship("Driver", back_populates="college")
    buses = relationship("Bus", back_populates="college")
    routes = relationship("Route", back_populates="college")
    stops = relationship("Stop", back_populates="college")
    announcements = relationship("Announcement", back_populates="college", foreign_keys="Announcement.college_id")
