from sqlalchemy.orm import Session
from app.models.student import Student
from app.models.trip import Trip
from app.models.location import BusLocation
from app.models.route import RouteStop
from app.services.eta_service import calculate_stop_eta, route_progress
from datetime import datetime, timedelta, timezone

def find_alternative_buses(db: Session, student_id: int, stop_id: int):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        return {"error": "Student not found"}

    # 1. Identify student's stop
    # Assumes student.selected_stop_id matches the param (or uses it)
    student_stop_id = stop_id or student.selected_stop_id
    
    # Get all active trips for this college
    active_trips = db.query(Trip).join(Trip.bus).filter(
        Trip.status.in_(["RUNNING", "DELAYED"]),
        Trip.bus.has(college_id=student.college_id)
    ).all()

    alternatives = []
    recommended_bus = None
    
    for trip in active_trips:
        # Check if route contains the stop
        route_stop = db.query(RouteStop).filter(
            RouteStop.route_id == trip.route_id,
            RouteStop.stop_id == student_stop_id
        ).first()
        
        if not route_stop:
            continue
            
        student_stop_seq = route_stop.sequence_order
        
        # Get recent locations for direction inference
        recent_locs = db.query(BusLocation).filter(BusLocation.trip_id == trip.id).order_by(BusLocation.timestamp.desc()).limit(3).all()
        if not recent_locs:
            continue
            
        latest_loc = recent_locs[0]
        
        # Is GPS stale? (> 1 minute)
        now = datetime.now(timezone.utc)
        is_stale = (now - latest_loc.received_at) > timedelta(minutes=1)
        
        # Check route progress
        route_stops = db.query(RouteStop).filter(RouteStop.route_id == trip.route_id).all()
        current_seq, moving_forward = route_progress(route_stops, recent_locs)
        
        # We consider a bus passed if its current sequence is strictly greater than the student's stop sequence
        # Or if it's equal, but we determined it's moving away.
        if current_seq > student_stop_seq:
            continue
        if current_seq == student_stop_seq and not moving_forward:
            continue

            
        # Calculate ETA
        dist_km, eta_minutes = calculate_stop_eta(
            latest_loc.latitude, latest_loc.longitude, 
            route_stop.stop.latitude, route_stop.stop.longitude,
            latest_loc.speed
        )
        
        # Is bus broken down?
        if trip.status == "BREAKDOWN":
            continue

        bus_info = {
            "trip_id": trip.id,
            "bus_id": trip.bus.id,
            "bus_number": trip.bus.bus_number,
            "route": trip.route.name,
            "eta_minutes": eta_minutes,
            "distance_km": round(dist_km, 2),
            "stop": route_stop.stop.name,
            "status": trip.status,
            "is_stale": is_stale,
            "recommendation_reason": "Serves your stop and is approaching it." if moving_forward else "Moving away or passed"
        }
        alternatives.append(bus_info)
        
    # Filter out buses that are moving away if they are very close
    # For MVP, we simply sort by ETA. The recommendation logic already penalizes passed stops.
    alternatives = [a for a in alternatives if not a["is_stale"]]
    alternatives.sort(key=lambda x: x["eta_minutes"])
    
    if alternatives:
        recommended_bus = alternatives.pop(0)
        recommended_bus["recommendation_reason"] = "Best ETA and serves your stop."
        
    return {
        "recommended_bus": recommended_bus,
        "alternatives": alternatives
    }
