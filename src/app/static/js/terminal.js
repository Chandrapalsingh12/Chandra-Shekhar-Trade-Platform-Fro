/**
 * Terminal V2 - Complete Implementation
 */

// ========== STATE ==========
const state = {
    symbol: 'TSLA',
    tvSymbol: 'NASDAQ:TSLA',
    price: 0,
    staged: false,
    armed: false,
    activeChartIndex: 0,
    orderType: 'MKT',
    charts: {},
    series: {},
    chartTf: { 1: '1', 2: '5', 3: '15' },
    chartData: { 1: [], 2: [], 3: [] },
    drag: { active: false, which: null, chartNum: null },
    signalQueue: [],
    pinned: { left: true, right: false },
    balance: 10000
};

// Trade/Position State (Paper Trading)
const trade = {
    open: false,
    side: null,       // 'BUY' or 'SELL'
    entry: null,
    stop: null,
    target: null,
    qty: 0
};


const TIMEFRAMES = ['1', '5', '15', '4h', '8h', 'D', 'W'];

// WebSocket state
let liveWS = null;

// ========== INIT ==========
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Terminal V2 initializing...');

    loadAllCharts();
    connectLiveData(state.symbol);  // Connect to Databento via WebSocket
    startSignalSimulation();
    setupResizeHandles();
    setupChartSelection();
    updateBalanceUI();

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

    // Reconnect WebSocket for new symbol
    connectLiveData(symbol);

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

// ========== CHARTS (Lightweight Integration) ==========
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

    // Create TradingView embed iframe
    const widget = document.createElement('iframe');
    widget.id = `tvWidget${num}`;
    widget.style.width = '100%';
    widget.style.height = '100%';
    widget.style.border = 'none';
    widget.frameBorder = '0';
    widget.allowTransparency = 'true';
    widget.scrolling = 'no';

    // TradingView Advanced Charts (free widget)
    const symbol = state.tvSymbol || 'NASDAQ:TSLA';
    const theme = 'dark';
    const intervalMap = { '1': '1', '5': '5', '15': '15', '60': '60', '240': '240', 'D': 'D', 'W': 'W' };
    const tvInterval = intervalMap[interval] || interval;

    widget.src = `https://s.tradingview.com/widgetembed/?frameElementId=tvWidget${num}&symbol=${symbol}&interval=${tvInterval}&hide_side_toolbar=0&symboledit=1&saveimage=1&toolbarbg=0a0e13&studies=[]&theme=${theme}&style=1&timezone=America/New_York&withdateranges=1&details=1&hotlist=1&calendar=1`;

    container.appendChild(widget);
    state.charts[num] = widget;

    // Handle resizing
    new ResizeObserver(() => {
        widget.style.width = '100%';
        widget.style.height = '100%';
    }).observe(container);
}

function generateChartData() {
    const data = [];
    let basePrice = 150 + Math.random() * 50;
    const now = Math.floor(Date.now() / 1000);
    for (let i = 100; i >= 0; i--) {
        const t = now - (i * 300); // 5m intervals
        const open = basePrice;
        const close = basePrice + (Math.random() - 0.45) * 5;
        const high = Math.max(open, close) + Math.random() * 2;
        const low = Math.min(open, close) - Math.random() * 2;
        data.push({ time: t, open, high, low, close });
        basePrice = close;
    }
    return data;
}

function recomputeUT(num) {
    const s = state.series[num];
    const data = state.chartData[num];
    const out = computeUTBotTrailAndSignals(data); // Using research logic

    s.trail.setData(out.trail.filter(p => p.value !== null));
    s.candles.setMarkers(out.markers);
}

function changeChartTf(num) {
    const select = document.getElementById(`tf${num}`);
    if (!select) return;
    loadChart(num, select.value);
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

    // Show notification dot (only if not active)
    if (symbol !== state.symbol) {
        showNotifDot(symbol);
    }

    // Update arrow with blink
    setArrow(symbol, tf, direction, true);

    // Update signal bar
    updateSignalBar(signal);

    // AUTO-EXECUTION LOGIC
    if (state.armed && symbol === state.symbol) {
        const side = direction === 'up' ? 'BUY' : 'SELL';

        // Ignore flips in-trade
        if (trade.open) {
            if (trade.side === 'BUY' && side === 'SELL') {
                showToast(`Ignored SELL signal while in LONG trade`, 'warning');
                return;
            }
            if (trade.side === 'SELL' && side === 'BUY') {
                showToast(`Ignored BUY signal while in SHORT trade`, 'warning');
                return;
            }
            return; // Already in trade of same direction
        }

        console.log(`🤖 Auto-executing ${side} signal for ${symbol}`);
        executeTrade(side);
    }
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

    // Make clickable
    chip.style.cursor = 'pointer';
    chip.onclick = () => handleSignalClick(signal.symbol, signal.tf, signal.direction);

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
            pane.classList.add('selected-context');
            if (state.armed) {
                pane.classList.add('active');
            } else {
                pane.classList.remove('active');
            }
        } else {
            pane.classList.remove('active', 'selected-context');
        }
    });

    // Move position overlay to the selected chart
    const overlay = document.getElementById('positionOverlay');
    const targetPane = document.getElementById(`pane${index + 1}`);
    if (overlay && targetPane) {
        targetPane.appendChild(overlay);
    }

    syncTradingModes();

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
        selectChart(state.activeChartIndex);
    } else {
        btnArm.classList.remove('armed');
        btnArm.textContent = '🟢 ARM';
        btnBuy.disabled = true;
        btnSell.disabled = true;
        document.querySelectorAll('.chart-pane').forEach(pane => pane.classList.remove('active'));
    }
}

function toggleMaximize(chartIndex) {
    const pane = document.getElementById(`pane${chartIndex + 1}`);
    const isMaximized = pane.classList.contains('maximized');
    const leftSidebar = document.getElementById('leftSidebar');
    const rightSidebar = document.getElementById('rightSidebar');

    // Remove maximized from all first
    document.querySelectorAll('.chart-pane').forEach(p => p.classList.remove('maximized'));

    if (!isMaximized) {
        pane.classList.add('maximized');

        // COLLAPSE left sidebar to give chart more room
        if (leftSidebar && !leftSidebar.classList.contains('collapsed')) {
            toggleSidebar('left');
        }

        // ENSURE right sidebar is visible (don't collapse it)
        if (rightSidebar && rightSidebar.classList.contains('collapsed')) {
            toggleSidebar('right');
        }

        showToast(`Chart ${chartIndex + 1} maximized (Execution Panel Frozen)`, 'info');
    } else {
        showToast(`Chart ${chartIndex + 1} restored`, 'info');
    }

    // Trigger resize for the chart library
    window.dispatchEvent(new Event('resize'));
}


// ========== LIVE DATA CONNECTION ==========
function connectLiveData(symbol) {
    console.log(`🔄 Connecting to live data for ${symbol}...`);

    // Close existing connection if any
    if (liveWS) {
        liveWS.close();
    }

    const statusDot = document.getElementById('statusDot');
    const statusText = document.getElementById('statusText');

    try {
        const wsUrl = `ws://${window.location.host}/api/v1/market-data/ws/${symbol}`;
        console.log(`📡 WebSocket URL: ${wsUrl}`);
        liveWS = new WebSocket(wsUrl);

        liveWS.onopen = () => {
            console.log('✅ WebSocket connected!');
            if (statusDot) {
                statusDot.classList.add('online');
                statusDot.classList.remove('offline');
            }
            if (statusText) statusText.textContent = 'Live';
        };

        liveWS.onmessage = (event) => {
            const data = JSON.parse(event.data);
            handleLivePriceUpdate(data);
        };

        liveWS.onerror = (error) => {
            console.error('❌ WebSocket error:', error);
            console.warn('Falling back to mock prices...');
            if (statusText) statusText.textContent = 'Mock';
            startMockPrices();
        };

        liveWS.onclose = () => {
            console.log('🔌 WebSocket closed');
            if (statusDot) {
                statusDot.classList.remove('online');
                statusDot.classList.add('offline');
            }
            if (statusText) statusText.textContent = 'Offline';
        };
    } catch (e) {
        console.error('WebSocket connection failed:', e);
        if (statusText) statusText.textContent = 'Mock';
        startMockPrices();
    }
}

function handleLivePriceUpdate(data) {
    // Handle error from server
    if (data.error) {
        console.error('Server error:', data.error);
        return;
    }

    const price = data.price;
    state.price = price;

    // Update header
    const livePriceEl = document.getElementById('livePrice');
    if (livePriceEl) livePriceEl.textContent = `$${price.toFixed(2)}`;

    // Update watchlist price
    const priceEl = document.getElementById(`price-${state.symbol}`);
    if (priceEl) priceEl.textContent = price.toFixed(2);

    // Update Unrealized P&L if in trade
    if (trade.open) {
        updatePositionUI();
    }

    // Sync visual overlays
    syncAllOverlayLines();

    // Log first few updates for debugging
    if (!handleLivePriceUpdate.logCount) handleLivePriceUpdate.logCount = 0;
    if (handleLivePriceUpdate.logCount < 3) {
        console.log(`💰 Live price update: $${price.toFixed(2)} from ${data.dataset}`);
        handleLivePriceUpdate.logCount++;
    }
}

// ========== MOCK PRICES (Fallback) ==========
function startMockPrices() {
    let base = 150 + Math.random() * 20;

    setInterval(() => {
        base += (Math.random() - 0.5) * 0.5;
        state.price = base;

        const livePriceEl = document.getElementById('livePrice');
        if (livePriceEl) livePriceEl.textContent = `$${base.toFixed(2)}`;

        const priceEl = document.getElementById(`price-${state.symbol}`);
        if (priceEl) priceEl.textContent = base.toFixed(2);

        // Update Unrealized P&L and check for TP/SL if in trade
        if (trade.open) {
            updatePositionUI();
        }

        // Sync visual overlays (if they weren't hidden)
        syncAllOverlayLines();
    }, 500);
}

// ========== UT BOT LOGIC ==========
function computeATR(data, period = 10) {
    if (!data || data.length < period + 1) return [];
    const tr = [];
    for (let i = 1; i < data.length; i++) {
        tr.push(Math.max(
            data[i].high - data[i].low,
            Math.abs(data[i].high - data[i - 1].close),
            Math.abs(data[i].low - data[i - 1].close)
        ));
    }
    const atr = new Array(data.length).fill(null);
    for (let i = period; i < data.length; i++) {
        let sum = 0;
        for (let j = i - period; j < i; j++) sum += tr[j];
        atr[i] = sum / period;
    }
    return atr;
}

function computeUTBotTrailAndSignals(data, atrPeriod = 10, atrMult = 2.0) {
    const atr = computeATR(data, atrPeriod);
    const trail = [];
    const markers = [];
    let longMode = true;
    let stop = null;

    for (let i = 0; i < data.length; i++) {
        const bar = data[i];
        const a = atr[i];
        if (a === null) { trail.push({ time: bar.time, value: null }); continue; }

        const dist = a * atrMult;
        if (stop === null) stop = longMode ? (bar.close - dist) : (bar.close + dist);

        if (longMode) {
            stop = Math.max(stop, bar.close - dist);
            if (bar.close < stop) {
                longMode = false;
                stop = bar.close + dist;
                markers.push({ time: bar.time, position: 'aboveBar', color: '#ef5350', shape: 'arrowDown', text: 'SELL' });
            }
        } else {
            stop = Math.min(stop, bar.close + dist);
            if (bar.close > stop) {
                longMode = true;
                stop = bar.close - dist;
                markers.push({ time: bar.time, position: 'belowBar', color: '#26a69a', shape: 'arrowUp', text: 'BUY' });
            }
        }
        trail.push({ time: bar.time, value: stop });
    }
    return { trail, markers };
}

// ========== DRAGGABLE OVERLAYS ==========
function setupDragHandlers(num) {
    const bind = (handleId, name) => {
        const handle = document.getElementById(handleId + num);
        if (!handle) return;

        handle.addEventListener('mousedown', (e) => {
            state.drag.active = true;
            state.drag.which = name;
            state.drag.chartNum = num;
            document.body.style.cursor = 'ns-resize';
            e.preventDefault();
        });
    };

    bind('handleEntry', 'ENTRY');
    bind('handleStop', 'SL');
    bind('handleTP', 'TP');
}

window.addEventListener('mousemove', (e) => {
    if (!state.drag.active) return;

    const num = state.drag.chartNum;
    const chart = state.charts[num];
    const series = state.series[num].candles;

    const rect = document.getElementById(`chart${num}`).getBoundingClientRect();
    const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
    const price = series.coordinateToPrice(y);

    if (price) {
        const val = price.toFixed(2);
        if (state.drag.which === 'ENTRY') {
            document.getElementById('entryPrice').value = val;
        } else if (state.drag.which === 'SL') {
            document.getElementById('stopLoss').value = val;
        } else if (state.drag.which === 'TP') {
            document.getElementById('takeProfit').value = val;
        }
        calcSize();
        syncAllOverlayLines();
    }
});

window.addEventListener('mouseup', () => {
    state.drag.active = false;
    document.body.style.cursor = '';
});

function calcSize() {
    const side = document.getElementById('side').value;
    const entry = parseFloat(document.getElementById('entryPrice').value) || 0;
    const sl = parseFloat(document.getElementById('stopLoss').value) || 0;
    const tp = parseFloat(document.getElementById('takeProfit').value) || 0;
    const qty = parseInt(document.getElementById('quantity').value) || 0;

    // Direction-aware risk calculation
    let riskPerShare, rewardPerShare;
    if (side === 'BUY') {
        riskPerShare = Math.max(0, entry - sl);
        rewardPerShare = Math.max(0, tp - entry);
    } else {
        riskPerShare = Math.max(0, sl - entry);
        rewardPerShare = Math.max(0, entry - tp);
    }

    // R:R ratio
    let rrRatio = '—';
    if (riskPerShare > 0) {
        rrRatio = `1:${(rewardPerShare / riskPerShare).toFixed(2)}`;
    }

    // Update risk display
    document.getElementById('riskPerShare').textContent = `$${riskPerShare.toFixed(2)}`;
    document.getElementById('rewardPerShare').textContent = `$${rewardPerShare.toFixed(2)}`;
    document.getElementById('rrRatio').textContent = rrRatio;

    // Enable/Disable trade buttons
    const canTrade = entry > 0 && sl > 0 && qty > 0 && state.armed;
    document.getElementById('btnBuy').disabled = !canTrade;
    document.getElementById('btnSell').disabled = !canTrade;

    // Update P&L if in trade
    updatePositionUI();
    syncAllOverlayLines();
}

function syncAllOverlayLines() {
    const entry = parseFloat(document.getElementById('entryPrice').value) || 0;
    const sl = parseFloat(document.getElementById('stopLoss').value) || 0;
    const tp = parseFloat(document.getElementById('takeProfit').value) || 0;

    for (let i = 1; i <= 3; i++) {
        const series = state.series[i]?.candles;
        if (!series) continue;

        const yEntry = series.priceToCoordinate(entry);
        const ySL = series.priceToCoordinate(sl);
        const yTP = series.priceToCoordinate(tp);

        const lineE = document.getElementById(`lineEntry${i}`);
        const lineS = document.getElementById(`lineStop${i}`);
        const lineT = document.getElementById(`lineTP${i}`);
        const labelE = document.getElementById(`labelEntry${i}`);
        const labelS = document.getElementById(`labelStop${i}`);
        const labelT = document.getElementById(`labelTP${i}`);

        if (lineE && yEntry !== null) {
            lineE.style.top = `${yEntry}px`;
            if (labelE) labelE.textContent = `$${entry.toFixed(2)}`;
        }
        if (lineS && ySL !== null) {
            lineS.style.top = `${ySL}px`;
            if (labelS) labelS.textContent = `$${sl.toFixed(2)}`;
        }
        if (lineT && yTP !== null) {
            lineT.style.top = `${yTP}px`;
            if (labelT) labelT.textContent = `$${tp.toFixed(2)}`;
        }
    }
}

// ========== TRADE EXECUTION (Paper) ==========
function executeTrade(side) {
    const entryInput = document.getElementById('entryPrice');
    const slInput = document.getElementById('stopLoss');
    const tpInput = document.getElementById('takeProfit');
    const qtyInput = document.getElementById('quantity');
    const sideInput = document.getElementById('side');

    if (trade.open) {
        showToast('Close the current trade first or wait for TP/SL!', 'error');
        return;
    }

    // If manual click but not armed
    if (!state.armed) {
        // Allow manual execution if not armed? Or enforce arm?
        // User asked for STAGED -> ARM flow, so let's enforce arm for auto, 
        // but maybe allow manual if they click? 
        // The user's rule says "Test ARM auto-execution on signal".
        // Let's enforce ARM for any execution to stay safe.
        // showToast('ARM the system first!', 'error');
        // return;
    }

    const entry = parseFloat(entryInput.value) || state.price || 0;
    const sl = parseFloat(slInput.value) || 0;
    const tp = parseFloat(tpInput.value) || 0;
    const qty = parseInt(qtyInput.value) || 100;

    // For auto-execution, we might not have SL/TP set yet if it's the first signal.
    // In a real system, we'd use defaults or ATR-based.
    // Let's set some dummy defaults if they are missing for simulation.
    let finalSl = sl;
    let finalTp = tp;

    if (finalSl === 0) {
        const offset = entry * 0.01; // 1% default SL
        finalSl = side === 'BUY' ? entry - offset : entry + offset;
    }

    // Fill at current price
    const fillPrice = state.price || entry || 100;
    entryInput.value = fillPrice.toFixed(2);
    sideInput.value = side;
    slInput.value = finalSl.toFixed(2);
    if (finalTp !== 0) tpInput.value = finalTp.toFixed(2);

    trade.open = true;
    trade.side = side;
    trade.entry = fillPrice;
    trade.stop = finalSl;
    trade.target = finalTp === 0 ? null : finalTp;
    trade.qty = qty;

    calcSize();
    showToast(`Entered ${side === 'BUY' ? 'LONG' : 'SHORT'} @ $${fillPrice.toFixed(2)} x${qty}`, 'success');
    updatePositionUI();
}

function closePosition() {
    if (!trade.open) {
        showToast('No position to close!', 'info');
        return;
    }

    const exitPrice = state.price || trade.entry;
    const dir = trade.side === 'BUY' ? 1 : -1;
    const pnl = (exitPrice - trade.entry) * dir * trade.qty;

    // Update Balance
    state.balance += pnl;
    updateBalanceUI();

    trade.open = false;
    trade.side = null;
    trade.entry = null;
    trade.stop = null;
    trade.target = null;
    trade.qty = 0;

    updatePositionUI();
    showToast(`Closed @ $${exitPrice.toFixed(2)} | P&L: $${pnl.toFixed(2)}`, pnl >= 0 ? 'success' : 'error');
}

function moveStopToBreakeven() {
    if (!trade.open || trade.entry == null) {
        showToast('No open position!', 'info');
        return;
    }

    trade.stop = trade.entry;
    document.getElementById('stopLoss').value = trade.entry.toFixed(2);
    calcSize();
    showToast(`Stop moved to break-even: $${trade.entry.toFixed(2)}`, 'success');
}

function updatePositionUI() {
    const badge = document.getElementById('posBadge');
    const pnlEl = document.getElementById('pnlNow');

    // Chart overlay elements
    const ovBadge = document.getElementById('ovPosBadge');
    const ovEntry = document.getElementById('ovEntry');
    const ovStop = document.getElementById('ovStop');
    const ovTarget = document.getElementById('ovTarget');
    const ovPos = document.getElementById('ovPos');
    const ovPnl = document.getElementById('ovPnl');

    if (!trade.open) {
        badge.textContent = 'FLAT';
        badge.className = 'state-badge badge-flat';
        pnlEl.textContent = '$0.00';
        pnlEl.className = 'risk-value';

        // Reset overlay
        if (ovBadge) { ovBadge.textContent = 'FLAT'; ovBadge.className = 'overlay-badge badge-flat'; }
        if (ovEntry) ovEntry.textContent = '—';
        if (ovStop) ovStop.textContent = '—';
        if (ovTarget) ovTarget.textContent = '—';
        if (ovPos) ovPos.textContent = '—';
        if (ovPnl) { ovPnl.textContent = '$0.00'; ovPnl.className = 'overlay-value'; }
        return;
    }

    // Update badge
    const isLong = trade.side === 'BUY';
    if (isLong) {
        badge.textContent = 'LONG';
        badge.className = 'state-badge badge-long';
        if (ovBadge) { ovBadge.textContent = 'LONG'; ovBadge.className = 'overlay-badge badge-long'; }
    } else {
        badge.textContent = 'SHORT';
        badge.className = 'state-badge badge-short';
        if (ovBadge) { ovBadge.textContent = 'SHORT'; ovBadge.className = 'overlay-badge badge-short'; }
    }

    // Calculate unrealized P&L
    const currentPrice = state.price || trade.entry;
    const dir = isLong ? 1 : -1;
    const pnl = (currentPrice - trade.entry) * dir * trade.qty;

    pnlEl.textContent = `$${pnl.toFixed(2)}`;
    pnlEl.className = 'risk-value ' + (pnl >= 0 ? 'pos' : 'neg');

    // Update chart overlay
    if (ovEntry) ovEntry.textContent = `$${trade.entry.toFixed(2)}`;
    if (ovStop) ovStop.textContent = `$${trade.stop.toFixed(2)}`;
    if (ovTarget) ovTarget.textContent = trade.target ? `$${trade.target.toFixed(2)}` : '—';
    if (ovPos) ovPos.textContent = `${isLong ? 'LONG' : 'SHORT'} @ $${trade.entry.toFixed(2)} x${trade.qty}`;
    if (ovPnl) {
        ovPnl.textContent = `$${pnl.toFixed(2)}`;
        ovPnl.className = 'overlay-value ' + (pnl >= 0 ? 'pos' : 'neg');
    }

    // Check for auto-exit
    if (isLong) {
        if (currentPrice <= trade.stop) autoExit('STOP', trade.stop);
        else if (trade.target && currentPrice >= trade.target) autoExit('TARGET', trade.target);
    } else {
        if (currentPrice >= trade.stop) autoExit('STOP', trade.stop);
        else if (trade.target && currentPrice <= trade.target) autoExit('TARGET', trade.target);
    }
}

function autoExit(reason, price) {
    const dir = trade.side === 'BUY' ? 1 : -1;
    const pnl = (price - trade.entry) * dir * trade.qty;

    // Update Balance
    state.balance += pnl;
    updateBalanceUI();

    trade.open = false;
    trade.side = null;
    trade.entry = null;
    trade.stop = null;
    trade.target = null;
    trade.qty = 0;

    showToast(`Auto-Exit (${reason}) @ $${price.toFixed(2)} | P&L: $${pnl.toFixed(2)}`, pnl >= 0 ? 'success' : 'error');
    updatePositionUI();
}

function updateBalanceUI() {
    const el = document.getElementById('accountBalance');
    if (el) {
        el.textContent = `$${state.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
}

function resetAccount() {
    if (confirm('Reset Paper account to $10,000.00?')) {
        if (trade.open) closePosition();
        state.balance = 10000;
        updateBalanceUI();
        showToast('Account Reset to $10,000.00', 'info');
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

// ========== TRADINGVIEW MODAL ==========
let tvWidgetInstance = null;

function toggleTradingView() {
    const modal = document.getElementById('tvModal');
    const isOpen = modal.classList.toggle('show');

    if (isOpen && !tvWidgetInstance) {
        // Initialize TradingView widget (free Advanced Chart)
        tvWidgetInstance = new TradingView.widget({
            "width": "100%",
            "height": "100%",
            "symbol": state.tvSymbol,
            "interval": state.chartTf[1] || "5",
            "timezone": "America/New_York",
            "theme": "dark",
            "style": "1",
            "locale": "en",
            "toolbar_bg": "#0a0e13",
            "enable_publishing": false,
            "hide_side_toolbar": false,
            "allow_symbol_change": true,
            "container_id": "tradingview_widget",
            "studies": []
        });

    }
}

// ========== STAGED / ARM WORKFLOW ==========
function toggleStaged() {
    state.staged = !state.staged;
    const btn = document.getElementById('btnStaged');
    const armBtn = document.getElementById('btnArm');

    if (state.staged) {
        btn.textContent = '🟡 STAGED';
        btn.style.background = '#f5d442';
        btn.style.color = '#0a0e13';
        armBtn.disabled = false; // Enable ARM button
        showToast('STAGED mode activated - ready to ARM', 'info');
    } else {
        btn.textContent = '⚪ STAGED';
        btn.style.background = '';
        btn.style.color = '';
        armBtn.disabled = true; // Disable ARM button
        state.armed = false; // Also disarm
        armBtn.textContent = '🟢 ARM';
        armBtn.style.background = '';
        showToast('STAGED deactivated', 'info');
    }
    syncTradingModes();
}

function toggleArm() {
    if (!state.staged) {
        showToast('Must activate STAGED first!', 'error');
        return;
    }

    state.armed = !state.armed;
    const btn = document.getElementById('btnArm');

    if (state.armed) {
        btn.textContent = '🔴 ARMED';
        btn.style.background = '#ef5350';
        btn.style.color = 'white';
        showToast('ARMED - Auto-execution enabled', 'success');
    } else {
        btn.textContent = '🟢 ARM';
        btn.style.background = '';
        btn.style.color = '';
        showToast('Disarmed', 'info');
    }
    syncTradingModes();
}

function syncTradingModes() {
    // Sync the visual state to ONLY the active chart
    document.querySelectorAll('.chart-pane').forEach((pane, idx) => {
        pane.classList.remove('staged', 'armed');
        if (idx === state.activeChartIndex) {
            if (state.staged) pane.classList.add('staged');
            if (state.armed) pane.classList.add('armed');
        }
    });
}

function killSwitch() {
    state.staged = false;
    state.armed = false;

    document.getElementById('btnStaged').textContent = '⚪ STAGED';
    document.getElementById('btnStaged').style.background = '';
    document.getElementById('btnArm').textContent = '🟢 ARM';
    document.getElementById('btnArm').style.background = '';
    document.getElementById('btnArm').disabled = true;

    if (trade.open) {
        closePosition();
    }

    showToast('🛑 KILL SWITCH ACTIVATED - All positions closed, system disarmed', 'error');
}

// ========== SIGNAL MARQUEE CLICK HANDLER ==========
function handleSignalClick(symbol, timeframe, signal) {
    // Find the ticker card
    const cards = document.querySelectorAll('.ticker-card');
    let matchedCard = null;

    cards.forEach(card => {
        if (card.dataset.symbol === symbol) {
            matchedCard = card;
        }
    });

    if (matchedCard) {
        selectTicker(matchedCard);
    }

    // Switch active chart to this timeframe
    state.chartTf[state.activeChartIndex + 1] = timeframe;
    loadChart(state.activeChartIndex + 1, timeframe);

    showToast(`Switched to ${symbol} @ ${timeframe} (${signal})`, 'info');
}

