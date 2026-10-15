from fastapi import WebSocket
from typing import Dict, List
import json

class ConnectionManager:
    def __init__(self):
        # college_id -> list of WebSockets
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, college_id: str):
        await websocket.accept()
        if college_id not in self.active_connections:
            self.active_connections[college_id] = []
        self.active_connections[college_id].append(websocket)

    def disconnect(self, websocket: WebSocket, college_id: str):
        if college_id in self.active_connections:
            try:
                self.active_connections[college_id].remove(websocket)
            except ValueError:
                pass

    async def broadcast(self, message: str, college_id: str):
        if college_id in self.active_connections:
            for connection in self.active_connections[college_id]:
                try:
                    await connection.send_text(message)
                except Exception:
                    pass

manager = ConnectionManager()
