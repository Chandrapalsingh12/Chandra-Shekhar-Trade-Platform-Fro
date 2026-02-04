import logging
import httpx
from datetime import datetime
from src.app.core.config import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("broker_adapter")

class TradeStationAdapter:
    def __init__(self):
        self.is_simulation = settings.USE_SIMULATION
        
        if self.is_simulation:
            self.base_url = "https://sim-api.tradestation.com/v3"
        else:
            self.base_url = "https://api.tradestation.com/v3"
            
        self.account_id = settings.TRADESTATION_ACCOUNT_ID
        self.access_token = None

    async def _get_headers(self):
        """
        Helper to construct auth headers.
        In a full implementation, this would refresh the token if expired.
        """
        # For now, we assume the user put a valid Access Token in .env or we skip if strictly Sim
        return {
            "Authorization": f"Bearer {settings.TRADESTATION_REFRESH_TOKEN}",
            "Content-Type": "application/json"
        }

    async def execute_order(self, symbol: str, action: str, quantity: int = 10, price: float = 0.0):
        """
        Executes an order on TradeStation (Live or Sim API).
        """
        timestamp = datetime.now().strftime("%H:%M:%S")
        
        # 1. Map generic action to TradeStation specific values
        # TS expects: "Buy", "Sell", "SellShort", "BuyToCover"
        ts_action = "Buy" if action.upper() == "BUY" else "SellShort" 

        # 2. Construct the Payload
        order_payload = {
            "AccountID": self.account_id,
            "Symbol": symbol,
            "Quantity": str(quantity),
            "OrderType": "Market",
            "TradeAction": ts_action,
            "TimeInForce": {"Duration": "DAY"},
            "Route": "Intelligent"
        }

        # 3. EXECUTION MODE
        # If we have no keys, default to "Paper Print" safely
        if settings.TRADESTATION_REFRESH_TOKEN == "unset":
             logger.info(f"🔵 [PAPER TRADE] {timestamp} | {ts_action} {quantity} {symbol} @ ${price:.2f}")
             logger.info(f"    Payload: {order_payload}")
             return {"status": "filled", "id": "paper_123"}

        # 4. REAL HTTP REQUEST (Async)
        try:
            url = f"{self.base_url}/orderexecution/orders"
            headers = await self._get_headers()
            
            async with httpx.AsyncClient() as client:
                logger.info(f"🚀 SENDING ORDER to {url}...")
                response = await client.post(url, json=order_payload, headers=headers)
                
                if response.status_code in [200, 201]:
                    data = response.json()
                    logger.info(f"✅ ORDER PLACED: ID {data.get('Orders', [{}])[0].get('OrderID')}")
                    return {"status": "filled", "response": data}
                else:
                    logger.error(f"❌ ORDER FAILED: {response.status_code} - {response.text}")
                    return {"status": "failed", "error": response.text}
                    
        except Exception as e:
            logger.error(f"CRITICAL HTTP ERROR: {str(e)}")
            return {"status": "error", "message": str(e)}

# Global Instance
broker_client = TradeStationAdapter()