from sqlalchemy import Column, Integer, Boolean, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database.database import Base

class BusAssignment(Base):
    __tablename__ = "bus_assignments"

    id = Column(Integer, primary_key=True, index=True)
    bus_id = Column(Integer, ForeignKey("buses.id"))
    route_id = Column(Integer, ForeignKey("routes.id"))
    driver_id = Column(Integer, ForeignKey("drivers.id"))
    active = Column(Boolean, default=True)
    assigned_at = Column(DateTime(timezone=True), server_default=func.now())

    bus = relationship("Bus", back_populates="bus_assignments")
    route = relationship("Route", back_populates="bus_assignments")
    driver = relationship("Driver", back_populates="bus_assignments")

class StudentStop(Base):
    __tablename__ = "student_stops"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"))
    stop_id = Column(Integer, ForeignKey("stops.id"))
    is_primary = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    student = relationship("Student", back_populates="student_stops")
    stop = relationship("Stop")
