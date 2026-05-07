# 🤖 Intégration Machine Learning — Récapitulatif Complet

> **Session** : 2026-05-07  
> **Objectif** : Intégrer les modèles ML du notebook `untitled9.py` dans la plateforme AlzCare (Angular + FastAPI)

---

## 📌 Contexte initial

Tu disposais d'un notebook Python `untitled9.py` contenant :

| Domaine | Modèles / Règles | Sortie |
|---------|-----------------|--------|
| **Feature Engineering** | Règles métier sur MMSE, Age, ADL... | `CognitiveDecline`, `FallRiskLevel`, `EventRisk` |
| **Clustering** | K-Means (K=4), DBSCAN, CAH, GMM | Segmentation patients en 4 groupes |
| **Classification** | KNN, SVM, Random Forest, Gradient Boosting | Prédiction `EventRisk` (0/1/2) |
| **Réduction** | PCA (25 composantes → 2D pour viz) | Coordonnées pour scatter plot |

**But** : exposer ces modèles via une interface dashboard dans l'application Angular.

---

## 🏗️ Architecture globale

```
┌─────────────────┐      ┌──────────────────┐      ┌─────────────────┐
│   Angular 18    │──────▶  Spring Gateway  │──────▶  ML Service    │
│   (Frontend)    │      │   (port 8080)    │      │  FastAPI:8010   │
└─────────────────┘      └──────────────────┘      └─────────────────┘
        │                                               │
        │    /api/ml/predict/event-risk                 │    .pkl
        │    /api/ml/cluster/assign                     │   (modèles)
        │    /api/ml/visualization/pca                  │
        └───────────────────────────────────────────────┘
```

**Flux de données** :
1. L'utilisateur (Admin/Doctor) remplit le formulaire patient dans Angular
2. Le `MlService` envoie les 32 features au backend via `/api/ml/...`
3. Le microservice Python charge les modèles `.pkl`, prédit, et renvoie JSON
4. Angular affiche les résultats sous forme de cartes, graphiques et tableaux

---

## ✅ Côté Backend — Microservice `ml-service/`

### Fichiers créés

| Fichier | Rôle |
|---------|------|
| `ml-service/train.py` | Génère dataset, entraîne modèles, exporte `.pkl` |
| `ml-service/main.py` | API FastAPI avec 8 endpoints REST |
| `ml-service/requirements.txt` | Dépendances Python (fastapi, scikit-learn, pandas...) |
| `ml-service/Dockerfile` | Image Docker prête à builder |
| `ml-service/models/` | Dossier de stockage des modèles sérialisés |

### Les 8 endpoints REST

| Endpoint | Méthode | Entrée | Sortie |
|----------|---------|--------|--------|
| `/health` | GET | — | `{"status":"ok"}` |
| `/predict/event-risk` | POST | `PatientFeatures` (32 champs) | `{risk, riskLabel, probabilities, model}` |
| `/predict/cognitive-decline` | POST | `PatientFeatures` | `{decline, label, mmse, thresholds}` |
| `/predict/fall-risk` | POST | `PatientFeatures` | `{score, level, factors}` |
| `/cluster/assign` | POST | `PatientFeatures` + `?algorithm=` | `{clusterId, probability, algorithm}` |
| `/cluster/analysis` | GET | `?algorithm=kmeans\|gmm` | Stats par cluster |
| `/model/metrics` | GET | — | Comparaison Accuracy, F1, etc. |
| `/model/feature-importance` | GET | `?model=random_forest\|gradient_boosting` | Top 15 features |
| `/visualization/pca` | GET | `?algorithm=kmeans\|gmm` | Points 2D pour scatter plot |

### Comment ça marche (Python)

1. **`train.py`** s'exécute une fois :
   - Charge (ou génère synthétiquement) le dataset Alzheimer
   - Applique `StandardScaler` sur les variables continues
   - Entraîne `PCA` (25 composantes), `K-Means`, `GMM`, `Random Forest`, `Gradient Boosting`
   - Sauvegarde tous les objets entraînés en `.pkl` dans `models/`
   - Exporte aussi les métriques et coordonnées PCA en `.json`/`.pkl`

2. **`main.py`** démarre le serveur FastAPI :
   - Charge tous les `.pkl` en mémoire au startup
   - Valide les requêtes avec **Pydantic**
   - Applique le scaler + PCA avant chaque prédiction
   - Retourne les résultats en JSON

> ⚠️ **Statut actuel** : Python n'est pas installé sur la machine de développement actuelle. Les `.pkl` n'ont pas encore été générés. Voir la section "Lancer le backend" plus bas.

---

## ✅ Côté Frontend — Dashboard Angular

### Modèles TypeScript (`src/app/core/models/ml.model.ts`)

Toutes les structures Python ont été traduites en interfaces TypeScript strictes :

```typescript
PatientMlFeatures          // 32 champs du formulaire
EventRiskPrediction        // risk + probabilities + model
CognitiveDeclinePrediction // decline + label + mmse
FallRiskPrediction         // score + level + factors
ClusterAssignment          // clusterId + probability
ClusterAnalysis            // totalPatients + clusters[]
ModelMetrics               // classification[] + clustering{}
FeatureImportance          // features[]
PcaVisualization           // points[] + clusters[]
```

### Service (`src/app/core/services/ml.service.ts`)

Service Angular injectable (`providedIn: 'root'`) qui :
- Appelle le backend via `HttpClient`
- Gère **2 modes** grâce à la constante `USE_MOCK` :
  - `true` (actuel) : retourne des données de démo statiques → le dashboard fonctionne sans backend
  - `false` : appelle les vrais endpoints `/api/ml/...`

### Composants Dashboard (`src/app/modules/ml/`)

| Composant | Fichiers | Onglet | Description |
|-----------|----------|--------|-------------|
| `MlDashboardComponent` | `.ts` `.html` `.scss` | — | Container principal avec barre d'onglets |
| `RiskPredictionPanelComponent` | `.ts` `.html` `.scss` | 🔮 Prédiction | **Formulaire** 32 champs groupés par catégorie (Démographie, Mode de vie, Cardiovasculaire, Cognition, Historique). Bouton "Lancer les prédictions". Affiche 4 **cartes colorées** : Risque événement (avec barres de probabilité), Déclin cognitif (4 niveaux), Risque de chute (score + facteurs), Cluster GMM |
| `ClusteringPanelComponent` | `.ts` `.html` `.scss` | 📊 Clustering | **Scatter plot** PCA 2D (ng2-charts, type `scatter`) avec points colorés par cluster. **Doughnut chart** de répartition. Tableau des statistiques par cluster (count, avgAge, avgMMSE). Toggle K-Means / GMM |
| `ModelComparisonPanelComponent` | `.ts` `.html` `.scss` | 🏆 Performance | **Tableau** comparatif 4 modèles (Accuracy, Balanced Acc, F1-Macro, F1-Weighted) avec ⭐ sur le meilleur. **Radar chart** comparant les métriques. Cartes des scores de clustering (Silhouette, Davies-Bouldin, Calinski-Harabasz) |
| `FeatureImportancePanelComponent` | `.ts` `.html` `.scss` | 🔍 Features | **Bar chart horizontal** top 15 features (ng2-charts, type `bar`). Liste détaillée avec jauges et classement. Toggle Random Forest / Gradient Boosting |

### Design & UX

- **Tailwind CSS** utilisé partout
- **Couleurs sémantiques** : Vert (`#10b981`) = Faible, Jaune (`#f59e0b`) = Moyen, Rouge (`#ef4444`) = Élevé
- **Cards** : `bg-white rounded-xl shadow-md p-6`
- **Responsive** : grille 1 → 2 → 4 colonnes selon breakpoint
- **Graphiques** : Chart.js via `ng2-charts` (scatter, doughnut, radar, bar)

### Routes & Navigation

**Fichier modifié** : `src/app/app.routes.ts`

```typescript
{ path: 'admin/ml',  loadComponent: () => import('./modules/ml/ml-dashboard.component') }
{ path: 'doctor/ml', loadComponent: () => import('./modules/ml/ml-dashboard.component') }
```

**Fichier modifié** : `src/app/shared/components/navbar.component.ts`

- Sidebar **Admin** → ajout de "🤖 ML Analytics"
- Sidebar **Doctor** → ajout de "🤖 ML Prediction"

### Proxy de développement

**Fichier modifié** : `proxy.conf.json`

Ajout de la règle `/api/ml` → `http://localhost:8010` pour que le `ng serve` redirige les appels ML vers le microservice Python.

---

## 🚀 Comment lancer le projet

### Prérequis

- **Backend** : Python 3.11+ avec pip
- **Frontend** : Node.js (déjà présent pour le projet Angular)

### Étape 1 — Générer les modèles ML

```bash
cd ml-service

# Créer un environnement virtuel
python -m venv venv

# Installer les dépendances
venv\Scripts\pip install -r requirements.txt

# Entraîner les modèles et exporter les .pkl
venv\Scripts\python train.py

# Vérifier que les fichiers sont créés
dir models\
# → scaler.pkl, pca.pkl, pca_2d.pkl, kmeans.pkl, gmm.pkl,
#   knn.pkl, svm.pkl, random_forest.pkl, gradient_boosting.pkl,
#   model_metrics.json, feature_importance_*.json, viz_data.pkl, cluster_analysis.pkl
```

### Étape 2 — Lancer le microservice ML

```bash
# Dans ml-service/
venv\Scripts\uvicorn main:app --host 127.0.0.1 --port 8010

# Test rapide dans un autre terminal
curl http://localhost:8010/health
# → {"status":"ok"}
```

Le Swagger UI est accessible sur `http://localhost:8010/docs`

### Étape 3 — Passer le frontend en mode API réelle

Ouvrir `src/app/core/services/ml.service.ts` et modifier :

```typescript
const USE_MOCK = false;  // au lieu de true
```

### Étape 4 — Lancer Angular

```bash
npx ng serve
```

Naviguer vers :
- **Admin** : `http://localhost:4200/admin/ml`
- **Doctor** : `http://localhost:4200/doctor/ml`

---

## 📊 Aperçu visuel du dashboard

```
┌──────────────────────────────────────────────────────────────┐
│  🤖 Intelligence Artificielle                                │
│  [🔮 Prédiction] [📊 Clustering] [🏆 Performance] [🔍 Features]│
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  🔮 ONGLET PRÉDICTION                                         │
│  ┌───────────────────────────────────────────────────────┐   │
│  │  Formulaire : Âge | Genre | BMI | MMSE | ADL | ...   │   │
│  │  [🔮 Lancer les prédictions]                          │   │
│  └───────────────────────────────────────────────────────┘   │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌───────────┐  │
│  │ ÉVÉNEMENT  │ │ COGNITIF   │ │ CHUTE      │ │ CLUSTER   │  │
│  │   MOYEN    │ │  Modéré    │ │   Élevé    │ │ Cluster 2 │  │
│  │ ▓▓▓▓░░░    │ │ MMSE: 14   │ │ Score: 6   │ │ 89% conf  │  │
│  └────────────┘ └────────────┘ └────────────┘ └───────────┘  │
│                                                               │
│  📊 ONGLET CLUSTERING                                         │
│  ┌─────────────────────────────┐  ┌───────────────────────┐  │
│  │                             │  │     [Doughnut]        │  │
│  │    [Scatter Plot PCA]       │  │   Répartition des     │  │
│  │   •  •    •  •              │  │      clusters         │  │
│  │    •   •  •    •            │  └───────────────────────┘  │
│  │  •    •    •  •             │  ┌───────────────────────┐  │
│  │                             │  │ Cluster 0 | 520 | 72y │  │
│  └─────────────────────────────┘  │ Cluster 1 | 610 | 78y │  │
│                                   └───────────────────────┘  │
│  🏆 ONGLET PERFORMANCE                                        │
│  ┌─────────────────────────────┐  ┌───────────────────────┐  │
│  │ Modèle      | Acc | F1-Macro│  │    [Radar Chart]      │  │
│  │ ⭐ Random F | 91% |  0.87   │  │  Accuracy ─┐          │  │
│  │ Gradient B  | 90% |  0.86   │  │  F1-Macro ─┼─        │  │
│  │ SVM (rbf)   | 85% |  0.79   │  │  Balanced ─┘          │  │
│  └─────────────────────────────┘  └───────────────────────┘  │
│                                                               │
│  🔍 ONGLET FEATURES                                           │
│  ┌─────────────────────────────┐  ┌───────────────────────┐  │
│  │  [Bar Chart Horizontal]     │  │ 1. MMSE        ████   │  │
│  │  MMSE ████████              │  │ 2. Functional  ███    │  │
│  │  Functional ██████          │  │ 3. ADL         ██     │  │
│  │  ADL █████                  │  │ ...                   │  │
│  └─────────────────────────────┘  └───────────────────────┘  │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

---

## 🔄 Étapes du développement (historique)

### Phase 1 — Analyse du notebook
- Lecture de `untitled9.py` pour identifier les modèles, features et targets
- Identification des 32 champs du dataset et des règles métiers (MMSE, FallRisk score...)

### Phase 2 — Backend Python
- Création de `ml-service/train.py` pour reproduire le pipeline ML du notebook
- Création de `ml-service/main.py` avec FastAPI et Pydantic
- Définition des 8 endpoints REST
- Ajout du Dockerfile pour le déploiement containerisé

### Phase 3 — Frontend Models & Service
- Traduction des structures Python en `ml.model.ts`
- Création de `ml.service.ts` avec double mode (Mock / API réelle)
- Mock data réalistes pour tester sans backend

### Phase 4 — Composants UI
- `ml-dashboard` : layout avec 4 onglets
- `risk-prediction-panel` : formulaire réactif + cartes résultats
- `clustering-panel` : scatter plot + doughnut + stats
- `model-comparison-panel` : tableau + radar chart
- `feature-importance-panel` : bar chart + liste

### Phase 5 — Intégration
- Ajout des routes `/admin/ml` et `/doctor/ml`
- Ajout des liens dans la navbar
- Configuration du proxy `/api/ml`
- Validation du build Angular (`ng build` → ✅ succeeded)

---

## 📁 Liste complète des fichiers créés / modifiés

### ✅ Fichiers créés

```
ml-service/
├── train.py
├── main.py
├── requirements.txt
├── Dockerfile
├── data/              # (généré par train.py)
│   └── alzheimers_disease_data.csv
└── models/            # (généré par train.py)
    ├── scaler.pkl
    ├── pca.pkl
    ├── pca_2d.pkl
    ├── kmeans.pkl
    ├── gmm.pkl
    ├── knn.pkl
    ├── svm.pkl
    ├── random_forest.pkl
    ├── gradient_boosting.pkl
    ├── feature_columns.pkl
    ├── viz_data.pkl
    ├── cluster_analysis.pkl
    ├── model_metrics.json
    ├── feature_importance_random_forest.json
    └── feature_importance_gradient_boosting.json

src/app/core/models/
└── ml.model.ts

src/app/core/services/
└── ml.service.ts

src/app/modules/ml/
├── ml-dashboard.component.ts
├── ml-dashboard.component.html
├── ml-dashboard.component.scss
├── risk-prediction-panel/
│   ├── risk-prediction-panel.component.ts
│   ├── risk-prediction-panel.component.html
│   └── risk-prediction-panel.component.scss
├── clustering-panel/
│   ├── clustering-panel.component.ts
│   ├── clustering-panel.component.html
│   └── clustering-panel.component.scss
├── model-comparison-panel/
│   ├── model-comparison-panel.component.ts
│   ├── model-comparison-panel.component.html
│   └── model-comparison-panel.component.scss
└── feature-importance-panel/
    ├── feature-importance-panel.component.ts
    ├── feature-importance-panel.component.html
    └── feature-importance-panel.component.scss
```

### ✏️ Fichiers modifiés

```
proxy.conf.json                         # Ajout /api/ml → localhost:8010
src/app/app.routes.ts                   # Routes /admin/ml et /doctor/ml
src/app/shared/components/navbar.component.ts  # Liens sidebar Admin/Doctor
```

---

## 🔧 Prochaines étapes possibles

| # | Tâche | Description |
|---|-------|-------------|
| 1 | **Entraîner les modèles** | Lancer `train.py` pour générer les `.pkl` |
| 2 | **Passer en mode réel** | `USE_MOCK = false` dans `ml.service.ts` |
| 3 | **Pré-remplissage patient** | Connecter le dropdown Patient au `PatientService` existant pour auto-remplir le formulaire |
| 4 | **Export PDF** | Ajouter un bouton "Exporter le rapport" avec les prédictions |
| 5 | **Docker Compose** | Ajouter `ml-service` au `docker-compose.yml` du projet backend |
| 6 | **Tests E2E** | Tester l'intégration complète frontend → gateway → ml-service |

---

*Document créé par l'assistant AI — Session 2026-05-07*
