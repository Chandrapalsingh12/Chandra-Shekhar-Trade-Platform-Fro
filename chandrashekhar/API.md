# API Documentation

This document covers the REST and WebSocket APIs provided by the Project Pulse backend.

---

## Base URL

```
http://localhost:8000
```

---

## REST Endpoints

### Health Check

```http
GET /health
```

**Response:**
```json
{
    "status": "online",
    "version": "0.1.0"
}
```

---

### Get Market History

```http
GET /api/v1/market-data/history/{symbol}
```

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| symbol | string | Ticker symbol (e.g., "TSLA") |

**Response:**
```json
[
    {
        "open": 150.00,
        "high": 151.50,
        "low": 149.25,
        "close": 150.75,
        "volume": 1234567,
        "timestamp": "2024-01-15T14:30:00Z"
    },
    // ... more bars
]
```

---

## WebSocket Endpoints

### Live Price Stream

```
WS /api/v1/market-data/ws/{symbol}
```

**Connection:**
```javascript
const ws = new WebSocket('ws://localhost:8000/api/v1/market-data/ws/TSLA');

ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    console.log(data);
};
```

**Message Format (Server → Client):**
```json
{
    "price": 150.25,
    "high": 150.50,
    "low": 149.80,
    "open": 150.00,
    "bid": 150.24,
    "ask": 150.26,
    "bidSize": 500,
    "askSize": 300,
    "ut_action": "BUY",
    "ut_stop": 149.50,
    "ut_position": "LONG"
}
```

**Fields:**
| Field | Type | Description |
|-------|------|-------------|
| price | float | Last trade price |
| high | float | Session high |
| low | float | Session low |
| open | float | Session open |
| bid | float | Best bid price |
| ask | float | Best ask price |
| bidSize | int | Bid quantity |
| askSize | int | Ask quantity |
| ut_action | string | UTBot signal: "BUY", "SELL", "HOLD" |
| ut_stop | float | Current stop loss price |
| ut_position | string | Current position: "LONG", "SHORT", "FLAT" |

---

## UTBot Strategy

The WebSocket endpoint includes UTBot strategy signals in real-time.

### Signal Types

| Action | Description |
|--------|-------------|
| `BUY` | Enter long position |
| `SELL` | Enter short position |
| `HOLD` | No action required |

### Stop Loss

The `ut_stop` field provides the trailing stop price calculated by the UTBot algorithm using ATR (Average True Range).

---

## Error Handling

### REST Errors

```json
{
    "detail": "Error message here"
}
```

**Status Codes:**
| Code | Description |
|------|-------------|
| 200 | Success |
| 400 | Bad Request |
| 404 | Not Found |
| 500 | Server Error |

### WebSocket Errors

On connection failure, the frontend falls back to mock data:

```javascript
ws.onerror = () => {
    console.warn('WebSocket error, using mock data');
    startMockPrices();
};
```

---

## Rate Limits

No rate limits are currently enforced for development. Production deployments should implement appropriate throttling.

---

## Authentication

Currently, no authentication is required. Future versions will implement:
- API key authentication
- JWT tokens for WebSocket connections

---

## CORS

Development server allows all origins. Configure appropriately for production:

```python
# In main.py
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://your-domain.com"],
    allow_methods=["*"],
    allow_headers=["*"],
)
```
