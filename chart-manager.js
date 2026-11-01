// AG Bourse & Actualités RSS - Gestionnaire de Graphiques (chart-manager.js)

const ChartManager = {
    // Instance du graphique Chart.js
    chartInstance: null,

    // Infos sur le stock sélectionné en cours
    currentStock: null,
    currentTimeframe: '1J',
    
    // Données en cours de visualisation
    labels: [],
    dataPoints: [],

    // Restreindre la reconstruction complète lors d'une mise à jour temps réel
    isUpdatingLive: false,

    // Initialiser et tracer le graphique pour une action donnée
    renderChart(stock, timeframe) {
        this.currentStock = stock;
        this.currentTimeframe = timeframe;
        
        const canvas = document.getElementById('stock-chart');
        if (!canvas) return;

        this.showLoading(true);

        // Générer les données historiques
        const generated = this.generateHistoricalData(stock, timeframe);
        this.labels = generated.labels;
        this.dataPoints = generated.prices;

        // Détruire l'ancien graphique s'il existe
        if (this.chartInstance) {
            this.chartInstance.destroy();
        }

        // Création du graphique
        const ctx = canvas.getContext('2d');
        const color = this.dataPoints[this.dataPoints.length - 1] >= this.dataPoints[0] ? '#10b981' : '#ef4444';
        
        // Remplissage en dégradé sous la courbe
        const gradient = ctx.createLinearGradient(0, 0, 0, 300);
        gradient.addColorStop(0, color + '2b'); // 17% opacité
        gradient.addColorStop(1, color + '00'); // transparent

        // Configuration de la ligne PRU (Prix de Revient Unitaire)
        const annotations = {};
        if (stock.averagePrice && stock.quantity > 0) {
            annotations.pruLine = {
                type: 'line',
                yMin: stock.averagePrice,
                yMax: stock.averagePrice,
                borderColor: '#3b82f6',
                borderWidth: 1.5,
                borderDash: [5, 5],
                label: {
                    display: true,
                    content: 'PRU: ' + stock.averagePrice.toFixed(2) + ' €',
                    position: 'end',
                    backgroundColor: 'rgba(59, 130, 246, 0.8)',
                    color: '#ffffff',
                    font: { size: 10, weight: 'bold' }
                }
            };
        }

        const config = {
            type: 'line',
            data: {
                labels: this.labels,
                datasets: [
                    {
                        label: stock.name,
                        data: this.dataPoints,
                        borderColor: color,
                        borderWidth: 2,
                        pointRadius: timeframe === '1J' ? 0 : 3,
                        pointHoverRadius: 6,
                        pointBackgroundColor: color,
                        fill: true,
                        backgroundColor: gradient,
                        tension: 0.25
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        backgroundColor: '#151a22',
                        titleColor: '#f3f4f6',
                        bodyColor: '#9ca3af',
                        borderColor: '#222b38',
                        borderWidth: 1,
                        callbacks: {
                            label: function(context) {
                                return `Cours: ${context.parsed.y.toFixed(3)} €`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: {
                            color: '#6b7280',
                            font: { size: 10, family: 'Inter' },
                            maxTicksLimit: timeframe === '1J' ? 6 : 7
                        }
                    },
                    y: {
                        grid: { color: '#222b38' },
                        ticks: {
                            color: '#6b7280',
                            font: { size: 10, family: 'Inter' },
                            callback: function(value) {
                                return value.toFixed(2) + ' €';
                            }
                        }
                    }
                }
            }
        };

        // Ajouter l'annotation PRU si Chart.js plugin annotation est supporté
        // Sinon nous dessinons simplement une ligne de référence via les options de tracé standards de Chart.js
        if (stock.averagePrice && stock.quantity > 0) {
            // Pour garantir la robustesse sans charger d'autres scripts CDN d'annotations,
            // on ajoute une courbe de données secondaire plate pour représenter le PRU
            config.data.datasets.push({
                label: 'Mon PRU',
                data: Array(this.dataPoints.length).fill(stock.averagePrice),
                borderColor: 'rgba(59, 130, 246, 0.5)',
                borderWidth: 1,
                borderDash: [6, 4],
                pointRadius: 0,
                fill: false,
                tension: 0
            });
        }

        this.chartInstance = new Chart(ctx, config);
        this.showLoading(false);
    },

    // Pousser un nouveau prix reçu en direct (pour l'actualisation dynamique sans recharger)
    pushLivePrice(newPrice) {
        if (!this.chartInstance || !this.currentStock || this.currentTimeframe !== '1J') return;
        
        // Mettre à jour le dernier point du graphique 1J avec le nouveau cours
        const dataset = this.chartInstance.data.datasets[0];
        const ctx = this.chartInstance.ctx;
        if (dataset && dataset.data.length > 0 && ctx) {
            dataset.data[dataset.data.length - 1] = newPrice;
            
            // Recalculer si le graphique est globalement haussier ou baissier
            const color = dataset.data[dataset.data.length - 1] >= dataset.data[0] ? '#10b981' : '#ef4444';
            dataset.borderColor = color;
            dataset.pointBackgroundColor = color;
            
            // Recréer le dégradé avec la nouvelle couleur
            const gradient = ctx.createLinearGradient(0, 0, 0, 300);
            gradient.addColorStop(0, color + '2b');
            gradient.addColorStop(1, color + '00');
            dataset.backgroundColor = gradient;
            
            this.chartInstance.update('none'); // Mettre à jour sans animation lourde
        }
    },

    // Générer de fausses données historiques cohérentes
    generateHistoricalData(stock, timeframe) {
        const prices = [];
        const labels = [];
        const current = stock.currentPrice;
        
        let numPoints = 24;
        let volatility = 0.003; // Écart type de fluctuation

        if (timeframe === '1J') {
            numPoints = 24; // 24 points horaires
            volatility = 0.002;
        } else if (timeframe === '1S') {
            numPoints = 7; // 7 jours
            volatility = 0.008;
        } else if (timeframe === '1M') {
            numPoints = 30; // 30 jours
            volatility = 0.012;
        } else if (timeframe === '1A') {
            numPoints = 12; // 12 mois
            volatility = 0.035;
        }

        // Créer un chemin inverse en partant de la valeur actuelle
        let tempPrice = current;
        prices.unshift(tempPrice);
        
        for (let i = 1; i < numPoints; i++) {
            // Marche aléatoire inversée
            const step = tempPrice * volatility * (Math.random() - 0.49); // Légère tendance haussière générale
            tempPrice = tempPrice - step;
            prices.unshift(Number(tempPrice.toFixed(4)));
        }

        // Générer les étiquettes de temps adaptées
        const now = new Date();
        for (let i = numPoints - 1; i >= 0; i--) {
            if (timeframe === '1J') {
                const h = new Date(now.getTime() - i * 3600000);
                labels.push(h.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }));
            } else if (timeframe === '1S') {
                const d = new Date(now.getTime() - i * 86400000);
                labels.push(d.toLocaleDateString('fr-FR', { weekday: 'short' }));
            } else if (timeframe === '1M') {
                const d = new Date(now.getTime() - i * 86400000);
                labels.push(d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }));
            } else if (timeframe === '1A') {
                const m = new Date(now.getFullYear(), now.getMonth() - i, 1);
                labels.push(m.toLocaleDateString('fr-FR', { month: 'short' }));
            }
        }

        return { labels, prices };
    },

    // Gérer l'affichage de chargement
    showLoading(show) {
        const overlay = document.getElementById('chart-loading-overlay');
        if (overlay) {
            overlay.style.display = show ? 'flex' : 'none';
        }
    }
};
