from geopy.distance import geodesic

def calculate_distance(lat1, lon1, lat2, lon2):
    return geodesic((lat1, lon1), (lat2, lon2)).km

def estimate_travel_time(distance_km: float, speed_kmh: float = 30) -> int:
    if speed_kmh <= 0:
        speed_kmh = 30
    hours = distance_km / speed_kmh
    minutes = hours * 60
    return max(1, int(minutes))

def route_progress(route_stops: list, locations: list):
    """
    Determines route progress based on recent GPS locations and the ordered stop sequence.
    Returns the sequence order of the last passed stop, and boolean indicating if moving forward.
    """
    if not locations or not route_stops:
        return 0, True
        
    latest_loc = locations[0]
    
    # Simple projection: which segment of the route is the bus on?
    # For MVP, we still find the closest stop to the latest location, but we also check the previous location to determine direction.
    closest_seq = 0
    min_dist = float('inf')
    for rs in route_stops:
        dist = calculate_distance(latest_loc.latitude, latest_loc.longitude, rs.stop.latitude, rs.stop.longitude)
        if dist < min_dist:
            min_dist = dist
            closest_seq = rs.sequence_order

    moving_forward = True
    if len(locations) > 1:
        prev_loc = locations[1]
        
        # Check distance to the closest stop from both current and previous location
        closest_stop = next((rs.stop for rs in route_stops if rs.sequence_order == closest_seq), None)
        if closest_stop:
            dist_now = calculate_distance(latest_loc.latitude, latest_loc.longitude, closest_stop.latitude, closest_stop.longitude)
            dist_prev = calculate_distance(prev_loc.latitude, prev_loc.longitude, closest_stop.latitude, closest_stop.longitude)
            
            # If the bus is getting further away from the closest stop, it might have passed it.
            # We refine closest_seq if it passed the stop.
            if dist_now > dist_prev and dist_now > 0.1: # 100 meters threshold
                # If we were approaching it, and now moving away, we probably passed it.
                closest_seq = closest_seq + 1 # It is now past this stop, so its progress is beyond it
                
    return closest_seq, moving_forward


def calculate_stop_eta(current_lat, current_lon, stop_lat, stop_lon, current_speed=None):
    dist_km = calculate_distance(current_lat, current_lon, stop_lat, stop_lon)
    speed = current_speed if current_speed and current_speed > 10 else 30
    eta_minutes = estimate_travel_time(dist_km, speed)
    return dist_km, eta_minutes
