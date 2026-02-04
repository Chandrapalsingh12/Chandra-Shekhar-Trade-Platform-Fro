/**
 * Time & Sales Tape + Bid/Ask Spread Widget
 */

const PulseTape = {
    maxTrades: 15,
    trades: [],
    
    init() {
        console.log('📜 Tape initialized');
    },
    
    updateQuote(bid, ask, bidSize, askSize) {
        document.getElementById('bidPrice').textContent = bid.toFixed(2);
        document.getElementById('askPrice').textContent = ask.toFixed(2);
        document.getElementById('bidSize').textContent = bidSize || '--';
        document.getElementById('askSize').textContent = askSize || '--';
        
        const spread = ((ask - bid) * 100).toFixed(1);
        document.getElementById('spreadValue').textContent = `${spread}¢`;
    },
    
    addTrade(data) {
        const trade = {
            price: data.price,
            size: data.size || Math.floor(Math.random() * 100) + 1,
            time: data.time || new Date().toLocaleTimeString(),
            side: data.price >= (data.ask || data.price) ? 'buy' : 'sell'
        };
        
        this.trades.unshift(trade);
        if (this.trades.length > this.maxTrades) {
            this.trades.pop();
        }
        
        this.renderTape();
    },
    
    renderTape() {
        const container = document.getElementById('tapeContainer');
        
        container.innerHTML = this.trades.map(t => `
            <div class="tape-row ${t.side}">
                <span class="tape-price">${t.price.toFixed(2)}</span>
                <span class="tape-size">${t.size}</span>
                <span class="tape-time">${t.time}</span>
            </div>
        `).join('');
    }
};