/**
 * UI Utilities - Matrix Sidebar, Trend Dots with Blink, Notifications
 */

const PulseUI = {
    agentOpen: false,
    tradePanelOpen: false,

    // Trend data with blink state
    trendData: {},
    blinkingDots: new Set(),

    init() {
        console.log('📐 UI Utils initialized');

        // Initialize trend dots with neutral state
        this.initTrendDots();

        // Start simulated trend updates (with blinking)
        this.startTrendSimulation();
    },

    // ===== TREND DOTS (Matrix Heatmap) =====

    initTrendDots() {
        const symbols = ['TSLA', 'NVDA', 'AAPL', 'ES', 'SPY'];
        symbols.forEach(sym => {
            this.trendData[sym] = {
                '1': { trend: 'neutral', blink: false },
                '5': { trend: 'neutral', blink: false },
                '15': { trend: 'neutral', blink: false }
            };
        });
        this.updateAllTrendDots();
    },

    updateTrendDot(symbol, timeframe, trend, shouldBlink = false) {
        const dot = document.getElementById(`trend-${symbol}-${timeframe}`);
        if (!dot) return;

        dot.classList.remove('bullish', 'bearish', 'neutral', 'blink');
        dot.classList.add(trend);

        if (shouldBlink) {
            dot.classList.add('blink');
            this.blinkingDots.add(`${symbol}-${timeframe}`);
        }

        if (this.trendData[symbol]) {
            this.trendData[symbol][timeframe] = { trend, blink: shouldBlink };
        }
    },

    updateAllTrendDots() {
        Object.keys(this.trendData).forEach(symbol => {
            ['1', '5', '15'].forEach(tf => {
                const data = this.trendData[symbol][tf];
                this.updateTrendDot(symbol, tf, data.trend, data.blink);
            });
        });
    },

    // Called when user clicks a blinking dot - stops blink and refreshes chart
    onTrendDotClick(symbol, timeframe) {
        const dotKey = `${symbol}-${timeframe}`;
        const dot = document.getElementById(`trend-${symbol}-${timeframe}`);

        // Stop blinking
        if (dot) {
            dot.classList.remove('blink');
        }
        this.blinkingDots.delete(dotKey);

        if (this.trendData[symbol] && this.trendData[symbol][timeframe]) {
            this.trendData[symbol][timeframe].blink = false;
        }

        // If this is the active symbol, refresh that timeframe's chart
        if (PulseState.currentSymbol === symbol) {
            if (typeof PulseCharts !== 'undefined') {
                PulseCharts.loadChartByTimeframe(timeframe);
                this.showToast(`Refreshed ${symbol} ${timeframe}m chart`, 'info');
            }
        } else {
            // Switch to this symbol
            const ticker = document.querySelector(`.matrix-ticker[data-symbol="${symbol}"]`);
            if (ticker && typeof PulseCharts !== 'undefined') {
                PulseCharts.loadTicker(symbol, ticker.dataset.tv);

                // Update active state
                document.querySelectorAll('.matrix-ticker').forEach(b => b.classList.remove('active'));
                ticker.classList.add('active');

                this.showToast(`Switched to ${symbol}`, 'info');
            }
        }
    },

    // Simulate trend changes with blinking on new signals
    startTrendSimulation() {
        setInterval(() => {
            const symbols = ['TSLA', 'NVDA', 'AAPL', 'ES', 'SPY'];
            const trends = ['bullish', 'bearish', 'neutral'];

            symbols.forEach(sym => {
                ['1', '5', '15'].forEach(tf => {
                    // Random trend change for demo
                    if (Math.random() > 0.92) {
                        const newTrend = trends[Math.floor(Math.random() * trends.length)];
                        const currentData = this.trendData[sym]?.[tf];

                        // Only blink if trend changed from previous
                        if (currentData && currentData.trend !== newTrend) {
                            const shouldBlink = newTrend !== 'neutral';
                            this.updateTrendDot(sym, tf, newTrend, shouldBlink);

                            // Show notification for significant signals
                            if (shouldBlink && (newTrend === 'bullish' || newTrend === 'bearish')) {
                                this.updateNotification(`${sym} ${tf}m: ${newTrend.toUpperCase()} signal!`);
                            }
                        }
                    }
                });
            });
        }, 2000);
    },

    // ===== NOTIFICATION BAR =====

    updateNotification(message) {
        const notifText = document.getElementById('notifText');
        if (notifText) {
            notifText.textContent = message;

            // Flash effect
            const bar = document.getElementById('notificationBar');
            if (bar) {
                bar.style.background = 'linear-gradient(90deg, #00d4aa, #00b894)';
                setTimeout(() => {
                    bar.style.background = 'linear-gradient(90deg, var(--accent), #1e50d8)';
                }, 1000);
            }
        }
    },

    // ===== PROFIT GLOW =====

    setTickerGlow(symbol, pnl) {
        const ticker = document.querySelector(`.matrix-ticker[data-symbol="${symbol}"]`);
        if (!ticker) return;

        ticker.classList.remove('profit-glow', 'loss-glow');

        if (pnl > 0) {
            ticker.classList.add('profit-glow');
        } else if (pnl < 0) {
            ticker.classList.add('loss-glow');
        }
    },

    // ===== POSITION PANEL =====

    showPositionPanel() {
        const panel = document.getElementById('positionPanelFloat');
        if (panel) {
            panel.classList.remove('hidden');
        }
    },

    hidePositionPanel() {
        const panel = document.getElementById('positionPanelFloat');
        if (panel) {
            panel.classList.add('hidden');
        }
    },

    updatePositionDisplay(position) {
        const display = document.getElementById('positionDisplay');
        const actions = document.getElementById('positionActions');

        if (!display) return;

        if (!position) {
            display.innerHTML = '<div class="no-position">No active position</div>';
            if (actions) actions.classList.add('hidden');
            this.hidePositionPanel();
            return;
        }

        const pnl = position.unrealized_pnl || 0;
        const pnlClass = pnl >= 0 ? 'profit' : 'loss';
        const pnlSign = pnl >= 0 ? '+' : '';

        display.innerHTML = `
            <div class="position-info">
                <div class="position-row">
                    <span>Symbol</span>
                    <span>${position.symbol}</span>
                </div>
                <div class="position-row">
                    <span>Side</span>
                    <span>${position.side}</span>
                </div>
                <div class="position-row">
                    <span>Qty</span>
                    <span>${position.quantity}</span>
                </div>
                <div class="position-row">
                    <span>Entry</span>
                    <span>$${position.entry_price.toFixed(2)}</span>
                </div>
            </div>
            <div class="position-pnl ${pnlClass}">
                ${pnlSign}$${pnl.toFixed(2)}
            </div>
        `;

        if (actions) actions.classList.remove('hidden');
        this.showPositionPanel();

        // Update ticker glow
        this.setTickerGlow(position.symbol, pnl);
    },

    // ===== SIDEBAR ACCOUNT UPDATE =====

    updateSidebarAccount(balance, pnl) {
        const balanceEl = document.getElementById('sidebarBalance');
        const pnlEl = document.getElementById('sidebarPnL');

        if (balanceEl) {
            balanceEl.textContent = `$${balance.toFixed(2)}`;
        }

        if (pnlEl) {
            const sign = pnl >= 0 ? '+' : '';
            pnlEl.textContent = `P&L: ${sign}$${pnl.toFixed(2)}`;
            pnlEl.classList.remove('positive', 'negative');
            pnlEl.classList.add(pnl >= 0 ? 'positive' : 'negative');
        }
    },

    // ===== WATCHLIST =====

    addTicker() {
        const symbol = prompt('Enter ticker symbol (e.g., MSFT, AMD, GOOG):');
        if (!symbol) return;

        const watchlist = document.getElementById('watchlist');
        const addBtn = watchlist?.querySelector('.add-ticker');

        if (!watchlist || !addBtn) return;

        const upperSymbol = symbol.toUpperCase();

        const newTicker = document.createElement('div');
        newTicker.className = 'matrix-ticker';
        newTicker.dataset.symbol = upperSymbol;
        newTicker.dataset.tv = `NASDAQ:${upperSymbol}`;
        newTicker.innerHTML = `
            <div class="ticker-main">
                <span class="ticker-symbol" id="sym-${upperSymbol}">${upperSymbol}</span>
                <span class="ticker-price" id="price-${upperSymbol}">--</span>
            </div>
            <div class="trend-dots">
                <span class="trend-dot-labeled" data-symbol="${upperSymbol}" data-tf="1" onclick="PulseUI.onTrendDotClick('${upperSymbol}', '1')">
                    <span class="dot-label">1m</span>
                    <span class="trend-dot dot-1m neutral" id="trend-${upperSymbol}-1" title="1m Trend"></span>
                </span>
                <span class="trend-dot-labeled" data-symbol="${upperSymbol}" data-tf="5" onclick="PulseUI.onTrendDotClick('${upperSymbol}', '5')">
                    <span class="dot-label">5m</span>
                    <span class="trend-dot dot-5m neutral" id="trend-${upperSymbol}-5" title="5m Trend"></span>
                </span>
                <span class="trend-dot-labeled" data-symbol="${upperSymbol}" data-tf="15" onclick="PulseUI.onTrendDotClick('${upperSymbol}', '15')">
                    <span class="dot-label">15m</span>
                    <span class="trend-dot dot-15m neutral" id="trend-${upperSymbol}-15" title="15m Trend"></span>
                </span>
            </div>
        `;

        newTicker.addEventListener('click', (e) => {
            // Don't trigger if clicking on trend dot
            if (e.target.closest('.trend-dot-labeled')) return;

            if (typeof PulseCharts !== 'undefined') {
                PulseCharts.loadTicker(newTicker.dataset.symbol, newTicker.dataset.tv);
            }
            document.querySelectorAll('.matrix-ticker').forEach(b => b.classList.remove('active'));
            newTicker.classList.add('active');
        });

        watchlist.insertBefore(newTicker, addBtn);

        // Initialize trend data for new ticker
        this.trendData[upperSymbol] = {
            '1': { trend: 'neutral', blink: false },
            '5': { trend: 'neutral', blink: false },
            '15': { trend: 'neutral', blink: false }
        };

        this.showToast(`Added ${upperSymbol} to watchlist`, 'success');
    },

    // ===== TOAST NOTIFICATIONS =====

    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;

        container.appendChild(toast);

        // Auto-remove after 4 seconds
        setTimeout(() => {
            toast.classList.add('fade-out');
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    },

    // ===== UTILITIES =====

    formatCurrency(value) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(value);
    },

    formatNumber(value, decimals = 2) {
        return Number(value).toFixed(decimals);
    }
};