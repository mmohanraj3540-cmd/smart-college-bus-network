import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.database.database import SessionLocal, engine, Base
from app.models.college import College
from app.models.stop import Stop
from app.models.route import Route, RouteStop
from app.models.bus import Bus
from app.models.driver import Driver
from app.models.student import Student
from app.models.trip import Trip
from app.models.location import BusLocation
from app.models.associations import BusAssignment
from app.core.security import get_password_hash
from datetime import datetime, timedelta

def seed():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()

    # 1. College
    college = College(name="Demo Engineering College", address="Coimbatore", latitude=11.0168, longitude=76.9558)
    db.add(college)
    db.commit()

    # 2. Stops
    stops_data = [
        {"name": "Gandhipuram", "lat": 11.0183, "lng": 76.9654},
        {"name": "Peelamedu", "lat": 11.0267, "lng": 77.0016},
        {"name": "Singanallur", "lat": 10.9925, "lng": 77.0188},
        {"name": "Ukkadam", "lat": 10.9904, "lng": 76.9583},
        {"name": "College", "lat": 11.0168, "lng": 76.9558}
    ]
    stops = []
    for s in stops_data:
        stop = Stop(college_id=college.id, name=s["name"], latitude=s["lat"], longitude=s["lng"])
        db.add(stop)
        stops.append(stop)
    db.commit()

    # 3. Routes
    route_a = Route(college_id=college.id, name="Route A", description="Gandhipuram to College")
    route_b = Route(college_id=college.id, name="Route B", description="Ukkadam to College")
    db.add_all([route_a, route_b])
    db.commit()

    # Route A Stops: Gandhipuram -> Peelamedu -> Singanallur -> College
    db.add_all([
        RouteStop(route_id=route_a.id, stop_id=stops[0].id, sequence_order=1),
        RouteStop(route_id=route_a.id, stop_id=stops[1].id, sequence_order=2),
        RouteStop(route_id=route_a.id, stop_id=stops[2].id, sequence_order=3),
        RouteStop(route_id=route_a.id, stop_id=stops[4].id, sequence_order=4),
    ])
    
    # Route B Stops: Ukkadam -> Singanallur -> College
    db.add_all([
        RouteStop(route_id=route_b.id, stop_id=stops[3].id, sequence_order=1),
        RouteStop(route_id=route_b.id, stop_id=stops[2].id, sequence_order=2),
        RouteStop(route_id=route_b.id, stop_id=stops[4].id, sequence_order=3),
    ])
    db.commit()

    # 4. Buses, Drivers and Assignments
    bus_numbers = [f"{i:02d}" for i in range(1, 11)] # 01 to 10
    buses = {}
    drivers = {}
    for num in bus_numbers:
        bus = Bus(college_id=college.id, bus_number=num, registration_number=f"TN38 AB {num}00", capacity=40)
        driver = Driver(college_id=college.id, name=f"Driver {num}", email=f"driver{num}@demo.com", password_hash=get_password_hash("password"))
        db.add_all([bus, driver])
        db.commit()
        
        # Assign bus to driver and route
        route_id = route_a.id if int(num) % 2 == 1 else route_b.id
        assignment = BusAssignment(
            bus_id=bus.id,
            route_id=route_id,
            driver_id=driver.id,
            active=True
        )
        db.add(assignment)
        db.commit()
        
        buses[num] = bus
        drivers[num] = driver

    # 5. Student
    student = Student(
        college_id=college.id,
        name="Demo Student",
        email="student@demo.com",
        password_hash=get_password_hash("password"),
        regular_bus_id=buses["05"].id,
        selected_stop_id=stops[0].id # Gandhipuram
    )
    db.add(student)
    db.commit()

    # 6. Set up Scenario
    # Bus 05: Already past Gandhipuram (Stop 1), currently near Peelamedu (Stop 2)
    trip_05 = Trip(bus_id=buses["05"].id, driver_id=drivers["05"].id, route_id=route_a.id, status="RUNNING", started_at=datetime.utcnow() - timedelta(minutes=15))
    # Bus 07: Approaching Gandhipuram
    trip_07 = Trip(bus_id=buses["07"].id, driver_id=drivers["07"].id, route_id=route_a.id, status="RUNNING", started_at=datetime.utcnow() - timedelta(minutes=2))
    # Bus 02: Approaching Gandhipuram but further away (let's say it's on Route A as well for alternative)
    trip_02 = Trip(bus_id=buses["02"].id, driver_id=drivers["02"].id, route_id=route_a.id, status="RUNNING", started_at=datetime.utcnow() - timedelta(minutes=1))
    
    db.add_all([trip_05, trip_07, trip_02])
    db.commit()

    # Add locations
    now = datetime.utcnow()
    # Bus 05: At Peelamedu (11.0267, 77.0016)
    loc_05 = BusLocation(trip_id=trip_05.id, bus_id=buses["05"].id, latitude=11.0250, longitude=77.0000, speed=35, heading=90, accuracy=5, timestamp=now)
    
    # Bus 07: 0.8 km before Gandhipuram (11.0183, 76.9654) => let's say 11.0110, 76.9600
    loc_07 = BusLocation(trip_id=trip_07.id, bus_id=buses["07"].id, latitude=11.0110, longitude=76.9600, speed=40, heading=45, accuracy=5, timestamp=now)
    
    # Bus 02: 2.1 km before Gandhipuram => let's say 11.0000, 76.9500
    loc_02 = BusLocation(trip_id=trip_02.id, bus_id=buses["02"].id, latitude=11.0000, longitude=76.9500, speed=30, heading=45, accuracy=5, timestamp=now)

    db.add_all([loc_05, loc_07, loc_02])
    db.commit()

    print("Database seeded successfully!")

if __name__ == "__main__":
    seed()
