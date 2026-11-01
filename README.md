// Yahoo Finance HTTP access, ticker resolution, and response parsing.
window.YahooFinanceService = (() => {
    const REQUEST_TIMEOUT_MS = 2000;

    const ISIN_TO_YAHOO = {
        "FR0000120073": "AI.PA",
        "FR0000121014": "MC.PA",
        "FR0013412020": "PAEEM.PA",
        "FR0000121972": "SU.PA",
        "FR0000120578": "SAN.PA",
        "FR0000120321": "OR.PA",
        "NL0000226223": "STMPA.PA",
        "FR0000120271": "TTE.PA",
        "FR0000133308": "ORA.PA",
        "FR0010208488": "ENGI.PA",
        "FR0010220475": "ALO.PA",
        "FR0000131104": "BNP.PA",
        "NL0000235190": "AIR.PA",
        "FR0014004L86": "AM.PA",
        "FR0014003TT8": "DSY.PA",
        "FR0013451333": "FDJU.PA",
        "NL00150001Q9": "STLAM.MI"
    };

    function getTickerForIsin(isin) {
        return ISIN_TO_YAHOO[(isin || '').trim().toUpperCase()] || null;
    }

    function getTickerForEuronext(euronextTicker) {
        const symbol = (euronextTicker || '').trim().toUpperCase();
        if (!symbol) return null;
        return symbol.endsWith('.PA') ? symbol : `${symbol}.PA`;
    }

    function getRequestUrls(targetUrl) {
        const encodedUrl = encodeURIComponent(targetUrl);
        return [
            // URL directe (fonctionne hors Chrome/file://)
            targetUrl,
            // corsproxy.io — format correct sans "url="
            `https://corsproxy.io/?${targetUrl}`,
            // thingproxy — fiable, pas de rate-limit strict
            `https://thingproxy.freeboard.io/fetch/${targetUrl}`,
            // allorigins.win en dernier recours (peut être rate-limité)
            `https://api.allorigins.win/get?url=${encodedUrl}`
        ];
    }

    async function fetchChart(ticker) {
        const targetUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?range=5d&interval=1d`;

        // On tente les 3 URLs (directe + proxies CORS) pour compatibilité Chrome
        for (const url of getRequestUrls(targetUrl)) {
            try {
                const response = await fetchWithTimeout(url);
                if (!response.ok) continue;

                const payload = await response.json();
                const data = typeof payload.contents === 'string'
                    ? JSON.parse(payload.contents)
                    : payload;
                const result = data?.chart?.result?.[0];
                if (result) return result;
            } catch (error) {
                // Try the next direct or CORS-proxy endpoint.
            }
        }

        return null;
    }

    async function fetchCharts(tickers) {
        const symbols = [...new Set(tickers.filter(Boolean))];
        if (symbols.length === 0) return new Map();

        const targetUrl = `https://query1.finance.yahoo.com/v7/finance/spark?symbols=${encodeURIComponent(symbols.join(','))}&range=1d&interval=1m`;

        for (const url of getRequestUrls(targetUrl)) {
            try {
                const response = await fetchWithTimeout(url);
                if (!response.ok) continue;

                const payload = await response.json();
                const data = typeof payload.contents === 'string'
                    ? JSON.parse(payload.contents)
                    : payload;
                const sparkResults = data?.spark?.result;
                const resultBySymbol = Array.isArray(sparkResults)
                    ? Object.fromEntries(sparkResults.filter(result => result?.symbol).map(result => [result.symbol, result]))
                    : data;
                const quotes = new Map();

                for (const symbol of symbols) {
                    const matchingKey = Object.keys(resultBySymbol || {}).find(key => key.toUpperCase() === symbol.toUpperCase());
                    const entry = resultBySymbol?.[symbol] || resultBySymbol?.[matchingKey];
                    const sparkResult = Array.isArray(entry) ? entry[0] : entry;
                    const result = sparkResult?.response?.[0] || sparkResult;
                    const meta = result?.meta || sparkResult?.meta;
                    const closes = result?.indicators?.quote?.[0]?.close || [];
                    const lastClose = [...closes].reverse().find(value => typeof value === 'number' && Number.isFinite(value));
                    const price = meta?.regularMarketPrice ?? lastClose;

                    if (meta && typeof price === 'number' && Number.isFinite(price) && price > 0) {
                        quotes.set(symbol, {
                            ...result,
                            meta: { ...meta, regularMarketPrice: price }
                        });
                    }
                }

                if (quotes.size > 0) return quotes;
            } catch (error) {
                // Try the next direct or CORS-proxy endpoint.
            }
        }

        return new Map();
    }

    function getPreviousClose(result) {
        const meta = result?.meta || {};
        const previousClose = [
            meta.regularMarketPreviousClose,
            meta.previousClose,
            meta.chartPreviousClose
        ].find(value => typeof value === 'number' && Number.isFinite(value) && value > 0);

        return previousClose || null;
    }

    function getDailyChangePercent(result, price) {
        const previousClose = getPreviousClose(result);
        if (previousClose) return ((price - previousClose) / previousClose) * 100;

        const directChange = result?.meta?.regularMarketChangePercent;
        return typeof directChange === 'number' && Number.isFinite(directChange)
            ? directChange
            : null;
    }

    async function resolveTicker(stock) {
        const knownTicker = getTickerForIsin(stock.isin);
        if (knownTicker) return { symbol: knownTicker, quoteType: 'EQUITY' };

        const euronextTicker = getTickerForEuronext(stock.euronextTicker);
        if (euronextTicker) return { symbol: euronextTicker, quoteType: null };

        const candidate = (stock.yahooTicker || stock.ticker || '').trim().toUpperCase();
        if (candidate && !/^[A-Z]{2}\d{10}$/.test(candidate)) return { symbol: candidate, quoteType: null };

        const queries = [stock.isin, stock.name].filter(Boolean);
        for (const value of queries) {
            const query = encodeURIComponent(value);
            const searchUrl = `https://query1.finance.yahoo.com/v1/finance/search?q=${query}&quotesCount=10&newsCount=0`;

            for (const url of getRequestUrls(searchUrl)) {
                try {
                    const response = await fetchWithTimeout(url);
                    if (!response.ok) continue;

                    const payload = await response.json();
                    const data = typeof payload.contents === 'string'
                        ? JSON.parse(payload.contents)
                        : payload;
                    const quote = data?.quotes?.find(item => item.symbol && item.quoteType === 'EQUITY')
                        || data?.quotes?.find(item => item.symbol);
                    if (quote?.symbol) return { symbol: quote.symbol, quoteType: quote.quoteType || null };
                } catch (error) {
                    // Try the next direct or CORS-proxy endpoint.
                }
            }
        }

        return null;
    }

    async function fetchWithTimeout(url) {
        const controller = new AbortController();
        const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
        try {
            return await fetch(url, { signal: controller.signal });
        } finally {
            window.clearTimeout(timeoutId);
        }
    }

    return Object.freeze({
        fetchChart,
        fetchCharts,
        getDailyChangePercent,
        getTickerForIsin,
        getTickerForEuronext,
        resolveTicker
    });
})();