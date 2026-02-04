from typing import Optional
from dataclasses import dataclass

@dataclass
class Signal:
    action: str  # "BUY", "SELL", or "HOLD"
    stop_price: float
    entry_price: float
    reason: str

class UTBotStrategy:
    """
    Python implementation of the UT Bot Strategy.
    Source Logic: focus-chart-fixed7.html lines 351-428
    """
    def __init__(self, atr_period: int = 10, atr_multiplier: float = 1.0):
        self.atr_period = atr_period
        self.mult = atr_multiplier
        
        # State
        self.bars = [] # Keep history for ATR calc
        self.position = "FLAT" # FLAT, LONG, SHORT
        self.stop_val = 0.0
        self.is_initialized = False

    def _calculate_atr(self) -> float:
        """Standard ATR Calculation"""
        if len(self.bars) < 2:
            return 0.0
        
        # We only need the last 'period' bars
        # Optimization: In production, we'd use a rolling window buffer
        period_bars = self.bars[-(self.atr_period + 1):] 
        tr_sum = 0.0
        
        for i in range(1, len(period_bars)):
            curr = period_bars[i]
            prev = period_bars[i-1]
            
            high = curr['high']
            low = curr['low']
            prev_close = prev['close']
            
            tr = max(high - low, abs(high - prev_close), abs(low - prev_close))
            tr_sum += tr
            
        return tr_sum / self.atr_period

    def process_bar(self, bar: dict) -> Signal:
        """
        Ingests a new candle and updates the trailing stop.
        Returns a Signal if the state flips.
        """
        self.bars.append(bar)
        # Keep memory small
        if len(self.bars) > self.atr_period + 5:
            self.bars.pop(0)

        # Need enough data for ATR
        if len(self.bars) <= self.atr_period:
            return Signal("HOLD", 0.0, bar['close'], "Warming Up")

        atr = self._calculate_atr()
        dist = atr * self.mult
        close = bar['close']
        
        # Initialize Stop if first run
        if not self.is_initialized:
            self.stop_val = close - dist
            self.position = "LONG"
            self.is_initialized = True
            return Signal("HOLD", self.stop_val, close, "Init")

        action = "HOLD"
        
        # Logic Ported from JS:
        if self.position == "LONG":
            new_stop = close - dist
            # Trail up only
            self.stop_val = max(self.stop_val, new_stop)
            
            if close < self.stop_val:
                self.position = "SHORT"
                self.stop_val = close + dist # Flip to Short Stop
                action = "SELL"
                
        elif self.position == "SHORT":
            new_stop = close + dist
            # Trail down only
            self.stop_val = min(self.stop_val, new_stop)
            
            if close > self.stop_val:
                self.position = "LONG"
                self.stop_val = close - dist # Flip to Long Stop
                action = "BUY"

        return Signal(
            action=action, 
            stop_price=round(self.stop_val, 2), 
            entry_price=close,
            reason="UTBot Flip"
        )