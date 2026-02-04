/**
 * Execution Module - Paper Trading Engine
 * Local simulator with persistent state
 */

const PulseExecution = {
    orderType: 'MKT',
    
    // Paper Trading Account
    account: {
        balance: 10000.00,
        startingBalance: 10000.00,
        dayPnL: 0,
        totalTrades: 0,
        winningTrades: 0,
        trades: []
    },
    
    init() {
        console.log('⚡ Paper Trading Engine initialized');
        this.loadAccount();
        this.renderAccountPanel();
        this.calculateSize();
    },
    
    // ===== ACCOUNT PERSISTENCE =====
    
    loadAccount() {
        const saved = localStorage.getItem('pulse_paper_account');
        if (saved) {
            try {
                this.account = JSON.parse(saved);
                console.log('📂 Loaded paper account:', this.account.balance);
            } catch (e) {
                console.warn('Could not load account, using default');
            }
        }
    },
    
    saveAccount() {
        localStorage.setItem('pulse_paper_account', JSON.stringify(this.account));
    },
    
    resetAccount() {
        if (!confirm('Reset paper account to $10,000? All trade history will be cleared.')) return;
        
        this.account = {
            balance: 10000.00,
            startingBalance: 10000.00,
            dayPnL: 0,
            totalTrades: 0,
            winningTrades: 0,
            trades: []
        };
        this.saveAccount();
        this.renderAccountPanel();
        
        // Clear any active position
        PulseState.activePosition = null;
        document.getElementById('positionDisplay').innerHTML = '<div class="no-position">No active position</div>';
        document.getElementById('positionActions').classList.add('hidden');
        
        this.showToast('🔄 Account reset to $10,000', 'info');
    },
    
    // ===== ACCOUNT PANEL =====
    
    renderAccountPanel() {
        const panel = document.getElementById('accountPanel');
        if (!panel) return;
        
        const pnl = this.account.balance - this.account.startingBalance;
        const pnlPct = ((pnl / this.account.startingBalance) * 100).toFixed(2);
        const winRate = this.account.totalTrades > 0 
            ? ((this.account.winningTrades / this.account.totalTrades) * 100).toFixed(0) 
            : 0;
        
        const isMinimized = panel.classList.contains('minimized');
        
        panel.innerHTML = `
            <div class="panel-header">
                <span class="panel-title">
                    Account
                    <span class="paper-badge">PAPER</span>
                </span>
                <button class="minimize-btn" onclick="PulseUI.togglePanel('accountPanel')">${isMinimized ? '+' : '−'}</button>
            </div>
            <div class="panel-body">
                <div class="account-stats">
                    <div class="account-row">
                        <span>Balance</span>
                        <span class="account-value">$${this.account.balance.toFixed(2)}</span>
                    </div>
                    <div class="account-row">
                        <span>P&L</span>
                        <span class="account-value ${pnl >= 0 ? 'profit' : 'loss'}">${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)}</span>
                    </div>
                    <div class="account-row">
                        <span>Trades</span>
                        <span class="account-value">${this.account.totalTrades} (${winRate}% W)</span>
                    </div>
                </div>
                <button class="btn btn-reset" onclick="PulseExecution.resetAccount()">Reset</button>
            </div>
        `;
    },
    
    // ===== ORDER TYPE =====
    
    setOrderType(type) {
        this.orderType = type;
        
        document.querySelectorAll('.order-type-toggle .toggle-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.type === type);
        });
        
        const limitRow = document.getElementById('limitPriceRow');
        if (limitRow) limitRow.classList.toggle('hidden', type !== 'LMT');
    },
    
    // ===== ARM/DISARM =====
    
    toggleArm() {
        PulseState.isArmed = !PulseState.isArmed;
        
        const armStatus = document.getElementById('armStatus');
        const armBtn = document.getElementById('armBtn');
        const armBtnText = document.getElementById('armBtnText');
        const btnBuy = document.getElementById('btnBuy');
        const btnSell = document.getElementById('btnSell');
        
        if (PulseState.isArmed) {
            armStatus.textContent = '⚡ ARMED';
            armStatus.classList.add('armed-tag');
            armBtn.classList.add('armed');
            armBtnText.textContent = '🔴 DISARM';
            btnBuy.disabled = false;
            btnSell.disabled = false;
            this.showToast('⚡ System ARMED - Ready to trade', 'warning');
        } else {
            armStatus.textContent = '⏸️ STAGED';
            armStatus.classList.remove('armed-tag');
            armBtn.classList.remove('armed');
            armBtnText.textContent = '🟢 ARM';
            btnBuy.disabled = true;
            btnSell.disabled = true;
            this.showToast('⏸️ System STAGED - Buttons disabled', 'info');
        }
    },
    
    // ===== POSITION SIZING =====
    
    calculateSize() {
        const riskEl = document.getElementById('riskAmt');
        const stopEl = document.getElementById('stopPrice');
        const tpEl = document.getElementById('tpPrice');
        
        if (!riskEl || !stopEl) return 0;
        
        const risk = parseFloat(riskEl.value) || 0;
        const stop = parseFloat(stopEl.value) || 0;
        const tp = parseFloat(tpEl?.value) || 0;
        const price = PulseState.currentPrice || 150;
        
        const calcQty = document.getElementById('calcQty');
        const totalRisk = document.getElementById('totalRisk');
        const rrRatio = document.getElementById('rrRatio');
        
        if (!calcQty) return 0;
        
        if (stop <= 0 || stop >= price) {
            calcQty.textContent = 'Invalid Stop';
            calcQty.style.color = '#f23645';
            if (totalRisk) totalRisk.textContent = '$0.00';
            if (rrRatio) rrRatio.textContent = '--';
            return 0;
        }
        
        const riskPerShare = price - stop;
        const shares = Math.floor(risk / riskPerShare);
        const actualRisk = shares * riskPerShare;
        const requiredCapital = shares * price;
        
        // Check buying power
        const hasCapital = requiredCapital <= this.account.balance;
        
        if (hasCapital) {
            calcQty.textContent = `${shares} Shares`;
            calcQty.style.color = shares > 0 ? '#2962ff' : '#f23645';
        } else {
            calcQty.textContent = `${shares} ⚠️ Low BP`;
            calcQty.style.color = '#f0b90b';
        }
        
        if (totalRisk) totalRisk.textContent = `$${actualRisk.toFixed(2)}`;
        
        if (rrRatio) {
            if (tp > price) {
                const reward = tp - price;
                const rr = (reward / riskPerShare).toFixed(1);
                rrRatio.textContent = `1:${rr}`;
                rrRatio.style.color = parseFloat(rr) >= 2 ? '#00b3a6' : '#f23645';
            } else {
                rrRatio.textContent = '--';
                rrRatio.style.color = '';
            }
        }
        
        return shares;
    },
    
    // ===== ORDER EXECUTION =====
    
    async placeOrder(side) {
        if (!PulseState.isArmed) {
            this.showToast('⚠️ System not armed!', 'warning');
            return;
        }
        
        // Check for existing position
        if (PulseState.activePosition) {
            this.showToast('⚠️ Already have an open position', 'warning');
            return;
        }
        
        const shares = this.calculateSize();
        if (!shares || shares <= 0) {
            this.showToast('❌ Invalid position size', 'error');
            return;
        }
        
        const stop = parseFloat(document.getElementById('stopPrice').value);
        const tp = parseFloat(document.getElementById('tpPrice').value) || null;
        const price = PulseState.currentPrice;
        const requiredCapital = shares * price;
        
        // Check buying power
        if (requiredCapital > this.account.balance) {
            this.showToast(`❌ Insufficient funds ($${requiredCapital.toFixed(2)} needed)`, 'error');
            return;
        }
        
        // Simulate fill with slippage
        const slippage = (Math.random() * 0.02);
        const fillPrice = side === 'BUY' ? price + slippage : price - slippage;
        
        // Deduct capital
        this.account.balance -= requiredCapital;
        this.saveAccount();
        this.renderAccountPanel();
        
        // Create position
        this.showPosition(side, shares, fillPrice, stop, tp);
        
        // Log to tape
        if (typeof PulseTape !== 'undefined') {
            PulseTape.addTrade({
                price: fillPrice,
                size: shares,
                time: new Date().toLocaleTimeString(),
                side: side === 'BUY' ? 'buy' : 'sell'
            });
        }
        
        this.showToast(`✅ ${side} ${shares} ${PulseState.currentSymbol} @ $${fillPrice.toFixed(2)}`, 'success');
        console.log(`📤 PAPER ORDER: ${side} ${shares} @ $${fillPrice.toFixed(2)}`);
    },
    
    // ===== POSITION DISPLAY =====
    
    showPosition(side, qty, entry, sl, tp) {
        PulseState.activePosition = { side, qty, entry, sl, tp, symbol: PulseState.currentSymbol };
        
        const display = document.getElementById('positionDisplay');
        const actions = document.getElementById('positionActions');
        
        if (display) {
            display.innerHTML = `
                <div class="position-card ${side === 'SELL' ? 'short' : ''}">
                    <div class="pos-header">
                        <span class="pos-symbol">${PulseState.currentSymbol} ${side === 'BUY' ? 'LONG' : 'SHORT'}</span>
                        <span class="pos-pnl" id="posPnl">$0.00</span>
                    </div>
                    <div class="pos-details" id="posDetails">
                        ${qty} @ $${entry.toFixed(2)} | SL: $${sl.toFixed(2)}
                    </div>
                </div>
            `;
        }
        
        if (actions) actions.classList.remove('hidden');
        this.updatePositionPnL();
    },
    
    updatePositionPnL() {
        if (!PulseState.activePosition) return;
        
        const pos = PulseState.activePosition;
        const price = PulseState.currentPrice;
        
        const pnl = pos.side === 'BUY'
            ? (price - pos.entry) * pos.qty
            : (pos.entry - price) * pos.qty;
        
        const pnlEl = document.getElementById('posPnl');
        if (pnlEl) {
            pnlEl.textContent = `${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)}`;
            pnlEl.className = `pos-pnl ${pnl >= 0 ? 'profit' : 'loss'}`;
        }
        
        // Check stop loss
        if (pos.side === 'BUY' && price <= pos.sl) {
            this.showToast('🛑 STOP LOSS HIT', 'error');
            this.closePosition('STOP');
        } else if (pos.side === 'SELL' && price >= pos.sl) {
            this.showToast('🛑 STOP LOSS HIT', 'error');
            this.closePosition('STOP');
        }
        
        // Check take profit
        if (pos.tp) {
            if (pos.side === 'BUY' && price >= pos.tp) {
                this.showToast('🎯 TAKE PROFIT HIT', 'success');
                this.closePosition('TP');
            } else if (pos.side === 'SELL' && price <= pos.tp) {
                this.showToast('🎯 TAKE PROFIT HIT', 'success');
                this.closePosition('TP');
            }
        }
    },
    
    // ===== POSITION MANAGEMENT =====
    
    moveToBE() {
        if (!PulseState.activePosition) {
            this.showToast('No position', 'warning');
            return;
        }
        
        const pos = PulseState.activePosition;
        pos.sl = pos.entry;
        
        const details = document.getElementById('posDetails');
        if (details) {
            details.innerHTML = `${pos.qty} @ $${pos.entry.toFixed(2)} | SL: $${pos.sl.toFixed(2)} <span class="be-tag">(BE)</span>`;
        }
        
        this.showToast(`✅ Stop moved to BE: $${pos.entry.toFixed(2)}`, 'success');
    },
    
    trailNow() {
        if (!PulseState.activePosition) {
            this.showToast('No position', 'warning');
            return;
        }
        
        const pos = PulseState.activePosition;
        const price = PulseState.currentPrice;
        
        if (pos.side === 'BUY') {
            const newStop = price - (price * 0.005); // Trail 0.5% below
            if (newStop > pos.sl) {
                pos.sl = newStop;
                this.showToast(`📈 Stop trailed to $${newStop.toFixed(2)}`, 'success');
            } else {
                this.showToast('Trail would lower stop - skipped', 'warning');
            }
        } else {
            const newStop = price + (price * 0.005);
            if (newStop < pos.sl) {
                pos.sl = newStop;
                this.showToast(`📉 Stop trailed to $${newStop.toFixed(2)}`, 'success');
            } else {
                this.showToast('Trail would raise stop - skipped', 'warning');
            }
        }
        
        const details = document.getElementById('posDetails');
        if (details) {
            details.innerHTML = `${pos.qty} @ $${pos.entry.toFixed(2)} | SL: $${pos.sl.toFixed(2)} <span class="trail-tag">(TRAIL)</span>`;
        }
    },
    
    closePartial(percent) {
        if (!PulseState.activePosition) {
            this.showToast('No position', 'warning');
            return;
        }
        
        const pos = PulseState.activePosition;
        const closeQty = Math.floor(pos.qty * (percent / 100));
        
        if (closeQty <= 0) {
            this.showToast('Position too small for partial', 'warning');
            return;
        }
        
        const exitPrice = PulseState.currentPrice;
        const pnl = pos.side === 'BUY'
            ? (exitPrice - pos.entry) * closeQty
            : (pos.entry - exitPrice) * closeQty;
        
        // Return capital + P&L
        this.account.balance += (closeQty * exitPrice);
        
        // Update position
        pos.qty -= closeQty;
        
        if (pos.qty <= 0) {
            this.recordTrade(pnl, 'PARTIAL_FULL');
            this.clearPosition();
        } else {
            this.showPosition(pos.side, pos.qty, pos.entry, pos.sl, pos.tp);
            this.showToast(`✅ Closed ${closeQty} for ${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)}`, pnl >= 0 ? 'success' : 'error');
        }
        
        this.saveAccount();
        this.renderAccountPanel();
    },
    
    closePosition(reason = 'MANUAL') {
        if (!PulseState.activePosition) return;
        
        const pos = PulseState.activePosition;
        const exitPrice = PulseState.currentPrice;
        
        const pnl = pos.side === 'BUY'
            ? (exitPrice - pos.entry) * pos.qty
            : (pos.entry - exitPrice) * pos.qty;
        
        // Return capital + P&L
        this.account.balance += (pos.qty * pos.entry) + pnl;
        
        this.recordTrade(pnl, reason);
        this.clearPosition();
        
        this.saveAccount();
        this.renderAccountPanel();
        
        this.showToast(`📊 Closed for ${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)} (${reason})`, pnl >= 0 ? 'success' : 'error');
    },
    
    recordTrade(pnl, reason) {
        this.account.totalTrades++;
        if (pnl > 0) this.account.winningTrades++;
        this.account.dayPnL += pnl;
        
        this.account.trades.push({
            symbol: PulseState.activePosition.symbol,
            side: PulseState.activePosition.side,
            qty: PulseState.activePosition.qty,
            entry: PulseState.activePosition.entry,
            exit: PulseState.currentPrice,
            pnl: pnl,
            reason: reason,
            time: new Date().toISOString()
        });
    },
    
    clearPosition() {
        PulseState.activePosition = null;
        
        const display = document.getElementById('positionDisplay');
        const actions = document.getElementById('positionActions');
        
        if (display) display.innerHTML = '<div class="no-position">No active position</div>';
        if (actions) actions.classList.add('hidden');
    },
    
    flatten() {
        if (!PulseState.activePosition) {
            this.showToast('No position to flatten', 'warning');
            return;
        }
        this.closePosition('FLATTEN');
    },
    
    async killSwitch() {
        if (!confirm('⚠️ KILL SWITCH: Flatten position immediately?')) return;
        
        console.log('🛑 KILL SWITCH ACTIVATED');
        if (PulseState.activePosition) {
            this.closePosition('KILL');
        }
        this.showToast('🛑 KILL SWITCH - Position flattened', 'warning');
    },
    
    // ===== TOAST NOTIFICATIONS =====
    
    showToast(message, type = 'info') {
        let container = document.getElementById('toastContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toastContainer';
            document.body.appendChild(container);
        }
        
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        
        container.appendChild(toast);
        
        // Animate in
        setTimeout(() => toast.classList.add('show'), 10);
        
        // Remove after 3s
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
};