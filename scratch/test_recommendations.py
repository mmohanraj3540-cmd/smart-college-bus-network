import requests
import json
import time

BASE_URL = "http://localhost:8000/api"
STUDENT_CREDS = {"email": "student@demo.com", "password": "password", "role": "STUDENT"}
DRIVER_CREDS = {"email": "driver02@demo.com", "password": "password", "role": "DRIVER"}

print("1. Login as Student")
student_token = requests.post(f"{BASE_URL}/auth/login", json=STUDENT_CREDS).json()["access_token"]
student_headers = {"Authorization": f"Bearer {student_token}"}

print("2. Login as Driver 05 and Driver 07 to post fresh locations")
driver05_token = requests.post(f"{BASE_URL}/auth/login", json={"email": "driver05@demo.com", "password": "password", "role": "DRIVER"}).json()["access_token"]
driver07_token = requests.post(f"{BASE_URL}/auth/login", json={"email": "driver07@demo.com", "password": "password", "role": "DRIVER"}).json()["access_token"]

# Start trips for them to get trip IDs
trip05_id = requests.post(f"{BASE_URL}/trips/start", headers={"Authorization": f"Bearer {driver05_token}"}).json()["trip_id"]
trip07_id = requests.post(f"{BASE_URL}/trips/start", headers={"Authorization": f"Bearer {driver07_token}"}).json()["trip_id"]

# Post fresh locations for them
# Bus 05: At Peelamedu (11.0267, 77.0016) - Past Gandhipuram
requests.post(f"{BASE_URL}/trips/{trip05_id}/location", json={
    "latitude": 11.0250, "longitude": 77.0000, "speed": 35, "heading": 90, "accuracy": 5, "timestamp": "2026-10-02T18:50:00Z"
}, headers={"Authorization": f"Bearer {driver05_token}"})

# Bus 07: Approaching Gandhipuram (11.0183, 76.9654)
requests.post(f"{BASE_URL}/trips/{trip07_id}/location", json={
    "latitude": 11.0110, "longitude": 76.9600, "speed": 40, "heading": 45, "accuracy": 5, "timestamp": "2026-10-02T18:50:00Z"
}, headers={"Authorization": f"Bearer {driver07_token}"})

print("3. Test Recommendation with Seed Data (now fresh)")
# Student's stop is Gandhipuram (stop_id=1 in seed, but let's just use the api)
# We can just hit /recommendations/alternatives?stop_id=1
res = requests.get(f"{BASE_URL}/recommendations/alternatives?stop_id=1", headers=student_headers).json()
print("Recommendation output (initial):")
print(json.dumps(res, indent=2))

print("4. Login as Driver 02 to manipulate Bus 02 position")
driver_token = requests.post(f"{BASE_URL}/auth/login", json=DRIVER_CREDS).json()["access_token"]
driver_headers = {"Authorization": f"Bearer {driver_token}"}

print("5. Start trip for Bus 02")
trip_res = requests.post(f"{BASE_URL}/trips/start", headers=driver_headers).json()
trip_id = trip_res["trip_id"]

print(f"6. Move Bus 02 closer to Gandhipuram (lat: 11.0160, lng: 76.9620) to beat Bus 07")
# Gandhipuram is at 11.0183, 76.9654
loc_data = {
    "latitude": 11.0160,
    "longitude": 76.9620,
    "speed": 40,
    "heading": 45,
    "accuracy": 5,
    "timestamp": "2026-10-02T18:51:00Z"
}
requests.post(f"{BASE_URL}/trips/{trip_id}/location", json=loc_data, headers=driver_headers)

time.sleep(1)

print("7. Test Recommendation again after moving Bus 02")
res2 = requests.get(f"{BASE_URL}/recommendations/alternatives?stop_id=1", headers=student_headers).json()
print("Recommendation output (after move):")
print(json.dumps(res2, indent=2))
