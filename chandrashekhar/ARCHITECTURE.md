# Architecture Overview

This document describes the technical architecture of Project Pulse.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │   HTML      │  │    CSS      │  │     JS      │             │
│  │  (Jinja2)   │  │  (Flexbox)  │  │ (Vanilla)   │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
│        │                                   │                    │
│        └───────────────┬───────────────────┘                    │
│                        ▼                                        │
│              ┌─────────────────┐                                │
│              │  TradingView    │  (External CDN)                │
│              │    Widgets      │                                │
│              └─────────────────┘                                │
└─────────────────────────────────────────────────────────────────┘
                         │
                         │ HTTP / WebSocket
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                         BACKEND                                 │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    FastAPI (main.py)                      │  │
│  │  • REST endpoints                                         │  │
│  │  • WebSocket connections                                  │  │
│  │  • Static file serving                                    │  │
│  │  • Template rendering                                     │  │
│  └──────────────────────────────────────────────────────────┘  │
│          │                    │                    │            │
│          ▼                    ▼                    ▼            │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │    API       │    │   Domain     │    │Infrastructure│      │
│  │   Layer      │    │   Layer      │    │    Layer     │      │
│  │              │    │              │    │              │      │
│  │ • Routes     │    │ • Models     │    │ • Brokers    │      │
│  │ • Handlers   │    │ • Services   │    │ • Market Data│      │
│  │              │    │ • Strategy   │    │ • WebSockets │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
└─────────────────────────────────────────────────────────────────┘
                         │                    │
                         ▼                    ▼
              ┌─────────────────┐  ┌─────────────────┐
              │   Databento     │  │     Alpaca      │
              │  (Market Data)  │  │    (Broker)     │
              └─────────────────┘  └─────────────────┘
```

---

## Layer Descriptions

### API Layer (`src/app/api/`)

Handles HTTP requests and WebSocket connections.

```
api/
├── dependencies.py     # Dependency injection
└── v1/
    └── market_data.py  # REST + WS endpoints
```

**Responsibilities:**
- Route definitions
- Request validation
- Response formatting
- WebSocket management

### Domain Layer (`src/app/domain/`)

Contains business logic and data models.

```
domain/
├── models/
│   ├── candle.py       # OHLCV data
│   ├── position.py     # Trading position
│   └── signal.py       # Trading signals
└── services/
    └── utbot.py        # UTBot strategy
```

**Responsibilities:**
- Trading strategy logic
- Position management
- Signal generation

### Infrastructure Layer (`src/app/infrastructure/`)

Handles external service integrations.

```
infrastructure/
├── brokers/
│   └── alpaca/         # Alpaca broker client
├── market_data/
│   └── databento.py    # Databento market data
└── websockets/
    └── manager.py      # WS connection manager
```

**Responsibilities:**
- Market data streaming
- Order execution
- Connection management

---

## Data Flow

### 1. Price Update Flow

```
Databento API
    │
    ▼ (async stream)
Market Data Client
    │
    ▼ (process_bar)
UTBot Strategy
    │
    ▼ (signal + stop)
WebSocket Manager
    │
    ▼ (broadcast)
Frontend JS
    │
    ▼ (update UI)
Browser DOM
```

### 2. Order Execution Flow

```
User clicks BUY/SELL
    │
    ▼
terminal.js placeOrder()
    │
    ▼ (future: API call)
Backend Order Handler
    │
    ▼
Alpaca Broker Client
    │
    ▼
Exchange
```

---

## Key Design Decisions

### 1. Single-File Frontend

All JavaScript is consolidated into `terminal.js` for:
- Simpler debugging
- No build step required
- Easy onboarding

### 2. Flexbox Layout

CSS Flexbox chosen over Grid for:
- Better browser support
- Simpler implementation
- Predictable behavior

### 3. WebSocket for Live Data

WebSocket used instead of polling for:
- Real-time updates
- Lower latency
- Reduced server load

### 4. Mock Data Fallback

Frontend falls back to mock prices when WebSocket fails:
- Enables offline development
- Graceful degradation

---

## Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | HTML5, CSS3, Vanilla JS |
| Charts | TradingView Widgets |
| Backend | FastAPI (Python 3.10+) |
| Server | Uvicorn (ASGI) |
| Market Data | Databento |
| Broker | Alpaca |

---

## Security Considerations

### Current State (Development)

- No authentication
- All origins allowed (CORS)
- HTTP only

### Production Recommendations

- Implement API key authentication
- Restrict CORS origins
- Use HTTPS
- Add rate limiting
- Validate all user inputs

---

## Scalability

### Current Architecture

- Single server instance
- In-memory WebSocket management
- No database

### Future Considerations

- Redis for WebSocket pub/sub
- PostgreSQL for order history
- Kubernetes for scaling
- CDN for static assets
