from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database.database import Base

class Driver(Base):
    __tablename__ = "drivers"

    id = Column(Integer, primary_key=True, index=True)
    college_id = Column(Integer, ForeignKey("colleges.id"))
    name = Column(String)
    email = Column(String, unique=True, index=True)
    password_hash = Column(String)
    phone = Column(String)
    license_number = Column(String)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    college = relationship("College", back_populates="drivers")
    bus_assignments = relationship("BusAssignment", back_populates="driver")
    trips = relationship("Trip", back_populates="driver")
