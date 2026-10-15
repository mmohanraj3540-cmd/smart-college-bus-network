from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.websocket.manager import manager

router = APIRouter()

@router.websocket("/ws/college/{college_id}")
async def websocket_endpoint(websocket: WebSocket, college_id: str):
    await manager.connect(websocket, college_id)
    try:
        while True:
            data = await websocket.receive_text()
            # Handle incoming commands if any, mostly we just broadcast from other endpoints
    except WebSocketDisconnect:
        manager.disconnect(websocket, college_id)
