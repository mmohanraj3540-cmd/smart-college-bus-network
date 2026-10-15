from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database.database import Base

class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    college_id = Column(Integer, ForeignKey("colleges.id"))
    name = Column(String)
    email = Column(String, unique=True, index=True)
    password_hash = Column(String)
    phone = Column(String)
    regular_bus_id = Column(Integer, ForeignKey("buses.id"), nullable=True)
    selected_stop_id = Column(Integer, ForeignKey("stops.id"), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    college = relationship("College", back_populates="students")
    regular_bus = relationship("Bus", foreign_keys=[regular_bus_id])
    selected_stop = relationship("Stop", foreign_keys=[selected_stop_id])
    notifications = relationship("Notification", back_populates="student")
    student_stops = relationship("StudentStop", back_populates="student")
