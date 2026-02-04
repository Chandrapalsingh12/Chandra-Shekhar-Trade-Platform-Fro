/**
 * Project Pulse - Pro Terminal
 * Main entry point - initializes all modules
 */

// Global state
const PulseState = {
    currentSymbol: 'TSLA',
    currentTvSymbol: 'NASDAQ:TSLA',
    currentPrice: 0,
    isArmed: false,
    ws: null,
    activePosition: null,
    chartWidgets: {}
};

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Project Pulse Pro Terminal initializing...');

    // Initialize modules
    PulseUI.init();
    PulseCharts.init();
    PulseExecution.init();

    // Load default ticker
    const defaultTicker = document.querySelector('.matrix-ticker.active');
    if (defaultTicker) {
        PulseCharts.loadTicker(defaultTicker.dataset.symbol, defaultTicker.dataset.tv);
    }

    // Setup watchlist click handlers for matrix tickers
    document.querySelectorAll('.matrix-ticker:not(.add-ticker)').forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Don't trigger if clicking on trend dot
            if (e.target.closest('.trend-dot-labeled')) return;

            PulseCharts.loadTicker(btn.dataset.symbol, btn.dataset.tv);

            // Update active state
            document.querySelectorAll('.matrix-ticker').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });

    console.log('✅ Pro Terminal ready');
});

// WebSocket connection handler
function connectWebSocket(symbol) {
    if (PulseState.ws) {
        PulseState.ws.close();
    }

    const statusDot = document.getElementById('statusDot');
    const statusText = document.getElementById('statusText');

    try {
        PulseState.ws = new WebSocket(`ws://${window.location.host}/api/v1/market-data/ws/${symbol}`);

        PulseState.ws.onopen = () => {
            if (statusDot) statusDot.classList.add('online');
            if (statusDot) statusDot.classList.remove('offline');
            if (statusText) statusText.textContent = 'Live';
        };

        PulseState.ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            handlePriceUpdate(data);
        };

        PulseState.ws.onerror = () => {
            console.warn('WebSocket error, falling back to mock');
            startMockPrices();
        };

        PulseState.ws.onclose = () => {
            if (statusDot) statusDot.classList.remove('online');
            if (statusDot) statusDot.classList.add('offline');
            if (statusText) statusText.textContent = 'Offline';
        };
    } catch (e) {
        console.warn('WebSocket not available, using mock data');
        if (statusText) statusText.textContent = 'Mock';
        startMockPrices();
    }
}

function handlePriceUpdate(data) {
    PulseState.currentPrice = data.price;

    // Update top bar
    const priceEl = document.getElementById('livePrice');
    if (priceEl) priceEl.textContent = `$${data.price.toFixed(2)}`;

    // Update sidebar mini-price
    const miniPrice = document.getElementById(`price-${PulseState.currentSymbol}`);
    if (miniPrice) {
        miniPrice.textContent = data.price.toFixed(2);
    }

    // Recalculate position size
    if (typeof PulseExecution !== 'undefined') {
        PulseExecution.calculateSize();
    }

    // Update position P&L
    if (PulseState.activePosition && typeof PulseExecution !== 'undefined') {
        PulseExecution.updatePositionPnL();
    }
}

// Mock price generator for development
function startMockPrices() {
    let basePrice = 150 + Math.random() * 20;

    const statusText = document.getElementById('statusText');
    if (statusText) statusText.textContent = 'Mock';

    setInterval(() => {
        basePrice += (Math.random() - 0.5) * 0.5;

        const mockData = {
            price: basePrice,
            bid: basePrice - 0.01,
            ask: basePrice + 0.01,
            bidSize: Math.floor(Math.random() * 500) + 100,
            askSize: Math.floor(Math.random() * 500) + 100,
            type: Math.random() > 0.5 ? 'trade' : 'quote',
            size: Math.floor(Math.random() * 100) + 1,
            time: new Date().toLocaleTimeString()
        };

        handlePriceUpdate(mockData);
    }, 500);
}