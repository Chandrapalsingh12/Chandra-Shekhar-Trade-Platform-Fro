from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import List
from src.app.infrastructure.market_data.databento import market_data_client
from src.app.infrastructure.websockets.manager import ws_manager
from src.app.domain.services.utbot import UTBotStrategy

router = APIRouter()

@router.get("/history/{symbol}")
async def get_market_history(symbol: str) -> List[dict]:
    """
    Returns the last N bars for the chart.
    Visual Context only.
    """
    return await market_data_client.get_history(symbol)

@router.websocket("/ws/{symbol}")
async def websocket_endpoint(websocket: WebSocket, symbol: str):
    await ws_manager.connect(websocket, symbol)
    
    # 1. Initialize Strategy
    strategy = UTBotStrategy(atr_period=10, atr_multiplier=1.0)
    
    # 2. WARMUP: Fetch history to prime the ATR calculation
    # We do NOT send this to the websocket (frontend fetches it via REST)
    # We only feed it to the brain.
    print(f"DEBUG: Warming up strategy for {symbol}...")
    history = await market_data_client.get_history(symbol)
    for bar in history:
        strategy.process_bar(bar)
    
    print(f"DEBUG: Strategy Warmed Up. Current State: {strategy.position} @ {strategy.stop_val}")

    try:
        # 3. Start Live Loop
        async for bar in market_data_client.start_stream(symbol):
            # Feed Live Data
            ohlc_bar = {
                'close': bar['price'],
                'high': bar['high'], 
                'low': bar['low'],
                'open': bar['open'],
                'volume': 100
            }
            
            signal = strategy.process_bar(ohlc_bar)
            
            bar['ut_action'] = signal.action 
            bar['ut_stop'] = signal.stop_price
            bar['ut_position'] = strategy.position
            
            await ws_manager.broadcast(symbol, bar)
            
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, symbol)