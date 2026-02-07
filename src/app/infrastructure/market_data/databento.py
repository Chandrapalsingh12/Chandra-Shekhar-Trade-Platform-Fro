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
        # DEBUG: Log configuration at startup
        logger.info("=" * 50)
        logger.info("🔧 DATABENTO ADAPTER INITIALIZING")
        logger.info(f"   USE_SIMULATION: {settings.USE_SIMULATION}")
        logger.info(f"   DATABENTO_KEY set: {settings.DATABENTO_KEY != 'unset'}")
        logger.info(f"   DATABENTO_KEY length: {len(settings.DATABENTO_KEY)}")
        logger.info(f"   DATABENTO_KEY prefix: {settings.DATABENTO_KEY[:10]}..." if len(settings.DATABENTO_KEY) > 10 else f"   DATABENTO_KEY: {settings.DATABENTO_KEY}")
        logger.info("=" * 50)
        
        if settings.DATABENTO_KEY == "unset":
            logger.warning("⚠️ Databento Key is MISSING. Simulation will be forced.")
        
        self.historical = databento.Historical(key=settings.DATABENTO_KEY)
        
        # Only init live client if strictly needed and key exists
        if not settings.USE_SIMULATION and settings.DATABENTO_KEY != "unset":
            logger.info("✅ Initializing LIVE Databento client...")
            self.live = databento.Live(key=settings.DATABENTO_KEY)
        else:
            logger.warning("⚠️ Live client NOT initialized (simulation mode or missing key)")
            self.live = None

        self.futures_roots = ["ES", "NQ", "CL", "GC", "RTY", "MNQ", "MES", "BTC"]
        
        # Databento schema mapping for different intervals
        self.INTERVAL_MAP = {
            "1s": "ohlcv-1s",
            "1m": "ohlcv-1m",
            "1h": "ohlcv-1h",
            "1d": "ohlcv-1d"
        }

    def _get_dataset(self, symbol: str) -> str:
        for root in self.futures_roots:
            if symbol.upper().startswith(root):
                return "GLBX.MDP3"
        return "XNAS.ITCH"

    def _needs_normalization(self, dataset: str) -> bool:
        """GLBX.MDP3 returns fixed-point prices (divide by 1e9), XNAS.ITCH returns dollars"""
        return dataset == "GLBX.MDP3"

    def _normalize_record(self, record: pd.Series, symbol: str, dataset: str) -> Dict:
        """Helper to convert Databento row to our standard Domain Dict with proper normalization"""
        divisor = 1e9 if self._needs_normalization(dataset) else 1.0
        return {
            "symbol": symbol,
            "dataset": dataset,
            "timestamp": int(record.name.timestamp()),
            "open": float(record.get("open")) / divisor,
            "high": float(record.get("high")) / divisor,
            "low": float(record.get("low")) / divisor,
            "close": float(record.get("close")) / divisor,
            "volume": int(record.get("volume"))
        }

    async def get_history(self, symbol: str, interval: str = "1m", lookback_days: int = 2) -> List[Dict]:
        """
        Fetch historical OHLCV data from Databento.
        
        Args:
            symbol: Trading symbol (e.g., 'TSLA', 'ES.c.0')
            interval: Timeframe - '1s', '1m', '1h', '1d'
            lookback_days: Number of days to fetch
        """
        if settings.DATABENTO_KEY == "unset":
            return self._generate_mock_history(symbol, interval, count=100)

        # Validate interval
        schema = self.INTERVAL_MAP.get(interval)
        if not schema:
            logger.warning(f"⚠️ Invalid interval '{interval}'. Defaulting to 1m.")
            schema = "ohlcv-1m"

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

            logger.info(f"📥 Fetching {interval} history for {symbol} from {dataset}...")
            logger.info(f"   Schema: {schema} | Range: {start} to {end}")
            
            data = self.historical.timeseries.get_range(
                dataset=dataset,
                symbols=[symbol],
                start=start,
                end=end,
                schema=schema
            )
            
            # Convert DBNStore to DataFrame
            df = data.to_df()
            
            if len(df) == 0:
                logger.warning(f"⚠️ Real history empty for {symbol}. Falling back to Mock.")
                return self._generate_mock_history(symbol, interval, count=100)

            history = []
            for index, row in df.iterrows():
                row.name = index 
                history.append(self._normalize_record(row, symbol, dataset))
                
            logger.info(f"✅ Loaded {len(history)} REAL bars from Databento.")
            return history

        except Exception as e:
            logger.error(f"❌ Real History Failed ({str(e)}). Falling back to MOCK.")
            return self._generate_mock_history(symbol, interval, count=100)

    async def start_stream(self, symbol: str):
        """Yields Live Data (or Simulation)"""
        logger.info(f"🔄 start_stream called for {symbol}")
        logger.info(f"   USE_SIMULATION = {settings.USE_SIMULATION}")
        logger.info(f"   self.live = {self.live}")
        
        if settings.USE_SIMULATION:
            logger.info(f"⚡ STARTING SIMULATION STREAM for {symbol}")
            async for bar in self._simulate_price_action(symbol):
                yield bar
        else:
            if not self.live:
                 logger.error("❌ Live Client is None!")
                 yield {"error": "Live Client not initialized"}
                 return

            dataset = self._get_dataset(symbol)
            divisor = 1e9 if self._needs_normalization(dataset) else 1.0
            logger.info(f"🚀 Starting REAL Live Stream for {symbol} on {dataset}...")
            logger.info(f"   Divisor: {divisor}")
            try:
                logger.info(f"📡 Subscribing to {dataset} / {symbol}...")
                self.live.subscribe(
                    dataset=dataset,
                    schema="ohlcv-1m",
                    symbols=[symbol],
                    stype_in="raw_symbol" 
                )
                logger.info(f"✅ Subscribed! Waiting for data...")
                record_count = 0
                async for record in self.live:
                    record_count += 1
                    if record_count <= 3:
                        logger.info(f"📊 Received record #{record_count}: {type(record).__name__}")
                    if isinstance(record, databento.OHLCVMsg):
                        price = record.close / divisor
                        if record_count <= 3:
                            logger.info(f"   💰 Price: {price}")
                        yield {
                            "symbol": symbol,
                            "price": price,
                            "open": record.open / divisor,
                            "high": record.high / divisor,
                            "low": record.low / divisor,
                            "timestamp": record.ts_event / 1e9,
                            "dataset": dataset
                        }
            except Exception as e:
                error_msg = str(e)
                logger.error(f"❌ Live Stream Failed: {error_msg}")
                import traceback
                logger.error(traceback.format_exc())
                
                # Check if this is a license issue - fall back to simulation
                if "license" in error_msg.lower():
                    logger.warning("⚠️ Live data license not available. Falling back to SIMULATION.")
                    logger.warning("💡 To get live data, upgrade to Databento's live streaming plan.")
                    async for bar in self._simulate_price_action(symbol):
                        yield bar
                else:
                    yield {"error": error_msg}

    # --- MOCK GENERATORS ---
    def _generate_mock_history(self, symbol: str, interval: str = "1m", count: int = 100) -> List[Dict]:
        """Generates consistent fake candles going back in time"""
        history = []
        price = 150.00
        now = datetime.now(timezone.utc)
        
        # Map interval to timedelta
        interval_deltas = {
            "1s": timedelta(seconds=1),
            "1m": timedelta(minutes=1),
            "1h": timedelta(hours=1),
            "1d": timedelta(days=1)
        }
        delta = interval_deltas.get(interval, timedelta(minutes=1))
        
        # Generate backwards then reverse
        for i in range(count):
            price += (random.random() - 0.5) * 2.0
            ts = now - (delta * i)
            
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
        
        return history[::-1]  # Reverse to be chronological

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