from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.core.dependencies import get_current_user
from app.models.route import Route, RouteStop

router = APIRouter()

@router.get("/")
def get_routes(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    routes = db.query(Route).filter(Route.college_id == current_user.college_id, Route.is_active == True).all()
    return routes

@router.get("/{route_id}/stops")
def get_route_stops(route_id: int, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    route_stops = db.query(RouteStop).filter(RouteStop.route_id == route_id).order_by(RouteStop.sequence_order).all()
    
    stops = []
    for rs in route_stops:
        stops.append({
            "id": rs.stop.id,
            "name": rs.stop.name,
            "latitude": rs.stop.latitude,
            "longitude": rs.stop.longitude,
            "sequence_order": rs.sequence_order
        })
    return stops
