import databento
import logging
import asyncio
import random
import pandas as pd
from datetime import datetime, timezone, timedelta
from typing import List, Dict
from src.app.core.config import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("databento_adapter")

class DatabentoAdapter:
    def __init__(self):
        if settings.DATABENTO_KEY == "unset":
            logger.warning("Databento Key is MISSING. Simulation will be forced.")
        
        self.historical = databento.Historical(key=settings.DATABENTO_KEY)
        
        # Only init live client if strictly needed and key exists
        if not settings.USE_SIMULATION and settings.DATABENTO_KEY != "unset":
            self.live = databento.Live(key=settings.DATABENTO_KEY)
        else:
            self.live = None

        self.futures_roots = ["ES", "NQ", "CL", "GC", "RTY", "MNQ", "MES", "BTC"]

    def _get_dataset(self, symbol: str) -> str:
        for root in self.futures_roots:
            if symbol.upper().startswith(root):
                return "GLBX.MDP3"
        return "XNAS.ITCH"

    def _normalize_record(self, record: pd.Series, symbol: str, dataset: str) -> Dict:
        """Helper to convert Databento row to our standard Domain Dict"""
        return {
            "symbol": symbol,
            "dataset": dataset,
            "timestamp": int(record.name.timestamp()), # Convert to Unix Seconds
            "open": float(record.get("open")),
            "high": float(record.get("high")),
            "low": float(record.get("low")),
            "close": float(record.get("close")),
            "volume": int(record.get("volume"))
        }

    async def get_history(self, symbol: str, lookback_days: int = 2) -> List[Dict]:
        """
        Attempts to fetch REAL history.
        """
        if settings.DATABENTO_KEY == "unset":
            return self._generate_mock_history(symbol, count=100)

        try:
            dataset = self._get_dataset(symbol)
            now = datetime.now(timezone.utc)
            
            # Go back 15 minutes from now to ensure data is available
            # Databento data has ~10-15 min delay for retail accounts
            end = now - timedelta(minutes=15)
            end = end.replace(second=0, microsecond=0)
            
            start = end - timedelta(days=lookback_days)
            
            # Handle weekends
            if end.weekday() >= 5: 
                start = start - timedelta(days=2)
                end = end - timedelta(days=2)

            logger.info(f"📥 Fetching REAL history for {symbol} from {dataset}...")
            logger.info(f"   Range: {start} to {end}")
            
            data = self.historical.timeseries.get_range(
                dataset=dataset,
                symbols=[symbol],
                start=start,
                end=end,
                schema="ohlcv-1m"
            )
            
            if data.empty:
                logger.warning(f"⚠️ Real history empty for {symbol}. Falling back to Mock.")
                return self._generate_mock_history(symbol, count=100)

            history = []
            for index, row in data.iterrows():
                row.name = index 
                history.append(self._normalize_record(row, symbol, dataset))
                
            logger.info(f"✅ Loaded {len(history)} REAL bars from Databento.")
            return history

        except Exception as e:
            logger.error(f"❌ Real History Failed ({str(e)}). Falling back to MOCK.")
            return self._generate_mock_history(symbol, count=100)

    async def start_stream(self, symbol: str):
        """Yields Live Data (or Simulation)"""
        if settings.USE_SIMULATION:
            logger.info(f"⚡ STARTING SIMULATION STREAM for {symbol}")
            async for bar in self._simulate_price_action(symbol):
                yield bar
        else:
            if not self.live:
                 yield {"error": "Live Client not initialized"}
                 return

            dataset = self._get_dataset(symbol)
            logger.info(f"Starting Live Stream for {symbol} on {dataset}...")
            try:
                self.live.subscribe(
                    dataset=dataset,
                    schema="ohlcv-1m",
                    symbols=[symbol],
                    stype_in="raw_symbol" 
                )
                async for record in self.live:
                    if isinstance(record, databento.OHLCVMsg):
                        yield {
                            "symbol": symbol,
                            "price": record.close / 1e9,
                            "open": record.open / 1e9,
                            "high": record.high / 1e9,
                            "low": record.low / 1e9,
                            "timestamp": record.ts_event / 1e9,
                            "dataset": dataset
                        }
            except Exception as e:
                logger.error(f"Live Stream Failed: {e}")
                yield {"error": str(e)}

    # --- MOCK GENERATORS ---
    def _generate_mock_history(self, symbol: str, count: int) -> List[Dict]:
        """Generates consistent fake candles going back in time"""
        history = []
        price = 150.00
        now = datetime.now(timezone.utc)
        
        # Generate backwards then reverse
        for i in range(count):
            price += (random.random() - 0.5) * 2.0
            ts = now - timedelta(minutes=i)
            
            history.append({
                "symbol": symbol,
                "dataset": "SIMULATION",
                "timestamp": int(ts.timestamp()),
                "open": round(price - 0.1, 2),
                "high": round(price + 0.2, 2),
                "low": round(price - 0.2, 2),
                "close": round(price, 2),
                "volume": random.randint(100, 5000)
            })
        
        return history[::-1] # Reverse to be chronological

    async def _simulate_price_action(self, symbol: str):
        """Infinite loop of random walk prices"""
        price = 150.00 
        while True:
            await asyncio.sleep(1)
            change = (random.random() - 0.5) * 1.0 
            price += change
            
            # Send full candle structure for consistency
            yield {
                "symbol": symbol,
                "price": round(price, 2),
                "open": round(price, 2),
                "high": round(price + 0.05, 2),
                "low": round(price - 0.05, 2),
                "timestamp": datetime.now(timezone.utc).timestamp(),
                "dataset": "SIMULATION"
            }

market_data_client = DatabentoAdapter()