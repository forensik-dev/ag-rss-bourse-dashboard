// EASY BOURSE - Parseur RSS & Actualités Financières (rss-parser.js)

const RSSParser = {
    // Flux RSS de référence pour la bourse française & internationale
    feeds: [
        { name: "Boursorama Info Bourse", url: "https://www.boursorama.com/flux-rss/info-bourse" },
        { name: "Les Échos Finance", url: "https://www.lesechos.fr/rss/rss-finance-marches.xml" },
        { name: "Yahoo Finance FR", url: "https://fr.finance.yahoo.com/news/rss" }
    ],

    articles: [],
    activeFilter: 'all', // 'all' ou 'portfolio'
    condensedFilter: 'all',
    corsProxy: "https://api.allorigins.win/get?url=",

    // Actualités de secours réalistes (pour démonstration immédiate et fallback hors-ligne)
    fallbackArticles: [
        {
            title: "AIR LIQUIDE : Forte demande dans l'électronique de pointe et l'hydrogène décarboné",
            description: "Air Liquide annonce des investissements majeurs dans les gaz de très haute pureté pour les semi-conducteurs et renforce ses partenariats européens.",
            link: "https://www.boursorama.com",
            pubDate: new Date().toISOString(),
            source: "Boursorama Info Bourse"
        },
        {
            title: "LVMH : Résilience confirmée dans la maroquinerie haut de gamme en Asie",
            description: "Le leader mondial du luxe bénéficie d'une solide dynamique portée par Louis Vuitton et Christian Dior, avec une amélioration des marges opérationnelles.",
            link: "https://www.lesechos.fr",
            pubDate: new Date(Date.now() - 3600000 * 1.5).toISOString(),
            source: "Les Échos Finance"
        },
        {
            title: "SCHNEIDER ELECTRIC : Croissance record tirée par l'infrastructure des Data Centers IA",
            description: "Schneider Electric relève ses prévisions d'activité grâce à la demande exponentielle en gestion thermique et énergétique des centres de calcul pour l'IA.",
            link: "https://www.boursorama.com",
            pubDate: new Date(Date.now() - 3600000 * 3).toISOString(),
            source: "Boursorama Info Bourse"
        },
        {
            title: "SANOFI : Succès d'un essai clinique de phase 3 dans l'immunologie",
            description: "Sanofi franchit une étape réglementaire décisive pour un nouveau biomédicament à potentiel blockbuster, visant plusieurs millions de patients.",
            link: "https://fr.finance.yahoo.com",
            pubDate: new Date(Date.now() - 3600000 * 5).toISOString(),
            source: "Yahoo Finance FR"
        },
        {
            title: "STMICROELECTRONICS : Signature d'accords d'approvisionnement en semi-conducteurs automobiles",
            description: "Le fabricant franco-italien consolide ses positions auprès des constructeurs européens pour la nouvelle génération de véhicules hybrides et électriques.",
            link: "https://www.boursorama.com",
            pubDate: new Date(Date.now() - 3600000 * 7).toISOString(),
            source: "Boursorama Info Bourse"
        },
        {
            title: "L'ORÉAL : Expansion accélérée sur les soins dermatologiques et le e-commerce",
            description: "La division Beauté Dermatologique tire la croissance du groupe au premier trimestre, avec des gains de parts de marché sur tous les continents.",
            link: "https://www.lesechos.fr",
            pubDate: new Date(Date.now() - 3600000 * 10).toISOString(),
            source: "Les Échos Finance"
        },
        {
            title: "CAC 40 : Les investisseurs saluent la baisse des taux et la vigueur des valeurs de croissance",
            description: "La place parisienne clôture en territoire positif dans des volumes étoffés, emmenée par les compartiments des biens de consommation et de la technologie.",
            link: "https://www.boursorama.com",
            pubDate: new Date(Date.now() - 3600000 * 12).toISOString(),
            source: "Boursorama Info Bourse"
        }
    ],

    init() {
        this.setupEventListeners();
        this.fetchNews();
    },

    setupEventListeners() {
        // Filtres dans le widget condensé
        const allBtnWidget = document.getElementById('filter-all-news-widget');
        const portfolioBtnWidget = document.getElementById('filter-portfolio-news-widget');

        if (allBtnWidget && portfolioBtnWidget) {
            allBtnWidget.addEventListener('click', () => {
                allBtnWidget.classList.add('active');
                portfolioBtnWidget.classList.remove('active');
                this.condensedFilter = 'all';
                this.renderCondensedNews();
            });

            portfolioBtnWidget.addEventListener('click', () => {
                portfolioBtnWidget.classList.add('active');
                allBtnWidget.classList.remove('active');
                this.condensedFilter = 'portfolio';
                this.renderCondensedNews();
            });
        }

        // Filtres dans la vue complète
        const fullSearchInput = document.getElementById('news-search-input');
        if (fullSearchInput) {
            fullSearchInput.addEventListener('input', () => this.renderFullNews());
        }

        const filterBtns = document.querySelectorAll('.news-feed-buttons .btn-filter');
        filterBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                filterBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.activeFilter = btn.getAttribute('data-filter') || 'all';
                this.renderFullNews();
            });
        });

        const refreshFullBtn = document.getElementById('refresh-news-full-btn');
        if (refreshFullBtn) {
            refreshFullBtn.addEventListener('click', () => this.fetchNews());
        }
    },

    async fetchNews() {
        const condensedContainer = document.getElementById('condensed-news-list');
        if (condensedContainer && this.articles.length === 0) {
            condensedContainer.innerHTML = '<div class="news-loading-indicator" style="font-size:12px; color:var(--text-muted); padding:10px;">Récupération des flux...</div>';
        }

        this.articles = [];
        const fetchPromises = this.feeds.map(async (feed) => {
            try {
                const response = await fetch(this.corsProxy + encodeURIComponent(feed.url));
                if (!response.ok) return;

                const data = await response.json();
                if (!data || !data.contents) return;

                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(data.contents, "text/xml");
                const items = xmlDoc.querySelectorAll("item");

                let feedArticles = [];
                items.forEach(item => {
                    const title = item.querySelector("title")?.textContent || "";
                    const description = item.querySelector("description")?.textContent ||
                                        item.querySelector("content\\:encoded")?.textContent || "";
                    const link = item.querySelector("link")?.textContent || "";
                    const pubDateStr = item.querySelector("pubDate")?.textContent || "";

                    const tempDiv = document.createElement("div");
                    tempDiv.innerHTML = description;
                    const cleanDescription = tempDiv.textContent || tempDiv.innerText || "";

                    if (title) {
                        feedArticles.push({
                            title: title.trim(),
                            description: cleanDescription.trim().substring(0, 180) + (cleanDescription.length > 180 ? '...' : ''),
                            link: link.trim() || "#",
                            pubDate: pubDateStr ? new Date(pubDateStr).toISOString() : new Date().toISOString(),
                            source: feed.name
                        });
                    }
                });

                this.articles = this.articles.concat(feedArticles);
            } catch (err) {
                console.warn(`Flux ${feed.name} non joignable via proxy:`, err.message || err);
            }
        });

        const timeoutPromise = new Promise(resolve => setTimeout(resolve, 6000));
        await Promise.race([Promise.allSettled(fetchPromises), timeoutPromise]);

        // Si aucun flux externe n'a pu répondre, utiliser le fallback
        if (this.articles.length === 0) {
            this.articles = JSON.parse(JSON.stringify(this.fallbackArticles));
        } else {
            // Combiner ou trier par date
            this.articles.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
        }

        this.renderCondensedNews();
        this.renderFullNews();
    },

    matchArticleWithPortfolio(article) {
        if (!window.state || !window.state.portfolio || window.state.portfolio.length === 0) return null;

        const titleUpper = article.title.toUpperCase();
        const descUpper = article.description.toUpperCase();

        for (const stock of window.state.portfolio) {
            const fullName = stock.name.toUpperCase();
            // Premier mot significatif
            const primaryWord = fullName.split(' ')[0].replace(/[^A-Z0-9]/g, '');

            if (primaryWord.length >= 3) {
                if (titleUpper.includes(primaryWord) || descUpper.includes(primaryWord)) {
                    return stock.name;
                }
            }

            if (stock.isin && stock.isin.length >= 6) {
                if (titleUpper.includes(stock.isin.toUpperCase())) {
                    return stock.name;
                }
            }
        }
        return null;
    },

    renderCondensedNews() {
        const container = document.getElementById('condensed-news-list');
        if (!container) return;

        let list = this.articles.filter(article => {
            if (this.condensedFilter === 'portfolio') {
                return this.matchArticleWithPortfolio(article) !== null;
            }
            return true;
        });

        if (list.length === 0) {
            container.innerHTML = `
                <div style="font-size:12px; color:var(--text-muted); text-align:center; padding:18px 8px;">
                    Aucune actualité trouvée pour vos valeurs en portefeuille.
                </div>
            `;
            return;
        }

        // Afficher les 5 plus récents
        const displayItems = list.slice(0, 5);
        container.innerHTML = displayItems.map(item => {
            const matched = this.matchArticleWithPortfolio(item);
            const dateDisplay = formatTimeAgo(item.pubDate);
            return `
                <a href="${item.link}" target="_blank" rel="noopener noreferrer" class="condensed-news-item">
                    <div class="news-item-top">
                        <span class="news-item-source">${item.source.split(' ')[0]}</span>
                        <span class="news-item-date">${dateDisplay}</span>
                    </div>
                    <div class="news-item-title">${item.title}</div>
                    ${matched ? `<span class="news-ticker-tag">★ ${matched}</span>` : ''}
                </a>
            `;
        }).join('');
    },

    renderFullNews() {
        const grid = document.getElementById('full-news-cards-grid');
        const searchInput = document.getElementById('news-search-input');
        const query = searchInput ? searchInput.value.toLowerCase().trim() : '';

        if (!grid) return;

        let filtered = this.articles.filter(article => {
            const matchesQuery = !query || 
                article.title.toLowerCase().includes(query) || 
                article.description.toLowerCase().includes(query);

            const matched = this.matchArticleWithPortfolio(article);
            const matchesFilter = (this.activeFilter === 'all') || (this.activeFilter === 'portfolio' && matched !== null);

            return matchesQuery && matchesFilter;
        });

        if (filtered.length === 0) {
            grid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align:center; padding: 40px; color:var(--text-muted); background:var(--bg-card); border-radius:12px; border:1px solid var(--border-color);">
                    <p style="font-size: 15px; font-weight:600;">Aucun article ne correspond à vos critères.</p>
                    <p style="font-size: 13px; margin-top: 6px;">Essayez avec un autre mot-clé ou sélectionnez "Tous les flux".</p>
                </div>
            `;
            return;
        }

        grid.innerHTML = filtered.map(item => {
            const matched = this.matchArticleWithPortfolio(item);
            const dateDisplay = formatTimeAgo(item.pubDate);
            return `
                <a href="${item.link}" target="_blank" rel="noopener noreferrer" class="news-full-card">
                    <div>
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 8px;">
                            <span style="font-size: 11px; font-weight:700; color:var(--brand-primary); text-transform:uppercase;">${item.source}</span>
                            <span style="font-size: 11.5px; color:var(--text-muted);">${dateDisplay}</span>
                        </div>
                        <h3 style="font-size: 14.5px; font-weight:700; color:var(--text-primary); margin-bottom: 8px; line-height: 1.4;">${item.title}</h3>
                        <p style="font-size: 13px; color:var(--text-secondary); line-height: 1.5;">${item.description}</p>
                    </div>
                    ${matched ? `<div style="display:flex;"><span class="news-ticker-tag">★ Lié à ${matched}</span></div>` : ''}
                </a>
            `;
        }).join('');
    }
};

function formatTimeAgo(isoString) {
    try {
        const date = new Date(isoString);
        const now = new Date();
        const diffMs = now - date;
        const diffMin = Math.floor(diffMs / 60000);
        const diffHrs = Math.floor(diffMs / 3600000);

        if (diffMin < 2) return "À l'instant";
        if (diffMin < 60) return `Il y a ${diffMin} min`;
        if (diffHrs < 24) return `Il y a ${diffHrs} h`;
        return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    } catch (e) {
        return "Récemment";
    }
}
