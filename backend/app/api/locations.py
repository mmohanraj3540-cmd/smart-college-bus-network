from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.database.database import get_db
from app.core.dependencies import get_current_user, get_current_driver
from app.models.location import BusLocation
from app.models.trip import Trip
from app.websocket.manager import manager
import json
from datetime import datetime

router = APIRouter()

class LocationPayload(BaseModel):
    latitude: float
    longitude: float
    speed: float
    heading: float
    accuracy: float
    timestamp: str

@router.post("/{trip_id}/location")
async def receive_location(
    trip_id: int,
    payload: LocationPayload,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_driver)
):
    trip = db.query(Trip).filter(Trip.id == trip_id, Trip.driver_id == current_user.id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found or unauthorized")
        
    if trip.status not in ["RUNNING", "DELAYED", "ROUTE_CHANGED"]:
        raise HTTPException(status_code=400, detail="Cannot update location for inactive trip")

    # Basic validation
    if payload.latitude < -90 or payload.latitude > 90 or payload.longitude < -180 or payload.longitude > 180:
        raise HTTPException(status_code=400, detail="Invalid coordinates")
        
    try:
        ts = datetime.fromisoformat(payload.timestamp.replace('Z', '+00:00'))
    except Exception:
        ts = datetime.utcnow()

    new_loc = BusLocation(
        trip_id=trip.id,
        bus_id=trip.bus_id,
        latitude=payload.latitude,
        longitude=payload.longitude,
        speed=payload.speed,
        heading=payload.heading,
        accuracy=payload.accuracy,
        timestamp=ts
    )
    db.add(new_loc)
    db.commit()

    # Broadcast via websocket
    ws_payload = {
        "type": "BUS_LOCATION_UPDATED",
        "bus_id": trip.bus_id,
        "bus_number": str(trip.bus.bus_number),
        "trip_id": trip.id,
        "latitude": payload.latitude,
        "longitude": payload.longitude,
        "speed": payload.speed,
        "heading": payload.heading,
        "status": trip.status,
        "timestamp": ts.isoformat()
    }
    
    await manager.broadcast(json.dumps(ws_payload), str(trip.bus.college_id))

    return {"status": "success"}
