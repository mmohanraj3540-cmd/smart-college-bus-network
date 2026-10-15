import requests
import asyncio
import websockets
import json

BASE_URL = 'http://127.0.0.1:8000/api'
WS_URL = 'ws://127.0.0.1:8000/ws/college/1'

def main():
    # 1. Driver Login
    driver_login = requests.post(f'{BASE_URL}/auth/login', json={'email': 'driver05@demo.com', 'password': 'password', 'role': 'DRIVER'})
    assert driver_login.status_code == 200, f'Driver login failed: {driver_login.text}'
    driver_token = driver_login.json()['access_token']
    driver_headers = {'Authorization': f'Bearer {driver_token}'}
    print('1. Driver05 Login: SUCCESS')

    # 2. Student Login
    student_login = requests.post(f'{BASE_URL}/auth/login', json={'email': 'student@demo.com', 'password': 'password', 'role': 'STUDENT'})
    assert student_login.status_code == 200, f'Student login failed: {student_login.text}'
    student_token = student_login.json()['access_token']
    print('2. Student Login: SUCCESS')

    # 3. Check current trip or start trip
    current = requests.get(f'{BASE_URL}/trips/current', headers=driver_headers).json()
    if current.get('active'):
        trip_id = current['trip_id']
        print(f'3. Driver05 has active trip: ID={trip_id}')
    else:
        start_res = requests.post(f'{BASE_URL}/trips/start', headers=driver_headers)
        assert start_res.status_code == 200, f'Start trip failed: {start_res.text}'
        trip_id = start_res.json()['trip_id']
        bus_num = start_res.json().get('bus_number')
        print(f'3. Driver05 started new trip: ID={trip_id}, Bus={bus_num}')

    # 4. Test WebSocket receive while Driver posts location
    async def test_ws_and_location():
        async with websockets.connect(WS_URL) as ws:
            print('4. Student connected to WebSocket successfully')
            
            # Post new GPS location
            loc_payload = {
                'latitude': 11.0255,
                'longitude': 77.0010,
                'speed': 32.0,
                'heading': 180.0,
                'accuracy': 4.5,
                'timestamp': '2026-10-15T06:35:00Z'
            }
            loc_res = requests.post(f'{BASE_URL}/trips/{trip_id}/location', json=loc_payload, headers=driver_headers)
            assert loc_res.status_code == 200, f'Post location failed: {loc_res.text}'
            print('5. Driver posted GPS location: SUCCESS')
            
            # Receive WebSocket event
            msg = await asyncio.wait_for(ws.recv(), timeout=5.0)
            data = json.loads(msg)
            print('6. Student received WebSocket event:', data)
            assert data.get('type') == 'BUS_LOCATION_UPDATED', f'Wrong event type: {data}'
            assert isinstance(data.get('bus_id'), int), 'bus_id must be an integer'
            assert data.get('bus_number') == '05', 'bus_number must match 05'
            assert data.get('latitude') == 11.0255, 'Latitude mismatch'
            assert data.get('longitude') == 77.0010, 'Longitude mismatch'
            print('7. Verification of numeric bus_id, bus_number, and coordinates: PASSED')

    asyncio.run(test_ws_and_location())

    # 8. Check active buses endpoint for student map
    active_buses = requests.get(f'{BASE_URL}/buses/active', headers={'Authorization': f'Bearer {student_token}'}).json()
    matched = [b for b in active_buses if b['bus_number'] == '05']
    assert len(matched) > 0, 'Bus 05 not found in active buses'
    print(f'8. Student Active Buses endpoint returns updated bus 05 location: Latitude={matched[0]["latitude"]}, Longitude={matched[0]["longitude"]}')
    print('\nALL END-TO-END VERIFICATION CHECKS PASSED!')

if __name__ == '__main__':
    main()
