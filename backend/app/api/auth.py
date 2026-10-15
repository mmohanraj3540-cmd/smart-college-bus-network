from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.schemas.auth import LoginData, Token
from app.schemas.student import StudentOut
from app.schemas.driver import DriverOut
from app.models.student import Student
from app.models.driver import Driver
from app.core.security import verify_password, create_access_token
from app.core.dependencies import get_current_user

router = APIRouter()

@router.post("/login", response_model=Token)
def login(login_data: LoginData, db: Session = Depends(get_db)):
    if login_data.role == "STUDENT":
        user = db.query(Student).filter(Student.email == login_data.email).first()
    elif login_data.role == "DRIVER":
        user = db.query(Driver).filter(Driver.email == login_data.email).first()
    elif login_data.role == "ADMIN":
        if login_data.email == "admin@demo.com" and login_data.password == "password":
            access_token = create_access_token(data={"sub": "999", "role": "ADMIN"})
            return {"access_token": access_token, "token_type": "bearer", "role": "ADMIN"}
        else:
            raise HTTPException(status_code=401, detail="Incorrect email or password")
    else:
        raise HTTPException(status_code=400, detail="Invalid role")

    if not user or not verify_password(login_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    
    access_token = create_access_token(data={"sub": str(user.id), "role": login_data.role})
    return {"access_token": access_token, "token_type": "bearer", "role": login_data.role}

@router.get("/me")
def read_users_me(current_user = Depends(get_current_user), db: Session = Depends(get_db)):
    if getattr(current_user, "role", "") == "DRIVER":
        from app.models.associations import BusAssignment
        from app.models.route import RouteStop
        assignment = db.query(BusAssignment).filter(BusAssignment.driver_id == current_user.id, BusAssignment.active == True).first()
        bus_num = assignment.bus.bus_number if assignment else "Unassigned"
        route_name = assignment.route.name if assignment else None
        
        stops = []
        if assignment:
            route_stops = db.query(RouteStop).filter(RouteStop.route_id == assignment.route_id).order_by(RouteStop.sequence_order).all()
            stops = [{"id": rs.stop.id, "name": rs.stop.name, "sequence": rs.sequence_order} for rs in route_stops]
            
        return {
            "id": current_user.id, 
            "role": "DRIVER", 
            "email": current_user.email, 
            "assigned_bus": bus_num,
            "assigned_route": route_name,
            "stops": stops
        }
    elif getattr(current_user, "role", "") == "STUDENT":
        from app.models.bus import Bus
        from app.models.stop import Stop
        bus = db.query(Bus).filter(Bus.id == current_user.regular_bus_id).first()
        stop = db.query(Stop).filter(Stop.id == current_user.selected_stop_id).first()
        return {
            "id": current_user.id,
            "role": "STUDENT",
            "email": current_user.email,
            "assigned_bus": bus.bus_number if bus else None,
            "assigned_stop": {
                "id": stop.id,
                "name": stop.name,
                "latitude": stop.latitude,
                "longitude": stop.longitude
            } if stop else None
        }
    
    return {"id": current_user.id, "role": getattr(current_user, "role", "UNKNOWN")}
