# Project Pulse - Today's Deliverables & Demo Guide

---

## 📦 Deliverables (One-Liners)

1. **Rebuilt frontend from scratch** - Clean HTML/CSS/JS with proper flexbox layout
2. **3-chart horizontal layout** - 1m, 5m, 15m TradingView charts side-by-side
3. **Left sidebar watchlist** - Tickers with labeled trend dots (1m/5m/15m)
4. **Right execution panel** - Order type, size calculator, BUY/SELL, ARM/KILL
5. **Blinking trend dots** - Visual signals that blink on new alerts (simulated)
6. **Click-to-refresh dots** - Clicking a dot stops blink and refreshes that chart
7. **Complete documentation** - README, Frontend, API, and Architecture docs

---

## 🎬 Loom Script (2-3 minutes)

### Intro (15 sec)
> "Hey! I'm going to walk you through Dashboard - a real-time trading terminal I built. It features live TradingView charts, a watchlist with signal indicators, and a compact execution panel. Let me show you how it works."

### Layout Overview (30 sec)
> "The interface has three main sections:
> - On the **left**, we have the watchlist with our tracked tickers
> - In the **center**, three TradingView charts showing 1-minute, 5-minute, and 15-minute timeframes
> - On the **right**, the execution panel for placing trades
> 
> At the top, you'll see the notification bar and a scrolling ticker tape with market data."

### Watchlist Demo (30 sec)
> "Let me click on NVDA... Notice how all three charts update to show NVIDIA data. Each ticker has three trend dots - for 1m, 5m, and 15m timeframes. When a signal is detected, these dots blink to grab your attention. If I click on a blinking dot, it stops the animation and refreshes that specific chart."

### Execution Panel Demo (30 sec)
> "The execution panel on the right lets you set your order type - Market or Limit. Enter your risk amount and stop loss, and it automatically calculates your position size. Before trading, you need to arm the system with this button. And if anything goes wrong, the Kill switch immediately disables trading."

### Add Ticker Demo (20 sec)
> "You can easily add new tickers by clicking the plus button. Let me add Microsoft... And now MSFT appears in the watchlist ready to track."

### Closing (15 sec)
> "That's the trading terminal! It's designed for fast, focused trading with all the essential tools in one view. The codebase is fully documented for easy onboarding. Thanks for watching!"

---

## 📋 Step-by-Step Demo Guide

### 1. Start the Application
```bash
cd project_pulse
.\.venv\Scripts\activate
uvicorn src.app.main:app --reload
```
Open: `http://localhost:8000/pro`

### 2. Show the Layout
- Point to **left sidebar** → "Watchlist with tickers"
- Point to **center** → "3 horizontal charts: 1m, 5m, 15m"
- Point to **right panel** → "Execution controls"
- Point to **top** → "Notification bar and ticker tape"

### 3. Switch Tickers
- Click **NVDA** → All 3 charts reload with NVDA data
- Click **AAPL** → Charts switch to Apple
- Notice toast notification: "Switched to AAPL"

### 4. Trend Dots
- Wait for a dot to start **blinking**
- Explain: "Blinking = new signal detected"
- Click the blinking dot → "Stops blink, refreshes chart"

### 5. Execution Panel
- Set **Order Type**: Click MKT / LMT
- Enter **Risk**: Type "50" in Risk field
- Enter **Stop Loss**: Type a price below current
- Show **calculated shares** updating
- Click **ARM SYSTEM** → Button turns green
- Point to BUY/SELL → "Now enabled for trading"
- Click **KILL** → "Emergency stop, disables everything"

### 6. Add New Ticker
- Click the **+** button
- Enter "MSFT"
- Show new ticker appears in watchlist

### 7. Closing Shot
- Zoom out to show full interface
- Conclude with overview of all components
