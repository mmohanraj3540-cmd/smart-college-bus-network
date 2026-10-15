from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.core.dependencies import get_current_user
from app.models.trip import Trip
from app.models.location import BusLocation
from typing import List

router = APIRouter()

@router.get("/active")
def get_active_buses(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    # Returns active trips/buses with their latest locations
    college_id = current_user.college_id
    
    trips = db.query(Trip).join(Trip.bus).filter(
        Trip.status.in_(["RUNNING", "DELAYED", "ROUTE_CHANGED"]),
        Trip.bus.has(college_id=college_id)
    ).all()
    
    result = []
    for trip in trips:
        latest_loc = db.query(BusLocation).filter(BusLocation.trip_id == trip.id).order_by(BusLocation.timestamp.desc()).first()
        if latest_loc:
            result.append({
                "bus_id": trip.bus.id,
                "bus_number": trip.bus.bus_number,
                "route_id": trip.route_id,
                "route": trip.route.name,
                "status": trip.status,
                "latitude": latest_loc.latitude,
                "longitude": latest_loc.longitude,
                "speed": latest_loc.speed,
                "heading": latest_loc.heading,
                "timestamp": latest_loc.timestamp.isoformat() if latest_loc.timestamp else None,
                "trip_id": trip.id
            })
    return result
