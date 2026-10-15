from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.core.dependencies import get_current_driver
from app.models.trip import Trip
from app.models.bus import Bus
from app.websocket.manager import manager
from datetime import datetime
import json

router = APIRouter()

@router.get("/current")
async def get_current_trip(db: Session = Depends(get_db), current_user = Depends(get_current_driver)):
    trip = db.query(Trip).filter(
        Trip.driver_id == current_user.id, 
        Trip.status.in_(["RUNNING", "DELAYED", "BREAKDOWN", "ROUTE_CHANGED"])
    ).first()
    
    if not trip:
        return {"active": False}
        
    return {
        "active": True,
        "trip_id": trip.id,
        "bus_id": trip.bus_id,
        "bus_number": trip.bus.bus_number,
        "route_id": trip.route_id,
        "status": trip.status
    }

@router.post("/start")
async def start_trip(db: Session = Depends(get_db), current_user = Depends(get_current_driver)):
    # Find active assignment or assume driver has 1 bus
    from app.models.associations import BusAssignment
    assignment = db.query(BusAssignment).filter(BusAssignment.driver_id == current_user.id, BusAssignment.active == True).first()
    
    if not assignment:
        raise HTTPException(status_code=400, detail="No active bus assignment found for this driver")
    else:
        bus = assignment.bus
        route_id = assignment.route_id

    # Create trip
    trip = Trip(
        bus_id=bus.id,
        driver_id=current_user.id,
        route_id=route_id,
        status="RUNNING",
        started_at=datetime.utcnow()
    )
    db.add(trip)
    db.commit()
    db.refresh(trip)

    # Broadcast
    ws_payload = {
        "type": "TRIP_STARTED",
        "bus_id": bus.id,
        "bus_number": str(bus.bus_number),
        "trip_id": trip.id,
        "status": "RUNNING"
    }
    await manager.broadcast(json.dumps(ws_payload), str(current_user.college_id))

    return {"trip_id": trip.id, "bus_id": bus.id, "bus_number": bus.bus_number, "route_id": route_id}

@router.post("/{trip_id}/end")
async def end_trip(trip_id: int, db: Session = Depends(get_db), current_user = Depends(get_current_driver)):
    trip = db.query(Trip).filter(Trip.id == trip_id, Trip.driver_id == current_user.id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
        
    trip.status = "COMPLETED"
    trip.ended_at = datetime.utcnow()
    db.commit()

    ws_payload = {
        "type": "TRIP_ENDED",
        "bus_id": trip.bus.id,
        "bus_number": str(trip.bus.bus_number),
        "trip_id": trip.id,
        "status": "COMPLETED"
    }
    await manager.broadcast(json.dumps(ws_payload), str(current_user.college_id))

    return {"status": "success"}

@router.post("/{trip_id}/status")
async def update_status(trip_id: int, status: str, db: Session = Depends(get_db), current_user = Depends(get_current_driver)):
    trip = db.query(Trip).filter(Trip.id == trip_id, Trip.driver_id == current_user.id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
        
    if status not in ["RUNNING", "DELAYED", "BREAKDOWN", "ROUTE_CHANGED"]:
        raise HTTPException(status_code=400, detail="Invalid status")
        
    trip.status = status
    db.commit()
    
    ws_payload = {
        "type": "BUS_STATUS_CHANGED",
        "bus_id": trip.bus.id,
        "bus_number": str(trip.bus.bus_number),
        "trip_id": trip.id,
        "status": status
    }
    await manager.broadcast(json.dumps(ws_payload), str(current_user.college_id))

    return {"status": "success"}
