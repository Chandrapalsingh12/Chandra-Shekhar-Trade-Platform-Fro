# Project Pulse - Trading Terminal

A real-time trading terminal with TradingView charts, live market data, and automated signal detection using the UTBot strategy.

---

## 🚀 Quick Start

```bash
# 1. Clone and navigate
cd project_pulse

# 2. Create virtual environment
python -m venv .venv

# 3. Activate (Windows)
.\.venv\Scripts\activate

# 4. Install dependencies
pip install -r requirements.txt

# 5. Run the server
uvicorn src.app.main:app --reload --port 8000

# 6. Open browser
http://localhost:8000/pro
```

---

## 📁 Project Structure

```
project_pulse/
├── src/
│   └── app/
│       ├── main.py                 # FastAPI entry point
│       ├── api/
│       │   └── v1/
│       │       └── market_data.py  # REST + WebSocket endpoints
│       ├── core/
│       │   └── config.py           # App settings
│       ├── domain/
│       │   ├── models/             # Data models (Position, Signal, etc.)
│       │   └── services/
│       │       └── utbot.py        # UTBot trading strategy
│       ├── infrastructure/
│       │   ├── brokers/            # Broker integrations (Alpaca)
│       │   ├── market_data/        # Data providers (Databento)
│       │   └── websockets/         # WebSocket connection manager
│       ├── static/
│       │   ├── css/
│       │   │   └── terminal.css    # Main stylesheet
│       │   └── js/
│       │       └── terminal.js     # Frontend logic
│       └── templates/
│           └── pro_terminal.html   # Main trading UI
├── tests/                          # Test files
├── requirements.txt                # Python dependencies
└── .env                            # Environment variables
```

---

## 🎨 Frontend Architecture

### Layout (Flexbox)

```
┌─────────────────────────────────────────────────────────────────┐
│                    🔔 Notification Bar (32px)                   │
├─────────────────────────────────────────────────────────────────┤
│                    📈 Marquee Ticker Tape (28px)                │
├──────────────┬────────────────────────────────┬─────────────────┤
│              │                                │                 │
│  WATCHLIST   │    1m    │    5m    │   15m    │   EXECUTION     │
│   (200px)    │  Chart   │  Chart   │  Chart   │    PANEL        │
│              │          │          │          │   (260px)       │
│  - TSLA      │                                │                 │
│  - NVDA      │    ← TradingView Widgets →     │  Order Type     │
│  - AAPL      │       (flex: 1)                │  Size Calc      │
│  - SPY       │                                │  BUY / SELL     │
│              │                                │  ARM / KILL     │
└──────────────┴────────────────────────────────┴─────────────────┘
```

### Key Files

| File | Purpose |
|------|---------|
| `pro_terminal.html` | Main UI structure |
| `terminal.css` | All styles (flexbox layout, animations) |
| `terminal.js` | All frontend logic (charts, execution, toasts) |

### CSS Classes

| Class | Description |
|-------|-------------|
| `.left-sidebar` | Watchlist panel (200px fixed width) |
| `.chart-area` | Center charts container (flex: 1) |
| `.right-sidebar` | Execution panel (260px fixed width) |
| `.charts-grid` | Horizontal 3-chart layout |
| `.ticker-card` | Watchlist item with trend dots |
| `.dot.blink` | Blinking animation for signals |

### JavaScript Functions

```javascript
// Watchlist
selectTicker(symbol, tvSymbol)  // Switch active ticker
addTicker()                      // Add new ticker via prompt

// Charts
loadAllCharts()                  // Load 1m, 5m, 15m charts
loadChart(containerId, interval) // Load specific chart

// Trend Dots
onDotClick(symbol, tf)           // Handle dot click (stops blink, refreshes chart)
setDot(symbol, tf, trend, blink) // Set dot state (bullish/bearish/neutral)

// Execution
setOrderType(type)               // MKT or LMT
calcSize()                       // Calculate position size from risk
toggleArm()                      // Arm/disarm trading system
placeOrder(side)                 // Execute BUY or SELL
killSwitch()                     // Emergency stop

// Notifications
showToast(msg, type)             // Display toast notification
updateNotif(msg)                 // Update top notification bar
```

---

## 🔌 Backend Architecture

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Home page |
| GET | `/pro` | Pro Terminal UI |
| GET | `/health` | Health check |
| GET | `/api/v1/market-data/history/{symbol}` | Historical bars |
| WS | `/api/v1/market-data/ws/{symbol}` | Live price stream |

### WebSocket Message Format

```json
{
  "price": 150.25,
  "high": 150.50,
  "low": 149.80,
  "open": 150.00,
  "ut_action": "BUY",      // UTBot signal
  "ut_stop": 149.50,       // Stop price
  "ut_position": "LONG"    // Current position
}
```

### UTBot Strategy (`domain/services/utbot.py`)

The UTBot strategy uses ATR (Average True Range) for trailing stops:

```python
class UTBotStrategy:
    def __init__(self, atr_period=10, atr_multiplier=1.0):
        # Configurable parameters
        
    def process_bar(self, bar: dict) -> Signal:
        # Returns: Signal(action='BUY'|'SELL'|'HOLD', stop_price=float)
```

---

## 🛠️ Development Guide

### Adding a New Ticker to Watchlist

1. Click the `+` button in the watchlist
2. Enter ticker symbol (e.g., "MSFT")
3. The ticker is added with trend dots

### Trend Dot Behavior

- **Gray**: No signal (neutral)
- **Green (bullish)**: Buy signal detected
- **Red (bearish)**: Sell signal detected
- **Blinking**: New signal just arrived
- **Click on blinking dot**: Stops blink and refreshes that timeframe's chart

### Order Execution Flow

1. **Arm the system**: Click "🟢 ARM SYSTEM"
2. **Set risk**: Enter dollar amount to risk
3. **Set stop loss**: Enter stop loss price
4. **Size auto-calculates**: Shares = Risk / (Price - Stop)
5. **Execute**: Click BUY or SELL

---

## ⚙️ Environment Variables

Create `.env` file in project root:

```env
DATABENTO_API_KEY=your_key_here
ALPACA_API_KEY=your_key_here
ALPACA_SECRET_KEY=your_secret_here
ALPACA_PAPER=true
```

---

## 🧪 Testing

```bash
# Run all tests
pytest tests/

# Run with coverage
pytest --cov=src tests/
```

---

## 📦 Key Dependencies

| Package | Purpose |
|---------|---------|
| `fastapi` | Web framework |
| `uvicorn` | ASGI server |
| `jinja2` | HTML templating |
| `websockets` | Real-time connections |
| `databento` | Market data provider |
| `alpaca-py` | Broker integration |

---

## 🔧 Common Issues

### Charts Not Loading
- Ensure TradingView CDN is accessible
- Check browser console for errors
- Verify symbol format (e.g., `NASDAQ:TSLA`)

### WebSocket Disconnects
- Mock prices are used when WebSocket fails
- Check `/health` endpoint for server status

### Layout Issues
- Hard refresh (`Ctrl+Shift+R`) to clear CSS cache
- Verify `terminal.css` is being loaded

---

## 📝 Code Style

- **Python**: PEP 8, type hints
- **JavaScript**: ES6+, single quotes
- **CSS**: BEM-like naming, CSS variables




