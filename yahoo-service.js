# AG Bourse & Actualités RSS

AG_RSS_bourse est un tableau de bord financier interactif conçu pour suivre un portefeuille d’actions, analyser les performances en temps réel et synthétiser les actualités market autour des valeurs détenues.

Le projet a été conçu en HTML5, CSS3 vanilla et JavaScript ES6+, sans dépendance lourde ni framework front-end. Il s’agit d’un prototype fonctionnel / démonstrateur exploitable directement dans le navigateur.

---

## 🎯 Objectif du projet

L’application permet de :

- importer un portefeuille depuis un export CSV EasyBourse,
- visualiser les positions, performances et valorisations,
- simuler les variations de cours en temps réel,
- tracer l’évolution d’une valeur via des graphiques interactifs,
- suivre des actualités financières RSS filtrées par portefeuille,
- explorer une option d’analyse IA par valeur pour résumer les tendances du marché.

---

## 🚀 Lancement rapide

Aucune installation ni compilation n’est requise.

### Option 1 : ouvrir directement
1. Ouvrez le fichier [index.html](index.html) dans un navigateur moderne.
2. L’application se charge directement.

### Option 2 : serveur local
Si le navigateur bloque certains chargements avec le protocole local, lancez un petit serveur :

```bash
python -m http.server 8000
```

Puis ouvrez :

```text
http://localhost:8000
```

---

## 📊 Fonctionnalités principales

### 1. Portefeuille et import EasyBourse
- import d’un fichier CSV exporté depuis EasyBourse,
- lecture des positions et de leurs métriques,
- calcul des variations de valeur,
- masquage du numéro de compte pour préserver la confidentialité.

### 2. Simulation temps réel
- fluctuations dynamiques des cours,
- recalcul automatique des gains/pertes latents,
- mise à jour des valorisations et des indicateurs de performance.

### 3. Graphiques d’évolution
- visualisation d’une action sélectionnée,
- sélection de périodes : 1J, 1S, 1M, 1A,
- affichage de référence du prix de revient unitaire (PRU).

### 4. Actualités RSS liées au portefeuille
- récupération de flux financiers,
- association des articles aux titres du portefeuille,
- filtrage par portefeuille ou par recherche,
- mise en avant des nouvelles pertinentes.

### 5. Analyse IA par valeur
Le projet inclut une maquette fonctionnelle d’un widget d’analyse IA :

- sélection d’une valeur dans le portefeuille,
- résumé synthétique de l’actualité autour de cette action,
- sentiment global (positif / neutre / négatif),
- points clés et sources mentionnées,
- bouton de rafraîchissement et état de chargement.

La maquette est visible dans [preview_optionF_ia.html](preview_optionF_ia.html).

---

## 🧩 Structure du projet

- [index.html](index.html) : structure principale du dashboard
- [style.css](style.css) : design system, composants visuels et animations
- [app.js](app.js) : logique applicative, gestion du portefeuille et simulation
- [chart-manager.js](chart-manager.js) : gestion des graphiques
- [rss-parser.js](rss-parser.js) : récupération et filtrage des actualités RSS
- [yahoo-service.js](yahoo-service.js) : service de récupération de données de marché
- [preview_optionF_ia.html](preview_optionF_ia.html) : maquette de prévisualisation du module IA
- [project_spec.md](project_spec.md) : cahier des charges / spécifications
- [nouvelle specifications graphiques](nouvelle%20specifications%20graphiques) : documents visuels et évolutions de design

---

## 🛠️ État actuel

Le projet est aujourd’hui davantage qu’un simple dashboard boursier : il présente également une vision plus “produit” avec une UX pensée pour l’investisseur, des synthèses de marché et une orientation IA.

La documentation et les maquettes montrent une évolution claire vers :

- un produit financier plus premium,
- une interface plus orientée décisions et analyse,
- un module IA de lecture d’actualité par valeur.

---

## 📌 Points importants

- le projet est pensé pour fonctionner sans backend,
- les données de marché peuvent être simulées ou récupérées via services externes,
- la confidentialité des données utilisateur est respectée,
- la structure est facilement extensible pour ajouter de nouvelles fonctions.

---

## 🤝 Utilisation

Ce dépôt peut être utilisé comme :

- démonstrateur technique,
- prototype de produit financier,
- base pour un tableau de bord boursier plus complet,
- support de réflexion pour l’intégration d’un assistant IA contextuel.

Si tu veux aller plus loin, le prochain grand axe est de connecter le widget IA à une vraie API d’analyse (Gemini, OpenAI ou équivalent) et d’intégrer les données RSS plus directement dans la logique de décision du portefeuille.
