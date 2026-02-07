# Frontend Documentation

This document covers the frontend architecture of the Pro Terminal trading interface.

---

## File Overview

| File | Location | Purpose |
|------|----------|---------|
| `pro_terminal.html` | `templates/` | HTML structure |
| `terminal.css` | `static/css/` | All styles |
| `terminal.js` | `static/js/` | All JavaScript |

---

## HTML Structure

```html
<div id="app">
    ├── .notif-bar         <!-- Top notification bar -->
    ├── .marquee-bar       <!-- Scrolling ticker tape -->
    └── .content-row       <!-- Main 3-column layout -->
        ├── .left-sidebar  <!-- Watchlist -->
        ├── .chart-area    <!-- Center charts -->
        └── .right-sidebar <!-- Execution panel -->
</div>
```

---

## CSS Layout System

### Main Layout (Flexbox)

```css
#app {
    display: flex;
    flex-direction: column;
    height: 100vh;
}

.content-row {
    display: flex;
    flex: 1;
}

.left-sidebar  { width: 200px; }
.chart-area    { flex: 1; }
.right-sidebar { width: 260px; }
```

### Color Variables

```css
:root {
    --bg: #0a0e13;      /* Main background */
    --bg2: #111820;     /* Panel background */
    --bg3: #1a222d;     /* Card background */
    --border: #2a3441;  /* Border color */
    --accent: #2962ff;  /* Blue accent */
    --text: #e8e8e8;    /* Primary text */
    --muted: #6b7280;   /* Muted text */
    --green: #00d4aa;   /* Bullish/success */
    --red: #ff4757;     /* Bearish/error */
    --yellow: #ffc107;  /* Warning/neutral */
}
```

---

## JavaScript API Reference

### State Object

```javascript
const state = {
    symbol: 'TSLA',           // Current ticker
    tvSymbol: 'NASDAQ:TSLA',  // TradingView format
    price: 0,                 // Current price
    armed: false,             // Trading enabled
    orderType: 'MKT',         // MKT or LMT
    widgets: {}               // Chart widget instances
};
```

### Watchlist Functions

```javascript
// Select a ticker and load its charts
selectTicker(symbol, tvSymbol)

// Add new ticker via prompt
addTicker()
```

### Chart Functions

```javascript
// Load all 3 charts (1m, 5m, 15m)
loadAllCharts()

// Load a specific chart
// containerId: 'chart1', 'chart2', 'chart3'
// interval: '1', '5', '15'
loadChart(containerId, interval)
```

### Trend Dot Functions

```javascript
// Handle click on a trend dot
// - Stops blinking animation
// - Refreshes the chart for that timeframe
onDotClick(symbol, timeframe)

// Set the state of a trend dot
// trend: 'bullish', 'bearish', 'neutral'
// blink: true/false
setDot(symbol, timeframe, trend, blink)
```

### Execution Functions

```javascript
// Set order type
// type: 'MKT' or 'LMT'
setOrderType(type)

// Calculate position size from risk amount and stop loss
// Updates the "X Shares" display
calcSize()

// Toggle system arm state
toggleArm()

// Place an order
// side: 'BUY' or 'SELL'
placeOrder(side)

// Emergency stop - disarms and disables all trading
killSwitch()
```

### Notification Functions

```javascript
// Show a toast notification
// type: 'success', 'error', 'info'
showToast(message, type)

// Update the top notification bar text
updateNotif(message)
```

---

## Component Details

### Ticker Card

```html
<div class="ticker-card" data-symbol="TSLA" data-tv="NASDAQ:TSLA">
    <div class="ticker-row">
        <span class="symbol">TSLA</span>
        <span class="price" id="price-TSLA">--</span>
    </div>
    <div class="dots-row">
        <span class="dot-box" onclick="onDotClick('TSLA','1')">
            <span class="dot-label">1m</span>
            <span class="dot" id="dot-TSLA-1"></span>
        </span>
        <!-- 5m and 15m dots... -->
    </div>
</div>
```

**States:**
- `.active` - Currently selected ticker
- Hover effect on `.ticker-card`
- Click handler selects ticker and loads charts

### Trend Dots

```html
<span class="dot" id="dot-TSLA-1"></span>
```

**Classes:**
- `.bullish` - Green with glow
- `.bearish` - Red with glow
- `.neutral` - Yellow
- `.blink` - Pulsing animation

### Chart Pane

```html
<div class="chart-pane">
    <div class="chart-tag">1m</div>
    <div class="chart-widget" id="chart1"></div>
</div>
```

TradingView widgets are loaded into `.chart-widget` containers.

---

## Event Flow

### 1. Ticker Selection

```
User clicks ticker card
    → selectTicker(symbol, tvSymbol)
        → Update state.symbol
        → Update header display
        → loadAllCharts()
        → showToast("Switched to X")
```

### 2. Signal Detection

```
startTrendSimulation() runs every 2s
    → Random chance of signal
        → setDot(symbol, tf, trend, blink=true)
        → updateNotif("Signal detected")
```

### 3. Dot Click

```
User clicks blinking dot
    → onDotClick(symbol, timeframe)
        → Remove .blink class
        → If same symbol: loadChart() for that timeframe
        → If different symbol: selectTicker()
```

### 4. Order Execution

```
User enters risk and stop loss
    → calcSize() updates share count
    
User clicks ARM
    → toggleArm() enables buttons
    
User clicks BUY/SELL
    → placeOrder(side)
        → showToast("Order placed")
```

---

## Adding New Features

### Adding a New Ticker Programmatically

```javascript
// In terminal.js
const card = document.createElement('div');
card.className = 'ticker-card';
card.dataset.symbol = 'MSFT';
card.dataset.tv = 'NASDAQ:MSFT';
// ... add inner HTML
document.getElementById('watchlist').appendChild(card);
```

### Adding a New Timeframe Chart

1. Add new `.chart-pane` in HTML
2. Update `loadAllCharts()` to include new interval
3. Add corresponding trend dot in each ticker card

### Customizing Colors

Edit CSS variables in `:root`:

```css
:root {
    --accent: #your-color;
    --green: #your-green;
    /* etc. */
}
```

---

## Browser Compatibility

- Chrome 80+
- Firefox 75+
- Edge 80+
- Safari 13+

TradingView widgets require JavaScript enabled.
