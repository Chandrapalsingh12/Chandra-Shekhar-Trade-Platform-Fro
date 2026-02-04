/**
 * Terminal V2 - Complete Implementation
 */

// ========== STATE ==========
const state = {
    symbol: 'TSLA',
    tvSymbol: 'NASDAQ:TSLA',
    price: 0,
    armed: false,
    activeChartIndex: 0, // Track which chart is focused for ARM
    orderType: 'MKT',
    widgets: {},
    chartTf: { 1: '1', 2: '5', 3: '15' },
    signalQueue: [],
    pinned: { left: true, right: false }
};

const TIMEFRAMES = ['1', '5', '15', '4h', '8h', 'D', 'W'];

// ========== INIT ==========
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Terminal V2 initializing...');

    loadAllCharts();
    startMockPrices();
    startSignalSimulation();
    setupResizeHandles();
    setupChartSelection(); // Add click handlers for chart focus

    console.log('✅ Terminal V2 ready');
});

// ========== WATCHLIST (f) ==========
function selectTicker(card) {
    if (!card.dataset.symbol) return;

    const symbol = card.dataset.symbol;
    const tvSymbol = card.dataset.tv;

    // Clear notification dot
    const notifDot = document.getElementById(`notif-${symbol}`);
    if (notifDot) notifDot.classList.remove('active');

    state.symbol = symbol;
    state.tvSymbol = tvSymbol;

    // Update active state
    document.querySelectorAll('.ticker-card').forEach(c => c.classList.remove('active'));
    card.classList.add('active');

    // Update header
    document.getElementById('activeSymbol').textContent = symbol;

    // Reload all charts with new symbol
    loadAllCharts();

    showToast(`Switched to ${symbol}`, 'info');
}

function addTicker() {
    const sym = prompt('Enter ticker symbol (e.g., MSFT):');
    if (!sym) return;

    const upper = sym.toUpperCase();
    const watchlist = document.getElementById('watchlist');
    const addBtn = watchlist.querySelector('.add-btn');

    const card = document.createElement('div');
    card.className = 'ticker-card';
    card.dataset.symbol = upper;
    card.dataset.tv = `NASDAQ:${upper}`;
    card.onclick = () => selectTicker(card);

    // Build arrows HTML
    let arrowsHtml = '';
    TIMEFRAMES.forEach(tf => {
        arrowsHtml += `<span class="arrow-box" data-tf="${tf}" onclick="onArrowClick(event,'${upper}','${tf}')">
            <span class="arrow" id="arrow-${upper}-${tf}">-</span>
            <span class="tf-label">${tf}</span>
        </span>`;
    });

    card.innerHTML = `
        <div class="ticker-header">
            <span class="notif-dot" id="notif-${upper}"></span>
            <span class="ticker-symbol">${upper}</span>
            <span class="ticker-price" id="price-${upper}">--</span>
        </div>
        <div class="arrows-row">${arrowsHtml}</div>
    `;

    watchlist.insertBefore(card, addBtn);
    showToast(`Added ${upper}`, 'success');
}

// ========== ARROWS (c, e) ==========
function onArrowClick(event, symbol, tf) {
    event.stopPropagation();

    const arrow = document.getElementById(`arrow-${symbol}-${tf}`);
    if (arrow) arrow.classList.remove('blink');

    // If this is the current symbol, update that chart's TF
    if (state.symbol === symbol) {
        // Find an available chart slot and change its TF
        const tfMap = { '1': '1', '5': '5', '15': '15', '4h': '240', '8h': '480', 'D': 'D', 'W': 'W' };
        const chartTf = tfMap[tf] || tf;

        // Update chart 1's timeframe
        document.getElementById('tf1').value = chartTf;
        changeChartTf(1);

        showToast(`${symbol} ${tf} loaded`, 'info');
    } else {
        // Switch to this ticker
        const card = document.querySelector(`.ticker-card[data-symbol="${symbol}"]`);
        if (card) selectTicker(card);
    }
}

function setArrow(symbol, tf, direction, blink = false) {
    const arrow = document.getElementById(`arrow-${symbol}-${tf}`);
    if (!arrow) return;

    arrow.classList.remove('up', 'down', 'neutral', 'blink');

    if (direction === 'up') {
        arrow.textContent = '↑';
        arrow.classList.add('up');
    } else if (direction === 'down') {
        arrow.textContent = '↓';
        arrow.classList.add('down');
    } else {
        arrow.textContent = '-';
        arrow.classList.add('neutral');
    }

    if (blink) arrow.classList.add('blink');
}

// ========== NOTIFICATION DOT (d) ==========
function showNotifDot(symbol) {
    const dot = document.getElementById(`notif-${symbol}`);
    if (dot) dot.classList.add('active');
}

// ========== CHARTS (f, g) ==========
function loadAllCharts() {
    loadChart(1, state.chartTf[1]);
    loadChart(2, state.chartTf[2]);
    loadChart(3, state.chartTf[3]);
}

function loadChart(num, interval) {
    const container = document.getElementById(`chart${num}`);
    if (!container) return;

    container.innerHTML = '';
    state.chartTf[num] = interval;

    try {
        state.widgets[`chart${num}`] = new TradingView.widget({
            autosize: true,
            symbol: state.tvSymbol,
            interval: interval,
            timezone: 'America/New_York',
            theme: 'dark',
            style: '1',
            locale: 'en',
            toolbar_bg: '#111820',
            enable_publishing: false,

            // ENABLE NATIVE CONTROLS (Task D)
            hide_side_toolbar: false,      // Show drawing tools
            hide_top_toolbar: false,       // Show timeframe/interval selector
            allow_symbol_change: true,     // Allow symbol changes from chart

            // Reduce top margin for compact layout
            overrides: {
                "paneProperties.topMargin": 3,
                "paneProperties.bottomMargin": 3
            },

            container_id: `chart${num}`,
            backgroundColor: '#0a0e13'
        });
    } catch (e) {
        console.warn('Chart error:', e);
        container.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#6b7280;">${interval}</div>`;
    }
}

function changeChartTf(num) {
    const select = document.getElementById(`tf${num}`);
    if (!select) return;

    const interval = select.value;
    loadChart(num, interval);
}

// ========== RESIZE HANDLES (h) ==========
function setupResizeHandles() {
    const handle1 = document.getElementById('resize1');
    const handle2 = document.getElementById('resize2');

    if (handle1) setupResize(handle1, 'pane1', 'pane2');
    if (handle2) setupResize(handle2, 'pane2', 'pane3');
}

function setupResize(handle, leftPaneId, rightPaneId) {
    let isResizing = false;
    let startX = 0;
    let startLeftWidth = 0;
    let startRightWidth = 0;

    handle.addEventListener('mousedown', (e) => {
        isResizing = true;
        handle.classList.add('active');
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';

        const leftPane = document.getElementById(leftPaneId);
        const rightPane = document.getElementById(rightPaneId);

        startX = e.clientX;
        startLeftWidth = leftPane.offsetWidth;
        startRightWidth = rightPane.offsetWidth;

        e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
        if (!isResizing) return;

        const leftPane = document.getElementById(leftPaneId);
        const rightPane = document.getElementById(rightPaneId);

        if (!leftPane || !rightPane) return;

        const delta = e.clientX - startX;
        const minWidth = 100;

        let newLeftWidth = startLeftWidth + delta;
        let newRightWidth = startRightWidth - delta;

        // Enforce minimum widths
        if (newLeftWidth < minWidth) {
            newLeftWidth = minWidth;
            newRightWidth = startLeftWidth + startRightWidth - minWidth;
        }
        if (newRightWidth < minWidth) {
            newRightWidth = minWidth;
            newLeftWidth = startLeftWidth + startRightWidth - minWidth;
        }

        leftPane.style.flex = `0 0 ${newLeftWidth}px`;
        rightPane.style.flex = `0 0 ${newRightWidth}px`;
    });

    document.addEventListener('mouseup', () => {
        if (isResizing) {
            isResizing = false;
            handle.classList.remove('active');
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        }
    });
}

// ========== COLLAPSIBLE SIDEBARS (i) ==========
function toggleSidebar(side) {
    const sidebar = document.getElementById(`${side}Sidebar`);
    const collapsed = document.getElementById(`${side}Collapsed`);

    if (sidebar.classList.contains('collapsed')) {
        sidebar.classList.remove('collapsed');
        collapsed.classList.add('hidden');
    } else {
        sidebar.classList.add('collapsed');
        collapsed.classList.remove('hidden');
    }
}

function togglePin(side) {
    const pinBtn = document.getElementById(`pin${side.charAt(0).toUpperCase() + side.slice(1)}`);
    state.pinned[side] = !state.pinned[side];

    if (state.pinned[side]) {
        pinBtn.classList.add('pinned');
    } else {
        pinBtn.classList.remove('pinned');
    }

    showToast(`${side} sidebar ${state.pinned[side] ? 'pinned' : 'unpinned'}`, 'info');
}

// ========== SIGNAL STREAMING (a) ==========
function addSignal(symbol, tf, direction) {
    const price = document.getElementById(`price-${symbol}`)?.textContent || '--';
    const signal = {
        symbol,
        tf,
        direction,
        price,
        time: Date.now()
    };

    state.signalQueue.push(signal);

    // Show notification dot
    showNotifDot(symbol);

    // Update arrow with blink
    setArrow(symbol, tf, direction, true);

    // Update signal bar
    updateSignalBar(signal);
}

function updateSignalBar(signal) {
    const track = document.getElementById('signalTrack');
    if (!track) return;

    // Create new signal chip
    const chip = document.createElement('div');
    chip.className = 'signal-chip';
    chip.dataset.key = `${signal.symbol}-${signal.tf}`;

    const arrow = signal.direction === 'up' ? '↑' : '↓';
    const arrowClass = signal.direction === 'up' ? 'up' : 'down';

    chip.innerHTML = `
        <span class="tf">${signal.tf}</span>
        <span class="arrow ${arrowClass}">${arrow}</span>
        <span class="symbol">${signal.symbol}</span>
        <span class="price">${signal.price}</span>
    `;

    // Prepend to track (new signals appear on left)
    track.prepend(chip);

    // Remove any duplicate signals for same symbol+tf
    const allChips = track.querySelectorAll('.signal-chip');
    const seen = new Set();
    allChips.forEach(c => {
        const key = c.dataset.key;
        if (seen.has(key)) {
            c.remove();
        } else {
            seen.add(key);
        }
    });

    // Keep max 15 signals in marquee (remove from right/end)
    // Use live children collection to avoid infinite loop
    while (track.children.length > 15) {
        track.lastElementChild.remove();
    }

    // Don't restart animation - let it continue smoothly
}

function startSignalSimulation() {
    const symbols = ['TSLA', 'NVDA', 'AAPL', 'SPY'];

    // Add some initial signals
    const initSignals = [
        { symbol: 'NVDA', tf: '15m', dir: 'up' },
        { symbol: 'TSLA', tf: '5m', dir: 'down' },
        { symbol: 'SPY', tf: '1m', dir: 'up' },
        { symbol: 'AAPL', tf: 'D', dir: 'up' },
        { symbol: 'NVDA', tf: '4h', dir: 'up' },
    ];

    initSignals.forEach((s, i) => {
        setTimeout(() => addSignal(s.symbol, s.tf, s.dir), i * 200);
    });

    // Continue generating signals
    setInterval(() => {
        symbols.forEach(sym => {
            TIMEFRAMES.forEach(tf => {
                if (Math.random() > 0.97) {
                    const dir = Math.random() > 0.5 ? 'up' : 'down';
                    addSignal(sym, tf, dir);
                }
            });
        });
    }, 3000);
}

// ========== EXECUTION ==========
function setOrderType(type) {
    state.orderType = type;
    document.getElementById('btnMkt').classList.toggle('active', type === 'MKT');
    document.getElementById('btnLmt').classList.toggle('active', type === 'LMT');
    document.getElementById('limitRow').classList.toggle('hidden', type === 'MKT');
}

function calcSize() {
    const risk = parseFloat(document.getElementById('riskAmt').value) || 0;
    const stop = parseFloat(document.getElementById('stopLoss').value) || 0;
    const price = state.price;

    let qty = 0;
    if (price > 0 && stop > 0 && stop !== price) {
        const diff = Math.abs(price - stop);
        qty = Math.floor(risk / diff);
    }

    document.getElementById('calcQty').textContent = `${qty} Shares`;

    const canTrade = qty > 0 && state.armed;
    document.getElementById('btnBuy').disabled = !canTrade;
    document.getElementById('btnSell').disabled = !canTrade;
}

function toggleArm() {
    state.armed = !state.armed;
    const btn = document.getElementById('btnArm');
    btn.classList.toggle('armed', state.armed);
    btn.textContent = state.armed ? '🔴 DISARM' : '🟢 ARM';

    calcSize();
    showToast(state.armed ? 'System ARMED' : 'System DISARMED', state.armed ? 'success' : 'info');
}

function placeOrder(side) {
    if (!state.armed) return;
    const qty = parseInt(document.getElementById('calcQty').textContent);
    const chartNum = state.activeChartIndex + 1;
    showToast(`${side} ${qty} shares of ${state.symbol} on Chart ${chartNum}`, 'success');
}

function killSwitch() {
    state.armed = false;
    updateArmUI();
    showToast('KILL SWITCH activated!', 'error');
}

// ========== CHART SELECTION & ARM (Task E, F) ==========
function setupChartSelection() {
    const panes = document.querySelectorAll('.chart-pane');

    panes.forEach((pane, index) => {
        // Use capturing phase (true) to catch clicks before they reach iframes
        pane.addEventListener('mousedown', () => {
            selectChart(index);
        }, true);
    });

    // Set initial active chart
    selectChart(0);
}

function selectChart(index) {
    state.activeChartIndex = index;

    // Update visual indicators
    document.querySelectorAll('.chart-pane').forEach((pane, i) => {
        if (i === index) {
            pane.classList.add('selected-context'); // Always show selection
            if (state.armed) {
                pane.classList.add('active');
            } else {
                pane.classList.remove('active');
            }
        } else {
            pane.classList.remove('active', 'selected-context');
        }
    });

    console.log(`Chart ${index + 1} selected for ARM`);
}

function toggleArm() {
    state.armed = !state.armed;
    updateArmUI();

    if (state.armed) {
        showToast(`ARM activated on Chart ${state.activeChartIndex + 1}`, 'success');
    } else {
        showToast('ARM deactivated', 'info');
    }
}

function updateArmUI() {
    const btnArm = document.getElementById('btnArm');
    const btnBuy = document.getElementById('btnBuy');
    const btnSell = document.getElementById('btnSell');

    if (state.armed) {
        btnArm.classList.add('armed');
        btnArm.textContent = '🔴 ARMED';
        btnBuy.disabled = false;
        btnSell.disabled = false;

        // Highlight the active chart
        selectChart(state.activeChartIndex);
    } else {
        btnArm.classList.remove('armed');
        btnArm.textContent = '🟢 ARM';
        btnBuy.disabled = true;
        btnSell.disabled = true;

        // Remove all chart highlights
        document.querySelectorAll('.chart-pane').forEach(pane => {
            pane.classList.remove('active');
        });
    }
}


// ========== MOCK PRICES ==========
function startMockPrices() {
    let base = 150 + Math.random() * 20;

    setInterval(() => {
        base += (Math.random() - 0.5) * 0.5;
        state.price = base;

        document.getElementById('livePrice').textContent = `$${base.toFixed(2)}`;

        const priceEl = document.getElementById(`price-${state.symbol}`);
        if (priceEl) priceEl.textContent = base.toFixed(2);

        // Update on-chart price labels
        for (let i = 0; i < 3; i++) {
            const buyLabel = document.getElementById(`buyPrice${i}`);
            const sellLabel = document.getElementById(`sellPrice${i}`);
            if (buyLabel) buyLabel.textContent = `$${base.toFixed(2)}`;
            if (sellLabel) sellLabel.textContent = `$${base.toFixed(2)}`;
        }

        calcSize();
    }, 500);
}

// ========== ON-CHART CONTROLS ==========
function onChartBuy(chartIndex) {
    if (!state.armed) {
        showToast('ARM the system first!', 'error');
        return;
    }

    selectChart(chartIndex);
    placeOrder('BUY');
}

function onChartSell(chartIndex) {
    if (!state.armed) {
        showToast('ARM the system first!', 'error');
        return;
    }

    selectChart(chartIndex);
    placeOrder('SELL');
}

function toggleMaximize(chartIndex) {
    const pane = document.getElementById(`pane${chartIndex + 1}`);
    const isMaximized = pane.classList.contains('maximized');

    // Remove maximized from all panes first
    document.querySelectorAll('.chart-pane').forEach(p => {
        p.classList.remove('maximized');
    });

    // Toggle the clicked pane
    if (!isMaximized) {
        pane.classList.add('maximized');
        showToast(`Chart ${chartIndex + 1} maximized`, 'info');
    } else {
        showToast(`Chart ${chartIndex + 1} restored`, 'info');
    }
}


// ========== TOAST ==========
function showToast(msg, type = 'info') {
    const container = document.getElementById('toasts');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = msg;
    container.appendChild(toast);

    setTimeout(() => toast.remove(), 3000);
}
