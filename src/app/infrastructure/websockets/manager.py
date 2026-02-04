from fastapi import WebSocket
from typing import List, Dict
import json

class ConnectionManager:
    """
    Manages active WebSocket connections from the Frontend (TradingView).
    Broadcasts live price updates to all connected charts.
    """
    def __init__(self):
        # Stores active connections: {"TSLA": [socket1, socket2], "AAPL": [socket3]}
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, symbol: str):
        await websocket.accept()
        if symbol not in self.active_connections:
            self.active_connections[symbol] = []
        self.active_connections[symbol].append(websocket)
        print(f"DEBUG: Client connected to stream: {symbol}")

    def disconnect(self, websocket: WebSocket, symbol: str):
        if symbol in self.active_connections:
            if websocket in self.active_connections[symbol]:
                self.active_connections[symbol].remove(websocket)
            if not self.active_connections[symbol]:
                del self.active_connections[symbol]

    async def broadcast(self, symbol: str, data: dict):
        """
        Pushes a JSON payload to all clients watching a specific ticker.
        """
        if symbol in self.active_connections:
            message = json.dumps(data)
            # Iterate through copy to handle disconnects safely
            for connection in self.active_connections[symbol][:]:
                try:
                    await connection.send_text(message)
                except Exception:
                    self.disconnect(connection, symbol)

# --- THIS WAS MISSING ---
# Global Instance to be imported by other files
ws_manager = ConnectionManager()