/**
 * Chart Grid - Horizontal TradingView widgets (1m, 5m, 15m)
 * With resizable panes
 */

const PulseCharts = {
    widgets: {},

    // Fixed tri-pane layout: 1m | 5m | 15m (horizontal)
    chartConfig: {
        1: { interval: '1', container: 'tv_chart_1', paneId: 'chart-1m' },
        2: { interval: '5', container: 'tv_chart_2', paneId: 'chart-5m' },
        3: { interval: '15', container: 'tv_chart_3', paneId: 'chart-15m' }
    },

    // Resize state
    isResizing: false,
    currentResizer: null,
    startX: 0,

    init() {
        console.log('📊 Horizontal Chart Grid initialized');
        this.setupResizers();
    },

    // Setup resize handles
    setupResizers() {
        const resizers = document.querySelectorAll('.resize-handle');

        resizers.forEach(resizer => {
            resizer.addEventListener('mousedown', (e) => this.startResize(e, resizer));
        });

        document.addEventListener('mousemove', (e) => this.doResize(e));
        document.addEventListener('mouseup', () => this.stopResize());
    },

    startResize(e, resizer) {
        this.isResizing = true;
        this.currentResizer = resizer;
        this.startX = e.clientX;

        const leftPaneId = resizer.dataset.left;
        const rightPaneId = resizer.dataset.right;

        this.leftPane = document.getElementById(leftPaneId);
        this.rightPane = document.getElementById(rightPaneId);

        if (this.leftPane && this.rightPane) {
            this.leftStartWidth = this.leftPane.offsetWidth;
            this.rightStartWidth = this.rightPane.offsetWidth;
        }

        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
    },

    doResize(e) {
        if (!this.isResizing || !this.leftPane || !this.rightPane) return;

        const dx = e.clientX - this.startX;
        const newLeftWidth = this.leftStartWidth + dx;
        const newRightWidth = this.rightStartWidth - dx;

        // Minimum width constraint
        const minWidth = 150;

        if (newLeftWidth >= minWidth && newRightWidth >= minWidth) {
            this.leftPane.style.flex = 'none';
            this.rightPane.style.flex = 'none';
            this.leftPane.style.width = newLeftWidth + 'px';
            this.rightPane.style.width = newRightWidth + 'px';
        }
    },

    stopResize() {
        if (this.isResizing) {
            this.isResizing = false;
            this.currentResizer = null;
            document.body.style.cursor = '';
            document.body.style.userSelect = '';

            // Trigger chart resize
            this.resizeAllCharts();
        }
    },

    resizeAllCharts() {
        // TradingView widgets auto-resize, but we can force a redraw
        Object.values(this.widgets).forEach(widget => {
            if (widget && widget.iframe) {
                // Force iframe resize
                const iframe = widget.iframe;
                if (iframe) {
                    iframe.style.width = '100%';
                    iframe.style.height = '100%';
                }
            }
        });
    },

    // Load all 3 charts when ticker changes
    loadTicker(symbol, tvSymbol) {
        PulseState.currentSymbol = symbol;
        PulseState.currentTvSymbol = tvSymbol;

        // Update header
        const activeSymbol = document.getElementById('activeSymbol');
        if (activeSymbol) activeSymbol.textContent = symbol;

        // Load all 3 charts with fixed timeframes
        this.loadAllCharts();

        // Connect WebSocket
        if (typeof connectWebSocket === 'function') {
            connectWebSocket(symbol);
        }
    },

    loadAllCharts() {
        // Small delay to ensure containers are ready
        setTimeout(() => {
            this.loadChart(1, '1');   // 1m chart
            this.loadChart(2, '5');   // 5m chart
            this.loadChart(3, '15');  // 15m chart
        }, 100);
    },

    // Load/reload a specific chart by timeframe
    loadChartByTimeframe(timeframe) {
        const chartNum = { '1': 1, '5': 2, '15': 3 }[timeframe];
        if (chartNum) {
            this.loadChart(chartNum, timeframe);
        }
    },

    loadChart(chartNum, interval) {
        const config = this.chartConfig[chartNum];
        if (!config) return;

        const containerId = config.container;
        const container = document.getElementById(containerId);

        if (!container) {
            console.warn(`Chart container ${containerId} not found`);
            return;
        }

        // Clear existing widget
        container.innerHTML = '';

        // Destroy old widget if exists
        if (this.widgets[chartNum]) {
            delete this.widgets[chartNum];
        }

        // Create new TradingView widget with autosize
        try {
            this.widgets[chartNum] = new TradingView.widget({
                autosize: true,
                symbol: PulseState.currentTvSymbol || 'NASDAQ:TSLA',
                interval: interval,
                timezone: 'America/New_York',
                theme: 'dark',
                style: '1',
                locale: 'en',
                toolbar_bg: '#111820',
                enable_publishing: false,
                hide_side_toolbar: true,
                hide_top_toolbar: chartNum !== 3,  // Only show toolbar on 15m chart
                allow_symbol_change: false,
                container_id: containerId,
                studies: ['MAExp@tv-basicstudies'],
                backgroundColor: '#0a0e13',
                gridColor: '#1a222d'
            });
        } catch (e) {
            console.warn('TradingView widget error:', e);
            container.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#6b7280;font-size:14px;font-weight:600;">${interval}m Chart</div>`;
        }
    },

    // For backward compatibility
    setLayout(layout) {
        console.log('Horizontal tri-pane layout is fixed');
    },

    setTimeframe(chartNum, interval) {
        this.loadChart(chartNum, interval);
    },

    reloadCharts() {
        this.loadAllCharts();
    }
};