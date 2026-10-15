from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Float
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database.database import Base

class Route(Base):
    __tablename__ = "routes"

    id = Column(Integer, primary_key=True, index=True)
    college_id = Column(Integer, ForeignKey("colleges.id"))
    name = Column(String, index=True)
    description = Column(String)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    college = relationship("College", back_populates="routes")
    route_stops = relationship("RouteStop", back_populates="route", order_by="RouteStop.sequence_order")
    bus_assignments = relationship("BusAssignment", back_populates="route")
    trips = relationship("Trip", back_populates="route")

class RouteStop(Base):
    __tablename__ = "route_stops"

    id = Column(Integer, primary_key=True, index=True)
    route_id = Column(Integer, ForeignKey("routes.id"))
    stop_id = Column(Integer, ForeignKey("stops.id"))
    sequence_order = Column(Integer)
    planned_arrival_time = Column(String, nullable=True) # E.g., "08:30"
    distance_from_previous = Column(Float, nullable=True)

    route = relationship("Route", back_populates="route_stops")
    stop = relationship("Stop", back_populates="route_stops")
