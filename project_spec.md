# Spécifications du Projet : AG_RSS_bourse

Ce document décrit l'état actuel et les objectifs du projet **AG_RSS_bourse** : un tableau de bord boursier interactif, centré sur la gestion de portefeuille, les actualités financières et les synthèses IA par valeur.

---

## 1. Objectif général

**AG_RSS_bourse** est une application web monopage (SPA) développée en HTML5, CSS3 et JavaScript ES6+, sans framework lourd. Elle vise à offrir une interface financière moderne permettant de :

- visualiser un portefeuille d'actions,
- simuler des variations de cours en temps réel,
- afficher des graphiques d'historique,
- agréger des actualités RSS pertinentes,
- analyser chaque titre du portefeuille via un résumé IA synthétique.

Le projet évolue aujourd’hui vers une version plus orientée produit, avec une attention particulière à la qualité UX/UI et à l’intégration de fonctionnalités d’aide à la décision.

---

## 2. État actuel du projet

Le projet contient désormais plusieurs axes fonctionnels et visuels :

- une interface principale de dashboard financier,
- un portefeuille modélisé avec positions, PRU, valorisation et performance,
- un système de simulation de prix en direct,
- des graphiques de tendance avec sélection de période,
- un agrégateur d’actualités RSS,
- une maquette/expérience “Option F” pour un widget d’analyse IA par action,
- des fichiers d’itération visuelle et de prévisualisation de design.

Le fichier [preview_optionF_ia.html](preview_optionF_ia.html) représente une évolution spécifique du projet : il s’agit d’une maquette fonctionnelle du widget d’analyse IA, intégrée dans une interface proche du dashboard final.

---

## 3. Fonctionnalités principales

### A. Importation du portefeuille EasyBourse

- Le système doit permettre l’import d’un export CSV EasyBourse.
- Les données importées comprennent au minimum : nom de la valeur, quantité, PRU, cours d’achat, valorisation et variation.
- Le compte utilisateur ne doit pas être affiché en clair dans l’interface.
- Le numéro de compte doit être masqué ou non réaffiché.
- La logique doit préserver la confidentialité de l’utilisateur.

### B. Simulation de cours et monitoring du portefeuille

- Les valeurs du portefeuille sont affichées dans une grille ou une table structurée.
- Les cours peuvent fluctuer de manière réaliste à intervalle régulier.
- Les performances sont recalculées dynamiquement :
  - gain/perte latente,
  - variation en pourcentage,
  - valorisation totale,
  - indicateurs de performance globale.
- Les changements de prix peuvent déclencher des animations visuelles de mise en avant.

### C. Graphiques interactifs

- L’utilisateur peut sélectionner une action dans le portefeuille.
- Le système affiche son historique de prix sur plusieurs périodes :
  - 1J,
  - 1S,
  - 1M,
  - 1A.
- Le prix de revient unitaire (PRU) doit éventuellement être affiché en référence sur le graphique.
- L’interface doit rester lisible et visuellement cohérente sur desktop.

### D. Agrégation des actualités RSS

- Le tableau de bord doit récupérer des flux financiers réels ou simulés.
- Les articles doivent pouvoir être associés à des entreprises du portefeuille.
- Les nouvelles pertinentes peuvent être mises en avant visuellement.
- Un système de recherche et de filtres permet de réduire le bruit.
- Les flux peuvent être classés selon leur pertinence par rapport à la watchlist ou au portefeuille sélectionné.

### E. Analyse IA par valeur (Option F)

Cette fonctionnalité représente un axe nouveau et important du projet.

- Un widget latéral affiche une synthèse IA pour la valeur sélectionnée.
- Chaque titre du portefeuille peut avoir un résumé personnalisé.
- Le widget présente :
  - le nom et le ticker,
  - le secteur,
  - un sentiment global,
  - un résumé argumenté,
  - les points clés,
  - les sources citées.
- L’état de chargement doit être visible pendant la génération du résumé.
- Un bouton “Rafraîchir” permet de relancer l’analyse.
- La logique est conçue pour évoluer vers un vrai appel API IA (Gemini ou équivalent) à partir de données RSS et de contexte boursier.

### F. Design premium et expérience utilisateur

- L’application doit conserver un style premium inspiré des dashboards financiers modernes.
- Le design inclut :
  - palette claire ou sombre cohérente,
  - cartes, onglets, badges, chips,
  - micro-animations,
  - hiérarchie visuelle claire,
  - composants reproductibles.
- L’interface doit donner une impression robuste et “pro” sans être lourde ni inaccessible.

---

## 4. Fichiers du projet

La structure actuelle du projet est la suivante :

```text
AG_RSS_bourse/
│
├── index.html                  # Interface principale du dashboard
├── style.css                  # Styles globaux et design system
├── app.js                     # Logique de portefeuille, simulation et interactions
├── chart-manager.js           # Gestion des graphiques et périodes
├── rss-parser.js              # Récupération et filtrage des flux RSS
├── yahoo-service.js           # Service de récupération de données de marché
├── preview_optionF_ia.html    # Maquette de prévisualisation du widget IA par action
├── README.md                 # Guide de lancement et présentation du projet
├── project_spec.md           # Spécifications du projet
├── nouvelle specifications graphiques  # Documents d’itération visuelle / design
└── .vscode/                  # Configuration de l’environnement de travail
```

---

## 5. Composants clés à maintenir

### Dashboard principal
- tableau des positions,
- synthèse portefeuille,
- catégories et indicateurs de performance,
- interactivité sur sélection d’action.

### Gestion de données
- données prix simulées,
- cache local / localStorage,
- import CSV EasyBourse,
- moteur de filtrage par ticker.

### Modules de contenu
- RSS financier,
- liens entre actualités et valeurs du portefeuille,
- affichage de contenu en fonction d’un ticker actif.

### Analyse IA
- génération de résumé par action,
- sentiment positif / neutre / négatif,
- sources et points clés,
- hooks de futur intégration API externe.

---

## 6. Critères de succès

Le projet est considéré comme fonctionnel si :

1. l’utilisateur peut ouvrir l’application sans installation lourde,
2. les positions importées sont affichées correctement,
3. la simulation de cours fonctionne visuellement et dynamiquement,
4. le graphique d’une action change selon la sélection,
5. les actualités liées au portefeuille sont visibles et filtrables,
6. le widget IA affiche un résumé clair et cohérent pour chaque valeur,
7. l’interface a une cohérence visuelle premium et reste lisible.

---

## 7. Évolution prévue / prochaines étapes

Le projet a maintenant une base solide et peut évoluer selon plusieurs priorités :

- renforcer l’intégration réelle des APIs de marché,
- connecter le widget IA à un backend ou à une API Gemini,
- enrichir les règles de synthèse IA par secteur, sentiment et événements clés,
- améliorer la robustesse des flux RSS et la gestion des erreurs CORS,
- fusionner les maquettes visuelles dans la version principale du dashboard,
- finaliser une version plus “production-ready” avec structure plus modulaire et code plus découpé.

---

## 8. Conclusion

Le projet a dépassé le stade d’une simple maquette de dashboard financier. Il est désormais un prototype fonctionnel de produit avec une vraie logique de portefeuille, des données de marché simulées, des actualités pertinentes et une dimension IA visuellement crédible.

Le fichier [preview_optionF_ia.html](preview_optionF_ia.html) est un bon exemple de cette évolution : il montre que le projet n’est plus seulement un “tableau boursier”, mais un espace de décision plus intelligent, plus orienté utilisateur et plus proche d’un produit financier moderne.
