from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Float
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database.database import Base

class BusLocation(Base):
    __tablename__ = "bus_locations"

    id = Column(Integer, primary_key=True, index=True)
    trip_id = Column(Integer, ForeignKey("trips.id"))
    bus_id = Column(Integer, ForeignKey("buses.id"))
    latitude = Column(Float)
    longitude = Column(Float)
    speed = Column(Float)
    heading = Column(Float)
    accuracy = Column(Float)
    timestamp = Column(DateTime(timezone=True))
    received_at = Column(DateTime(timezone=True), server_default=func.now())

    trip = relationship("Trip", back_populates="locations")
