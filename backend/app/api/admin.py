from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.core.dependencies import get_current_user
from app.models.bus import Bus
from app.models.driver import Driver
from app.models.route import Route
from app.models.stop import Stop
from app.models.trip import Trip

router = APIRouter()

def get_current_admin(current_user = Depends(get_current_user)):
    if current_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Not authorized")
    return current_user

@router.get("/stats")
def get_admin_stats(db: Session = Depends(get_db), current_admin = Depends(get_current_admin)):
    college_id = current_admin.college_id
    total_buses = db.query(Bus).filter(Bus.college_id == college_id).count()
    
    active_trips = db.query(Trip).join(Trip.bus).filter(
        Trip.bus.has(college_id=college_id),
        Trip.status.in_(["RUNNING", "ROUTE_CHANGED"])
    ).count()
    
    delayed_trips = db.query(Trip).join(Trip.bus).filter(
        Trip.bus.has(college_id=college_id),
        Trip.status == "DELAYED"
    ).count()
    
    breakdown_trips = db.query(Trip).join(Trip.bus).filter(
        Trip.bus.has(college_id=college_id),
        Trip.status == "BREAKDOWN"
    ).count()
    
    return {
        "total_buses": total_buses,
        "active_buses": active_trips,
        "delayed_buses": delayed_trips,
        "breakdown_buses": breakdown_trips,
        "not_started": total_buses - (active_trips + delayed_trips + breakdown_trips)
    }

@router.get("/buses")
def get_admin_buses(db: Session = Depends(get_db), current_admin = Depends(get_current_admin)):
    from sqlalchemy.orm import joinedload
    return db.query(Bus).options(joinedload(Bus.bus_assignments)).filter(Bus.college_id == current_admin.college_id).all()

@router.get("/drivers")
def get_admin_drivers(db: Session = Depends(get_db), current_admin = Depends(get_current_admin)):
    return db.query(Driver).filter(Driver.college_id == current_admin.college_id).all()

@router.get("/students")
def get_admin_students(db: Session = Depends(get_db), current_admin = Depends(get_current_admin)):
    from app.models.student import Student
    return db.query(Student).filter(Student.college_id == current_admin.college_id).all()

@router.get("/trips")
def get_admin_trips(db: Session = Depends(get_db), current_admin = Depends(get_current_admin)):
    return db.query(Trip).join(Trip.bus).filter(Trip.bus.has(college_id=current_admin.college_id)).order_by(Trip.started_at.desc()).limit(50).all()

from pydantic import BaseModel
class AssignBusRequest(BaseModel):
    bus_id: int
    route_id: int

@router.put("/drivers/{driver_id}/assign-bus")
def assign_driver_bus(driver_id: int, req: AssignBusRequest, db: Session = Depends(get_db), current_admin = Depends(get_current_admin)):
    from app.models.associations import BusAssignment
    # Check if driver is already on a running trip
    active_trip = db.query(Trip).filter(Trip.driver_id == driver_id, Trip.status.in_(["RUNNING", "DELAYED"])).first()
    if active_trip:
        raise HTTPException(status_code=400, detail="Driver is currently on an active trip. Cannot reassign now.")
        
    # Deactivate old assignments
    db.query(BusAssignment).filter(BusAssignment.driver_id == driver_id).update({"active": False})
    
    new_assignment = BusAssignment(
        bus_id=req.bus_id,
        route_id=req.route_id,
        driver_id=driver_id,
        active=True
    )
    db.add(new_assignment)
    db.commit()
    return {"status": "success"}

class AssignStudentRequest(BaseModel):
    bus_id: int
    pickup_stop_id: int

@router.put("/students/{student_id}/assignment")
def assign_student(student_id: int, req: AssignStudentRequest, db: Session = Depends(get_db), current_admin = Depends(get_current_admin)):
    from app.models.student import Student
    from app.models.associations import BusAssignment
    from app.models.route import RouteStop
    
    # 13. AUTOMATIC ROUTE VALIDATION
    # Verify bus route serves the stop
    bus_assign = db.query(BusAssignment).filter(BusAssignment.bus_id == req.bus_id, BusAssignment.active == True).first()
    if not bus_assign:
        raise HTTPException(status_code=400, detail="Bus has no active route assignment")
        
    serves_stop = db.query(RouteStop).filter(RouteStop.route_id == bus_assign.route_id, RouteStop.stop_id == req.pickup_stop_id).first()
    if not serves_stop:
        raise HTTPException(status_code=400, detail="Bus does not serve this stop. Please select a valid stop.")
        
    student = db.query(Student).filter(Student.id == student_id, Student.college_id == current_admin.college_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
        
    student.regular_bus_id = req.bus_id
    student.selected_stop_id = req.pickup_stop_id
    db.commit()
    return {"status": "success"}

class RouteCreate(BaseModel):
    name: str
    description: str = None

@router.post("/routes")
def create_route(req: RouteCreate, db: Session = Depends(get_db), current_admin = Depends(get_current_admin)):
    new_route = Route(
        college_id=current_admin.college_id,
        name=req.name,
        description=req.description,
        is_active=True
    )
    db.add(new_route)
    db.commit()
    db.refresh(new_route)
    return new_route

class StopCreate(BaseModel):
    name: str
    latitude: float
    longitude: float

@router.post("/stops")
def create_stop(req: StopCreate, db: Session = Depends(get_db), current_admin = Depends(get_current_admin)):
    new_stop = Stop(
        college_id=current_admin.college_id,
        name=req.name,
        latitude=req.latitude,
        longitude=req.longitude,
        is_active=True
    )
    db.add(new_stop)
    db.commit()
    db.refresh(new_stop)
    return new_stop

from typing import List
class RouteStopUpdate(BaseModel):
    stop_id: int
    sequence: int

@router.put("/routes/{route_id}/stops")
def update_route_stops(route_id: int, req: List[RouteStopUpdate], db: Session = Depends(get_db), current_admin = Depends(get_current_admin)):
    from app.models.route import RouteStop
    
    route = db.query(Route).filter(Route.id == route_id, Route.college_id == current_admin.college_id).first()
    if not route:
        raise HTTPException(status_code=404, detail="Route not found")
        
    db.query(RouteStop).filter(RouteStop.route_id == route_id).delete()
    
    for item in req:
        new_rs = RouteStop(
            route_id=route_id,
            stop_id=item.stop_id,
            sequence_order=item.sequence,
            time_from_start_mins=0
        )
        db.add(new_rs)
        
    db.commit()
    return {"status": "success"}
