// EASY BOURSE - Logiciel de Suivi de Portefeuille & Intraday (app.js)

// Variables d'état global (accessible par rss-parser.js via window.state)
window.state = {
    portfolio: [],
    cashBalance: 2150.00,
    totalValue: 0,
    selectedTicker: null,
    isDemo: false
};

const STORAGE_KEY = 'easybourse_portfolio_state';
const QUOTE_CACHE_KEY = 'easybourse_quote_cache';
const THEME_STORAGE_KEY = 'easybourse_theme_preference';
const MARKET_REFRESH_INTERVAL_MS = 15000;
const MIN_REFRESH_FEEDBACK_MS = 600;

// Données de démonstration EasyBourse conformes aux spécifications exactes :
// AI.PA (Air Liquide) : 65 | 164.80 € | 172.30 € | +0.85% | +487.5 € (+4.55%) | 11 199.5 €
// Portefeuille calibré à 7 valeurs réparties sur les 4 secteurs de l'allocation
const demoPortfolio = [
    {
        name: "AIR LIQUIDE",
        ticker: "AI.PA",
        isin: "FR0000120073",
        quantity: 65,
        averagePrice: 164.80,
        currentPrice: 172.30,
        lastPrice: 172.30,
        dayChangePercent: 0.85,
        valuation: 11199.50,
        gainLoss: 487.50,
        gainLossPercent: 4.55,
        sector: "Énergie & Matériaux"
    },
    {
        name: "LVMH",
        ticker: "MC.PA",
        isin: "FR0000121014",
        quantity: 20,
        averagePrice: 650.00,
        currentPrice: 685.20,
        lastPrice: 685.20,
        dayChangePercent: 1.20,
        valuation: 13704.00,
        gainLoss: 704.00,
        gainLossPercent: 5.42,
        sector: "Consommation & Luxe"
    },
    {
        name: "SCHNEIDER ELECTRIC",
        ticker: "SU.PA",
        isin: "FR0000121972",
        quantity: 40,
        averagePrice: 215.00,
        currentPrice: 228.40,
        lastPrice: 228.40,
        dayChangePercent: 1.10,
        valuation: 9136.00,
        gainLoss: 536.00,
        gainLossPercent: 6.23,
        sector: "Technologie"
    },
    {
        name: "SAN",
        ticker: "SAN.PA",
        isin: "FR0000120578",
        quantity: 65,
        averagePrice: 94.00,
        currentPrice: 92.50,
        lastPrice: 92.50,
        dayChangePercent: -0.40,
        valuation: 6012.50,
        gainLoss: -97.50,
        gainLossPercent: -1.60,
        sector: "Santé"
    },
    {
        name: "L'ORÉAL",
        ticker: "OR.PA",
        isin: "FR0000120321",
        quantity: 14,
        averagePrice: 395.00,
        currentPrice: 412.50,
        lastPrice: 412.50,
        dayChangePercent: 0.50,
        valuation: 5775.00,
        gainLoss: 245.00,
        gainLossPercent: 4.43,
        sector: "Consommation & Luxe"
    },
    {
        name: "STMICROELECTRONICS",
        ticker: "STMPA.PA",
        isin: "NL0000226223",
        quantity: 140,
        averagePrice: 38.50,
        currentPrice: 36.20,
        lastPrice: 36.20,
        dayChangePercent: -1.35,
        valuation: 5068.00,
        gainLoss: -322.00,
        gainLossPercent: -5.97,
        sector: "Technologie"
    },
    {
        name: "TOTALENERGIES",
        ticker: "TTE.PA",
        isin: "FR0000120271",
        quantity: 35,
        averagePrice: 58.20,
        currentPrice: 61.40,
        lastPrice: 61.40,
        dayChangePercent: 0.65,
        valuation: 2149.00,
        gainLoss: 112.00,
        gainLossPercent: 5.50,
        sector: "Énergie & Matériaux"
    }
];

const demoCash = 2150.00;

// Indices boursiers en direct (Ticker Tape)
const INDICES = [
    { id: 'ticker-cac', symbol: '^FCHI', googleFinanceSymbol: 'PX1:INDEXEURO', name: 'CAC 40', defaultPrice: 7624.30, defaultChange: 0.42 },
    { id: 'ticker-sp500', symbol: '^GSPC', googleFinanceSymbol: '.INX:INDEXSP', name: 'S&P 500', defaultPrice: 7743.41, defaultChange: 0.51 },
    { id: 'ticker-dax', symbol: '^GDAXI', googleFinanceSymbol: 'DAX:INDEXDB', name: 'DAX', defaultPrice: 18512.80, defaultChange: 0.55 },
    { id: 'ticker-ndx', symbol: '^NDX', googleFinanceSymbol: 'NDX:INDEXNASDAQ', name: 'Nasdaq 100', defaultPrice: 19820.40, defaultChange: -0.24 },
    { id: 'ticker-btc', symbol: 'BTC-EUR', googleFinanceSymbol: 'BTC-EUR', name: 'Bitcoin (EUR)', defaultPrice: 58450.00, defaultChange: 1.85 }
];

function openGoogleFinancePage(symbol, searchQuery) {
    const url = symbol
        ? `https://www.google.com/finance/beta/quote/${symbol}`
        : `https://www.google.com/search?q=${encodeURIComponent(`Google Finance ${searchQuery}`)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
}

function getGoogleFinanceStockSymbol(stock) {
    const euronextTicker = YahooFinanceService.getTickerForEuronext(stock.euronextTicker);
    if (euronextTicker) return `${euronextTicker.slice(0, -3)}:EPA`;

    const isin = (stock.isin || '').trim().toUpperCase();
    const ticker = stock.yahooTicker || YahooFinanceService.getTickerForIsin(isin) || (stock.ticker || '').trim().toUpperCase();
    const match = ticker.match(/^([A-Z0-9-]+)\.([A-Z]+)$/);
    if (!match) return null;

    const exchangeBySuffix = {
        PA: 'EPA', MI: 'BIT', AS: 'AMS', BR: 'EBR', DE: 'ETR',
        L: 'LON', SW: 'SWX', TO: 'TSE', AX: 'ASX', HK: 'HKG', T: 'TYO'
    };
    const exchange = exchangeBySuffix[match[2]];
    return exchange ? `${match[1]}:${exchange}` : null;
}

function openGoogleFinanceStock(stock) {
    const ticker = (stock.ticker || '').trim();
    const searchQuery = [stock.name, ticker, stock.isin].filter(Boolean).join(' ');
    openGoogleFinancePage(getGoogleFinanceStockSymbol(stock), searchQuery);
}

let donutChartInstance = null;
let marketRefreshInProgress = false;
let nextYahooRefreshAt = 0;
let yahooCountdownTimer = null;

// Initialisation de l'application
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    loadState();
    setupEventListeners();

    if (window.state.portfolio.length === 0) {
        window.state.portfolio = JSON.parse(JSON.stringify(demoPortfolio));
        window.state.cashBalance = demoCash;
        window.state.isDemo = true;
        recalculateTotals();
    }

    applyCachedQuotes();
    renderPortfolio();
    initTickerTapeTrack();

    // Démarrage du parseur RSS
    if (typeof RSSParser !== 'undefined') {
        RSSParser.init();
    }

    // Récupération des cours en direct
    startYahooCountdown();
    refreshMarketData();
    updateAllUpdateDelays();

    // Actualisation automatique selon la cadence configurée
    setInterval(refreshMarketData, MARKET_REFRESH_INTERVAL_MS);
    setInterval(updateAllUpdateDelays, 1000);
});

function startYahooCountdown() {
    nextYahooRefreshAt = Date.now() + MARKET_REFRESH_INTERVAL_MS;
    updateYahooCountdown();
    if (!yahooCountdownTimer) {
        yahooCountdownTimer = setInterval(updateYahooCountdown, 1000);
    }
}

function updateYahooCountdown() {
    const countdown = document.getElementById('yahoo-countdown');
    if (!countdown) return;

    const seconds = Math.max(0, Math.ceil((nextYahooRefreshAt - Date.now()) / 1000));
    renderYahooCountdown(seconds);
}

function renderYahooCountdown(seconds) {
    const countdown = document.getElementById('yahoo-countdown');
    if (countdown) {
        countdown.innerHTML = `<img src="https://finance.yahoo.com/favicon.ico" alt=""><strong>${seconds} s</strong>`;
    }
}

async function refreshMarketData() {
    if (marketRefreshInProgress) return 0;

    marketRefreshInProgress = true;
    const refreshStartedAt = Date.now();
    renderYahooCountdown(0);
    const refreshBtn = document.getElementById('yahoo-countdown');
    if (refreshBtn) {
        refreshBtn.disabled = true;
        refreshBtn.classList.add('loading');
    }
    try {
        const [, updated] = await Promise.all([
            updateMarketIndices(),
            updateAllPricesFromYahoo()
        ]);
        flashVariationCells();
        return updated || 0;
    } finally {
        const feedbackDelay = MIN_REFRESH_FEEDBACK_MS - (Date.now() - refreshStartedAt);
        if (feedbackDelay > 0) {
            await new Promise(resolve => setTimeout(resolve, feedbackDelay));
        }
        marketRefreshInProgress = false;
        if (refreshBtn) {
            refreshBtn.disabled = false;
            refreshBtn.classList.remove('loading');
        }
        startYahooCountdown();
    }
}

function flashVariationCells() {
    const variationCells = document.querySelectorAll('#watchlist-body .pill-variation');
    variationCells.forEach(cell => {
        cell.classList.remove('yahoo-refresh-flash');
        void cell.offsetWidth;
        cell.classList.add('yahoo-refresh-flash');
        window.setTimeout(() => cell.classList.remove('yahoo-refresh-flash'), 900);
    });
}

// Gestion du Thème (Hybride vs 100% Sombre)
function initTheme() {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) || 'hybrid';
    document.documentElement.setAttribute('data-theme', savedTheme);

    const themeBtn = document.getElementById('theme-toggle-btn');
    if (themeBtn) {
        themeBtn.addEventListener('click', () => {
            const current = document.documentElement.getAttribute('data-theme');
            const next = current === 'dark' ? 'hybrid' : 'dark';
            document.documentElement.setAttribute('data-theme', next);
            localStorage.setItem(THEME_STORAGE_KEY, next);
            if (donutChartInstance) {
                renderSectorDonut();
            }
        });
    }
}

// Configuration des onglets SPA et écouteurs d'événements
function setupEventListeners() {
    // 1. Onglets Header (Portefeuilles / Actualités)
    const tabBtns = document.querySelectorAll('.nav-tab');
    const views = document.querySelectorAll('.tab-view');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const targetId = btn.getAttribute('data-target');
            views.forEach(v => {
                v.classList.remove('active');
                v.style.display = 'none';
            });

            const targetView = document.getElementById(targetId);
            if (targetView) {
                targetView.classList.add('active');
                targetView.style.display = 'block';
            }

            if (targetId === 'news-view' && typeof RSSParser !== 'undefined') {
                RSSParser.renderFullNews();
            }
        });
    });

    // 2. Import CSV EasyBourse
    const importBtn = document.getElementById('import-btn');
    const fileInput = document.getElementById('csv-file-input');
    if (importBtn && fileInput) {
        importBtn.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', handleFileImport);
    }

    // 3. Rafraîchir les cours manuellement
    const refreshBtn = document.getElementById('yahoo-countdown');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', async () => {
            const updated = await refreshMarketData();
            const status = updated > 0
                ? `${updated} cours actualisé${updated > 1 ? 's' : ''}`
                : 'Aucun cours n’a pu être actualisé';
            refreshBtn.title = status;
            refreshBtn.setAttribute('aria-label', `${status}. Cliquer pour actualiser les cours.`);
        });
    }

    // 4. Recherche dans le tableau
    const searchInput = document.getElementById('watchlist-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            filterPositionsTable(e.target.value.toLowerCase().trim());
        });
    }

    const totalInvestedInput = document.getElementById('res-total-invested');
    if (totalInvestedInput) {
        totalInvestedInput.addEventListener('input', event => {
            const value = event.target.value.trim();
            window.state.totalInvestedOverride = value === '' ? null : Number(value);
            if (value !== '') {
                window.state.isDemo = false;
            }
            renderFinancialSummary();
            saveState();
        });
    }

    // 5. Modale d'ajout manuel
    const openAddBtn = document.getElementById('open-add-modal-btn');
    const closeAddBtn = document.getElementById('close-add-modal-btn');
    const cancelAddBtn = document.getElementById('cancel-add-btn');
    const addModal = document.getElementById('add-modal');
    const addForm = document.getElementById('add-ticker-form');

    if (openAddBtn && addModal) {
        openAddBtn.addEventListener('click', () => addModal.style.display = 'flex');
    }
    if (closeAddBtn && addModal) {
        closeAddBtn.addEventListener('click', () => addModal.style.display = 'none');
    }
    if (cancelAddBtn && addModal) {
        cancelAddBtn.addEventListener('click', () => addModal.style.display = 'none');
    }
    if (addForm) {
        addForm.addEventListener('submit', handleManualAdd);
    }

    // 6. Modale d'aide Synthèse
    const helpBtn = document.getElementById('help-summary-btn');
    const closeHelpBtn = document.getElementById('close-help-modal-btn');
    const helpModal = document.getElementById('help-modal');

    if (helpBtn && helpModal) {
        helpBtn.addEventListener('click', () => helpModal.style.display = 'flex');
    }
    if (closeHelpBtn && helpModal) {
        closeHelpBtn.addEventListener('click', () => helpModal.style.display = 'none');
    }

    // Fermer les modales au clic sur le backdrop
    window.addEventListener('click', (e) => {
        if (e.target === addModal) addModal.style.display = 'none';
        if (e.target === helpModal) helpModal.style.display = 'none';
    });

    // 7. Bouton de réinitialisation
    const resetBtn = document.getElementById('reset-portfolio-btn');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            if (confirm("Réinitialiser le portefeuille avec les données de démonstration EasyBourse ?")) {
                localStorage.removeItem(STORAGE_KEY);
                window.state.portfolio = JSON.parse(JSON.stringify(demoPortfolio));
                window.state.cashBalance = demoCash;
                window.state.isDemo = true;
                recalculateTotals();
                renderPortfolio();
                resetBtn.style.display = 'none';
            }
        });
    }
}

// Initialisation et boucle continue du bandeau boursier (Ticker Tape)
function initTickerTapeTrack() {
    const track = document.getElementById('ticker-tape-track');
    if (!track) return;

    // Rendre les éléments d'indices
    const itemsHTML = INDICES.map(idx => `
        <div class="ticker-tape-item" id="${idx.id}">
            <span class="ticker-symbol">${idx.name}</span>
            <span class="ticker-price">${formatNumber(idx.defaultPrice)}</span>
            <span class="ticker-change ${idx.defaultChange >= 0 ? 'val-positive' : 'val-negative'}">
                ${idx.defaultChange >= 0 ? '+' : ''}${idx.defaultChange.toFixed(2)}%
            </span>
        </div>
    `).join('');

    // Dupliquer le contenu dans la piste pour assurer une boucle infinie continue sans coupure visuelle
    track.innerHTML = itemsHTML + itemsHTML;
    track.querySelectorAll('.ticker-tape-item').forEach((element, position) => {
        const index = INDICES[position % INDICES.length];
        const openIndex = () => openGoogleFinancePage(index.googleFinanceSymbol, index.name);
        element.setAttribute('role', 'link');
        element.setAttribute('tabindex', '0');
        element.setAttribute('aria-label', `Ouvrir ${index.name} sur Google Finance`);
        element.addEventListener('click', openIndex);
        element.addEventListener('keydown', event => {
            if (event.key === 'Enter') openIndex();
        });
    });
    applyCachedIndexQuotes();
}

function renderIndexQuote(index, price, changePercent) {
    const elements = document.querySelectorAll(`[id="${index.id}"]`);
    elements.forEach(element => {
        const priceEl = element.querySelector('.ticker-price');
        const changeEl = element.querySelector('.ticker-change');
        if (priceEl) priceEl.textContent = formatNumber(price) + (index.symbol === 'BTC-EUR' ? ' €' : '');
        if (changeEl && typeof changePercent === 'number' && Number.isFinite(changePercent)) {
            changeEl.textContent = `${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%`;
            changeEl.className = `ticker-change ${changePercent >= 0 ? 'val-positive' : 'val-negative'}`;
        }
    });
}

function applyCachedIndexQuotes() {
    const cache = readQuoteCache();
    const oldestAllowed = Date.now() - 30 * 24 * 60 * 60 * 1000;

    INDICES.forEach(index => {
        const quote = cache[index.symbol];
        if (!quote?.updatedAt || quote.updatedAt < oldestAllowed ||
            typeof quote.price !== 'number' || !Number.isFinite(quote.price) || quote.price <= 0) return;

        renderIndexQuote(index, quote.price, quote.dayChangePercent);
    });
}

// Mise à jour des indices boursiers (Yahoo Finance & Proxy AllOrigins)
async function updateMarketIndices() {
    const quotes = await YahooFinanceService.fetchCharts(INDICES.map(index => index.symbol));
    const promises = INDICES.map(async (idx) => {
        try {
            const result = quotes.get(idx.symbol) || await YahooFinanceService.fetchChart(idx.symbol);
            if (!result) return;

            const price = result.meta.regularMarketPrice;
            const changePercent = YahooFinanceService.getDailyChangePercent(result, price);

            if (typeof price !== 'number' || isNaN(price)) return;

            renderIndexQuote(idx, price, changePercent);
            return { ticker: idx.symbol, price, dayChangePercent: changePercent };
        } catch (e) {
            // Ignorer silencieusement pour garder les valeurs par défaut
        }
    });

    const updatedQuotes = await Promise.all(promises);
    const validQuotes = updatedQuotes.filter(Boolean);
    if (validQuotes.length > 0) saveQuoteCache(validQuotes);
}

// Recalcul des totaux du portefeuille
function recalculateTotals() {
    let positionsValuation = 0;

    window.state.portfolio.forEach(stock => {
        stock.valuation = stock.quantity * stock.currentPrice;
        stock.gainLoss = stock.valuation - (stock.quantity * stock.averagePrice);
        if (stock.averagePrice > 0) {
            stock.gainLossPercent = ((stock.currentPrice - stock.averagePrice) / stock.averagePrice) * 100;
        } else {
            stock.gainLossPercent = 0;
        }
        positionsValuation += stock.valuation;
    });

    window.state.totalValue = positionsValuation + window.state.cashBalance;

    // Recalcul des poids sectoriels
    window.state.portfolio.forEach(stock => {
        stock.weight = positionsValuation > 0 ? (stock.valuation / positionsValuation) * 100 : 0;
    });
}

// Rendu du tableau des positions et des widgets
function formatUpdateDelay(timestamp) {
    if (!timestamp || !Number.isFinite(timestamp)) {
        return '--:--';
    }

    const totalSeconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function updateAllUpdateDelays() {
    document.querySelectorAll('.update-delay-cell').forEach(cell => {
        const timestamp = Number(cell.dataset.updatedAt || 0);
        cell.textContent = formatUpdateDelay(timestamp);
    });
}

function renderPortfolio() {
    const tbody = document.getElementById('watchlist-body');
    const countBadge = document.getElementById('positions-count-badge');
    const resetBtn = document.getElementById('reset-portfolio-btn');

    if (countBadge) {
        const activePositionCount = window.state.portfolio.filter(stock => !stock.isOpcvm).length;
        countBadge.textContent = `${activePositionCount} Valeur${activePositionCount > 1 ? 's' : ''}`;
    }

    if (resetBtn) {
        resetBtn.style.display = window.state.isDemo ? 'none' : 'inline-flex';
    }

    if (!tbody) return;

    if (window.state.portfolio.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" style="text-align:center; padding: 48px 20px; color: var(--text-muted);">
                    <div style="font-size: 15px; font-weight: 600; margin-bottom: 6px; color: var(--text-primary);">Aucune position active</div>
                    <p style="font-size: 13px;">Cliquez sur "Importer fichier CSV Intraday" pour charger votre portefeuille EasyBourse ou ajoutez une valeur manuellement.</p>
                </td>
            </tr>
        `;
        renderFinancialSummary();
        renderSectorDonut();
        return;
    }

    tbody.innerHTML = '';
    [...window.state.portfolio]
        .sort((firstStock, secondStock) => secondStock.valuation - firstStock.valuation)
        .forEach(stock => {
        const row = document.createElement('tr');
        row.setAttribute('data-ticker', stock.name);
        if (stock.isOpcvm) row.classList.add('opcvm-row');

        const isGain = stock.gainLoss >= 0;
        const dayChange = typeof stock.dayChangePercent === 'number' ? stock.dayChangePercent : 0;
        const isDayUp = dayChange >= 0;
        const currentPriceDisplay = stock.priceUnavailable
            ? '<span class="price-unavailable" title="Cours Yahoo Finance indisponible">—</span>'
            : formatCurrency(stock.currentPrice);
        const currentPriceTitle = stock.quoteUpdatedAt
            ? `Dernière cotation récupérée le ${new Date(stock.quoteUpdatedAt).toLocaleString('fr-FR')}`
            : 'Cours importé, actualisation Yahoo en attente';
        const updateDelayDisplay = formatUpdateDelay(stock.quoteUpdatedAt);
        const yahooCode = stock.yahooTicker || YahooFinanceService.getTickerForIsin(stock.isin) ||
            YahooFinanceService.getTickerForEuronext(stock.euronextTicker) ||
            (/^[A-Z0-9-]+\.[A-Z]+$/i.test(stock.ticker || '') ? stock.ticker : '');
        const identifierCode = stock.isOpcvm ? 'OPCVM' : yahooCode || '—';

        // Effet de flash lors d'une variation de cours
        let flashClass = '';
        if (stock.currentPrice > stock.lastPrice) {
            flashClass = 'flash-green';
            stock.lastPrice = stock.currentPrice;
        } else if (stock.currentPrice < stock.lastPrice) {
            flashClass = 'flash-red';
            stock.lastPrice = stock.currentPrice;
        }

        row.innerHTML = `
            <td class="align-left">
                <div class="ticker-cell-name">
                    <span class="stock-symbol">${stock.name}</span>
                    <span class="stock-isin stock-identifiers">${stock.isin || '—'} | ${identifierCode}</span>
                </div>
            </td>
            <td class="align-right ${flashClass}" style="font-weight: 700;" title="${currentPriceTitle}">${currentPriceDisplay}</td>
            <td class="update-delay-cell align-right" data-updated-at="${stock.quoteUpdatedAt || 0}" style="font-weight: 700; color: var(--text-secondary);" title="Depuis la dernière mise à jour">${updateDelayDisplay}</td>
            <td class="align-right" style="font-weight: 600;">${formatNumber(stock.quantity)}</td>
            <td class="align-right">${formatCurrency(stock.averagePrice)}</td>
            <td class="align-right">
                <span class="pill-variation ${isDayUp ? 'positive' : 'negative'}">
                    ${isDayUp ? '+' : ''}${dayChange.toFixed(2)}%
                </span>
            </td>
            <td class="align-right">
                <div class="${isGain ? 'val-positive' : 'val-negative'}" style="font-weight: 700;">
                    ${isGain ? '+' : ''}${formatCurrency(stock.gainLoss)}
                </div>
                <div style="font-size: 11px; opacity: 0.85; font-weight: 600;" class="${isGain ? 'val-positive' : 'val-negative'}">
                    (${isGain ? '+' : ''}${stock.gainLossPercent.toFixed(2)}%)
                </div>
            </td>
            <td class="align-right" style="font-weight: 700; color: var(--text-primary);">
                ${formatCurrency(stock.valuation)}
            </td>
            <td class="align-center action-col">
                <button class="action-btn-delete" title="Supprimer la position" aria-label="Supprimer la position" data-name="${stock.name}">
                    <svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" stroke-width="2.2" fill="none">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </td>
        `;

        // Suppression de ligne
        const delBtn = row.querySelector('.action-btn-delete');
        delBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm(`Retirer ${stock.name} de votre portefeuille ?`)) {
                removeStock(stock.name);
            }
        });

        row.tabIndex = 0;
        row.addEventListener('click', () => openGoogleFinanceStock(stock));
        row.addEventListener('keydown', event => {
            if (event.key === 'Enter') openGoogleFinanceStock(stock);
        });

            tbody.appendChild(row);
        });

    renderFinancialSummary();
    renderSectorDonut();

    // Mettre à jour les actualités associées
    if (typeof RSSParser !== 'undefined') {
        RSSParser.renderCondensedNews();
    }
}

// Rendu du Widget Synthèse Financière
function renderFinancialSummary() {
    let calculatedTotalInvested = 0;
    let totalValuation = 0;

    window.state.portfolio.forEach(s => {
        calculatedTotalInvested += s.quantity * s.averagePrice;
        totalValuation += s.valuation;
    });

    const hasInvestedOverride = typeof window.state.totalInvestedOverride === 'number'
        && Number.isFinite(window.state.totalInvestedOverride)
        && window.state.totalInvestedOverride >= 0;
    const totalInvested = hasInvestedOverride
        ? window.state.totalInvestedOverride
        : calculatedTotalInvested;
    const globalGainLoss = totalValuation - totalInvested;
    const globalGainLossPercent = totalInvested > 0 ? (globalGainLoss / totalInvested) * 100 : 0;
    const totalAssets = totalValuation + window.state.cashBalance;
    const grossValue = totalAssets - totalInvested;
    const latentGainPercent = calculatedTotalInvested > 0
        ? ((totalValuation - calculatedTotalInvested) / calculatedTotalInvested) * 100
        : 0;

    const totalAssetsEl = document.getElementById('res-total-assets');
    const badgeEl = document.getElementById('res-gain-loss-badge');
    const investedEl = document.getElementById('res-total-invested');
    const grossValueEl = document.getElementById('res-gross-value');
    const totalPurchasesEl = document.getElementById('res-total-purchases');
    const currentPortfolioValueEl = document.getElementById('res-current-portfolio-valuation');
    const cashEl = document.getElementById('res-cash-balance');
    const gridGlobalReturnEl = document.getElementById('res-grid-global-return');

    if (totalAssetsEl) totalAssetsEl.textContent = formatCurrency(totalAssets);
    if (investedEl) {
        investedEl.value = hasInvestedOverride ? window.state.totalInvestedOverride : '';
    }
    if (grossValueEl) {
        if (hasInvestedOverride && totalInvested > 0) {
            const grossValuePercent = (grossValue / totalInvested) * 100;
            const sign = grossValue >= 0 ? '+' : '';
            grossValueEl.textContent = `${sign}${formatCurrency(grossValue)} (${sign}${grossValuePercent.toFixed(2)}%)`;
            grossValueEl.className = `metric-value gross-value ${grossValue >= 0 ? 'val-positive' : 'val-negative'}`;
        } else {
            grossValueEl.textContent = '';
            grossValueEl.className = 'metric-value gross-value';
        }
    }
    if (cashEl) cashEl.textContent = formatCurrency(window.state.cashBalance);
    if (gridGlobalReturnEl) {
        gridGlobalReturnEl.textContent = `(${latentGainPercent >= 0 ? '+' : ''}${latentGainPercent.toFixed(2)}%)`;
        gridGlobalReturnEl.className = `performance-badge global-return-value ${latentGainPercent >= 0 ? 'val-positive' : 'val-negative'}`;
    }

    if (totalPurchasesEl) {
        totalPurchasesEl.textContent = formatCurrency(calculatedTotalInvested);
    }
    if (currentPortfolioValueEl) {
        currentPortfolioValueEl.textContent = formatCurrency(totalValuation);
    }

    if (badgeEl) {
        badgeEl.textContent = `${globalGainLoss >= 0 ? '+' : ''}${globalGainLossPercent.toFixed(2)}%`;
        badgeEl.className = `performance-badge ${globalGainLoss >= 0 ? 'val-positive' : 'val-negative'}`;
        badgeEl.style.backgroundColor = globalGainLoss >= 0 ? 'var(--color-success-bg)' : 'var(--color-danger-bg)';
    }
}

// Rendu du Donut Chart d'Allocation Sectorielle
function renderSectorDonut() {
    const canvas = document.getElementById('allocation-donut');
    if (!canvas || typeof Chart === 'undefined') return;

    // Calculer la valorisation par secteur
    const sectorWeights = {
        "Consommation & Luxe": 0,
        "Technologie": 0,
        "Énergie & Matériaux": 0,
        "Santé": 0
    };

    let totalVal = 0;
    window.state.portfolio.forEach(stock => {
        const sector = stock.sector || assignSector(stock.name);
        if (!sectorWeights[sector]) sectorWeights[sector] = 0;
        sectorWeights[sector] += stock.valuation;
        totalVal += stock.valuation;
    });

    const labels = ["Consommation & Luxe", "Technologie", "Énergie & Matériaux", "Santé"];
    const colors = ["#3b82f6", "#10b981", "#f59e0b", "#ec4899"];

    let dataValues = [];
    if (totalVal > 0) {
        dataValues = labels.map(label => {
            const pct = (sectorWeights[label] / totalVal) * 100;
            return Math.round(pct);
        });
    } else {
        dataValues = [38, 28, 22, 12]; // Répartition de référence du prompt
    }

    // Mettre à jour les labels de pourcentage dans la légende
    const pctLuxe = document.getElementById('pct-consommation');
    const pctTech = document.getElementById('pct-tech');
    const pctEnergie = document.getElementById('pct-energie');
    const pctSante = document.getElementById('pct-sante');

    if (pctLuxe) pctLuxe.textContent = `${dataValues[0]}%`;
    if (pctTech) pctTech.textContent = `${dataValues[1]}%`;
    if (pctEnergie) pctEnergie.textContent = `${dataValues[2]}%`;
    if (pctSante) pctSante.textContent = `${dataValues[3]}%`;

    if (donutChartInstance) {
        donutChartInstance.destroy();
    }

    const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark';

    donutChartInstance = new Chart(canvas, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: dataValues,
                backgroundColor: colors,
                borderWidth: 2,
                borderColor: isDarkMode ? '#111827' : '#ffffff',
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '72%',
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function (ctx) {
                            return ` ${ctx.label}: ${ctx.raw}%`;
                        }
                    }
                }
            }
        }
    });
}

function assignSector(stockName) {
    const upper = stockName.toUpperCase();
    if (upper.includes("LVMH") || upper.includes("L'OREAL") || upper.includes("ORÉAL") || upper.includes("KERING") || upper.includes("HERMES")) {
        return "Consommation & Luxe";
    }
    if (upper.includes("STMICRO") || upper.includes("SCHNEIDER") || upper.includes("DASSAULT") || upper.includes("CAPGEMINI")) {
        return "Technologie";
    }
    if (upper.includes("AIR LIQUIDE") || upper.includes("TOTAL") || upper.includes("ENGIE") || upper.includes("ARCELOR")) {
        return "Énergie & Matériaux";
    }
    if (upper.includes("SANOFI") || upper.includes("BIOMERIEUX") || upper.includes("SARTORIUS") || upper.includes("EUROFINS")) {
        return "Santé";
    }
    return "Consommation & Luxe"; // Catégorie par défaut
}

// Filtrage du tableau de positions
function filterPositionsTable(query) {
    const rows = document.querySelectorAll('#watchlist-body tr');
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        if (text.includes(query)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

// Ajout manuel d'une position
function handleManualAdd(e) {
    e.preventDefault();
    const name = document.getElementById('new-ticker-name').value.toUpperCase().trim();
    const isin = document.getElementById('new-ticker-isin').value.toUpperCase().trim();
    const qty = parseFloat(document.getElementById('new-ticker-qty').value) || 1;
    const pru = parseFloat(document.getElementById('new-ticker-pru').value) || 0;
    const price = parseFloat(document.getElementById('new-ticker-price').value) || pru;

    if (!name) return;

    if (window.state.isDemo) {
        window.state.portfolio = [];
        window.state.isDemo = false;
    }

    const newStock = {
        name: name,
        ticker: isin,
        isin: isin,
        quantity: qty,
        averagePrice: pru,
        currentPrice: price,
        lastPrice: price,
        dayChangePercent: 0,
        valuation: qty * price,
        gainLoss: (qty * price) - (qty * pru),
        gainLossPercent: pru > 0 ? ((price - pru) / pru) * 100 : 0,
        sector: assignSector(name)
    };

    window.state.portfolio.push(newStock);
    recalculateTotals();
    saveState();
    renderPortfolio();

    // Réinitialiser et fermer le modal
    document.getElementById('add-ticker-form').reset();
    document.getElementById('add-modal').style.display = 'none';
}

// Suppression d'une position
function removeStock(name) {
    window.state.portfolio = window.state.portfolio.filter(s => s.name !== name);
    recalculateTotals();
    saveState();
    renderPortfolio();
}

// --- PARSER CSV EASYBOURSE (Confidentialité respectée : Compte masqué) ---
function handleFileImport(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.readAsText(file, 'ISO-8859-1');

    reader.onload = async function (evt) {
        try {
            await parseEasyBourseCSV(evt.target.result);
            e.target.value = '';
        } catch (err) {
            alert("Erreur lors de la lecture du fichier : " + err.message);
        }
    };
}

async function parseEasyBourseCSV(text) {
    const lines = text.split(/\r?\n/);
    if (lines.length < 5) throw new Error("Le fichier semble trop court ou invalide.");

    let cash = 0;
    let newPortfolio = [];
    let isTableSection = false;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // 1. Solde espèces
        if (line.includes("Solde esp") || line.includes("Solde esp?ces")) {
            const parts = line.split(';');
            if (parts.length > 1) cash = parseCSVFloat(parts[1]);
            continue;
        }

        // 2. Début du tableau
        if (line.startsWith("Valeur;") && line.includes("Code Isin")) {
            isTableSection = true;
            continue;
        }

        // 3. Extraction des lignes de valeurs
        if (isTableSection) {
            const parts = line.split(';');
            if (parts.length < 10) continue;

            const name = parts[0].trim();
            const sourceCode = parts[1].trim().toUpperCase();
            const isIsin = /^[A-Z]{2}[A-Z0-9]{10}$/.test(sourceCode);
            const isin = isIsin ? sourceCode : '';
            const euronextTicker = isIsin ? null : sourceCode.replace(/(?::EPA|\.PA)$/i, '');
            const instrumentType = (parts[2] || '').trim().toUpperCase();

            if (!name || name.toLowerCase().includes("total") || !sourceCode) continue;

            const quantity = parseCSVFloat(parts[4]);
            const importedPrice = parseCSVFloat(parts[5]);
            const averagePrice = parseCSVFloat(parts[6]);
            const valuation = parseCSVFloat(parts[7]);
            const gainLoss = parseCSVFloat(parts[8]);
            const gainLossPercent = parseCSVFloat(parts[9]);
            const currentPrice = importedPrice > 0
                ? importedPrice
                : (quantity > 0 && valuation > 0 ? valuation / quantity : 0);

            newPortfolio.push({
                name: name,
                ticker: sourceCode,
                isin: isin,
                euronextTicker: euronextTicker,
                yahooTicker: null,
                instrumentType: instrumentType,
                isEtf: instrumentType === 'ETF' || isin === 'FR0013412020',
                isOpcvm: instrumentType !== 'ETF' && (instrumentType === 'OPCVM' || isOpcvmName(name)),
                quantity: quantity,
                averagePrice: averagePrice,
                currentPrice: currentPrice,
                lastPrice: currentPrice,
                dayChangePercent: 0,
                valuation: valuation,
                gainLoss: gainLoss,
                gainLossPercent: gainLossPercent,
                sector: assignSector(name)
            });
        }
    }

    if (newPortfolio.length === 0) {
        throw new Error("Aucune action n'a pu être extraite. Vérifiez le format du fichier.");
    }

    window.state.portfolio = newPortfolio;
    window.state.cashBalance = cash;
    window.state.isDemo = false;

    recalculateTotals();
    saveState();
    renderPortfolio();
    const updated = await updateAllPricesFromYahoo();
    if (updated === 0) {
        renderPortfolio();
    }

    alert(`Importation EasyBourse réussie ! ${newPortfolio.length} valeurs importées et ${updated} cours Yahoo actualisés.`);
}

function parseCSVFloat(str) {
    if (!str) return 0;
    const cleaned = String(str)
        .trim()
        .replace(/\s/g, '')
        .replace(/\.(?=.*\.)/g, '')
        .replace(',', '.');
    const val = parseFloat(cleaned);
    return isNaN(val) ? 0 : val;
}

function isOpcvmName(name) {
    return /\b(OPCVM|FCP|SICAV)\b/i.test(name);
}

// --- PORTFOLIO REFRESH ORCHESTRATION ---
async function updateAllPricesFromYahoo() {
    if (window.state.portfolio.length === 0) return;

    let portfolioMetadataChanged = false;
    const resolvedStocks = await Promise.all(window.state.portfolio.map(async stock => {
        if (stock.isOpcvm) return { stock, ticker: null };

        const cachedTicker = (stock.yahooTicker || '').trim();
        let ticker = cachedTicker || null;
        let resolution = null;

        if (!ticker) {
            resolution = await YahooFinanceService.resolveTicker(stock);
            ticker = resolution?.symbol || null;
            if (ticker) {
                stock.yahooTicker = ticker;
                portfolioMetadataChanged = true;
            }
        } else {
            stock.yahooTicker = cachedTicker;
        }

        if (ticker?.endsWith('.PA') && stock.euronextTicker !== ticker.slice(0, -3)) {
            stock.euronextTicker = ticker.slice(0, -3);
            portfolioMetadataChanged = true;
        }

        const isEtf = stock.isEtf || stock.instrumentType === 'ETF' || resolution?.quoteType === 'ETF' ||
            stock.isin === 'FR0013412020';
        const isOpcvm = !isEtf && (stock.isOpcvm || resolution?.quoteType === 'MUTUALFUND' ||
            /^0P[A-Z0-9]+(?:\.[A-Z])?$/i.test(ticker || '') || isOpcvmName(stock.name));

        if (stock.isEtf !== isEtf || stock.isOpcvm !== isOpcvm) {
            stock.isEtf = isEtf;
            stock.isOpcvm = isOpcvm;
            portfolioMetadataChanged = true;
        }

        return { stock, ticker };
    }));
    const batchQuotes = await YahooFinanceService.fetchCharts(
        resolvedStocks.filter(item => item.ticker).map(item => item.ticker)
    );

    const promises = resolvedStocks.map(async ({ stock, ticker }) => {
        stock.priceUnavailable = !(typeof stock.currentPrice === 'number' && Number.isFinite(stock.currentPrice) && stock.currentPrice > 0);
        if (!ticker) return false;

        try {
            const result = batchQuotes.get(ticker) || await YahooFinanceService.fetchChart(ticker);
            if (!result) return false;

            const price = result.meta.regularMarketPrice;
            if (typeof price !== 'number' || !Number.isFinite(price) || price <= 0) return false;

            stock.lastPrice = stock.currentPrice;
            stock.currentPrice = price;
            stock.ticker = ticker;
            stock.priceUnavailable = false;
            stock.quoteUpdatedAt = Date.now();
            const changePercent = YahooFinanceService.getDailyChangePercent(result, price);
            if (changePercent !== null) stock.dayChangePercent = changePercent;
            return true;
        } catch (error) {
            console.warn(`Impossible de mettre à jour ${stock.name} (${ticker})`, error);
            return false;
        }
    });

    const results = await Promise.all(promises);
    const updated = results.filter(Boolean).length;

    if (updated > 0 || portfolioMetadataChanged || window.state.portfolio.some(stock => stock.priceUnavailable)) {
        recalculateTotals();
        saveQuoteCache();
        saveState();
        renderPortfolio();
    }

    if (updated === 0) {
        console.warn('Aucun cours Yahoo Finance n’a pu être récupéré. Vérifiez les tickers et la connexion réseau.');
    }

    return updated;
}

// Persistance LocalStorage
function loadState() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            window.state = JSON.parse(saved);
            window.state.isDemo = false;
        }
    } catch (e) {
        console.error("Erreur de chargement du stockage:", e);
    }
}

function readQuoteCache() {
    try {
        const cache = JSON.parse(localStorage.getItem(QUOTE_CACHE_KEY) || '{}');
        return cache && typeof cache === 'object' ? cache : {};
    } catch (error) {
        return {};
    }
}

function applyCachedQuotes() {
    const cache = readQuoteCache();
    let applied = false;

    window.state.portfolio.forEach(stock => {
        const isin = (stock.isin || '').trim().toUpperCase();
        const ticker = stock.yahooTicker || YahooFinanceService.getTickerForIsin(isin) ||
            YahooFinanceService.getTickerForEuronext(stock.euronextTicker) || (stock.ticker || '').trim().toUpperCase();
        const quote = cache[ticker];
        const cacheExpired = !quote?.updatedAt || quote.updatedAt < Date.now() - 30 * 24 * 60 * 60 * 1000;
        if (cacheExpired || typeof quote.price !== 'number' || !Number.isFinite(quote.price) || quote.price <= 0) return;

        stock.currentPrice = quote.price;
        stock.lastPrice = quote.price;
        stock.quoteUpdatedAt = quote.updatedAt;
        stock.priceUnavailable = false;
        if (typeof quote.dayChangePercent === 'number' && Number.isFinite(quote.dayChangePercent)) {
            stock.dayChangePercent = quote.dayChangePercent;
        }
        applied = true;
    });

    if (applied) recalculateTotals();
}

function saveQuoteCache(additionalQuotes = []) {
    const cache = readQuoteCache();
    const oldestAllowed = Date.now() - 30 * 24 * 60 * 60 * 1000;

    window.state.portfolio.forEach(stock => {
        const ticker = (stock.ticker || '').trim().toUpperCase();
        if (!ticker || !stock.quoteUpdatedAt || !Number.isFinite(stock.currentPrice)) return;
        cache[ticker] = {
            price: stock.currentPrice,
            dayChangePercent: stock.dayChangePercent,
            updatedAt: stock.quoteUpdatedAt
        };
    });

    additionalQuotes.forEach(quote => {
        if (!quote?.ticker || typeof quote.price !== 'number' || !Number.isFinite(quote.price) || quote.price <= 0) return;
        cache[quote.ticker] = {
            price: quote.price,
            dayChangePercent: quote.dayChangePercent,
            updatedAt: Date.now()
        };
    });

    Object.keys(cache).forEach(ticker => {
        if (!cache[ticker]?.updatedAt || cache[ticker].updatedAt < oldestAllowed) delete cache[ticker];
    });

    try {
        localStorage.setItem(QUOTE_CACHE_KEY, JSON.stringify(cache));
    } catch (error) {
        console.warn('Impossible de sauvegarder le cache des cours:', error);
    }
}

function saveState() {
    if (window.state.isDemo) return;
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(window.state));
    } catch (e) {
        console.error("Erreur de sauvegarde:", e);
    }
}

// Utilitaires de formatage
function formatCurrency(val) {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(val || 0);
}

function formatNumber(val) {
    return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(val || 0);
}
