# Current Task

> Status: ML Dashboard Frontend — ✅ COMPLETE (Mock Mode)
> Backend ML Service — ⏳ Needs Python runtime to train models

---

## ✅ Frontend ML Dashboard — Livré

### Components créés
| Component | Chemin | Description |
|-----------|--------|-------------|
| `MlDashboardComponent` | `src/app/modules/ml/ml-dashboard.component.ts` | Page principale avec 4 onglets |
| `RiskPredictionPanelComponent` | `src/app/modules/ml/risk-prediction-panel/` | Formulaire 32 features + résultats |
| `ClusteringPanelComponent` | `src/app/modules/ml/clustering-panel/` | Scatter PCA + Doughnut + stats clusters |
| `ModelComparisonPanelComponent` | `src/app/modules/ml/model-comparison-panel/` | Tableau + Radar chart métriques |
| `FeatureImportancePanelComponent` | `src/app/modules/ml/feature-importance-panel/` | Bar chart top 15 features |

### Modèles & Service
| Fichier | Description |
|---------|-------------|
| `src/app/core/models/ml.model.ts` | Interfaces TypeScript ML |
| `src/app/core/services/ml.service.ts` | Service API avec mode MOCK actif |

### Routes & Navigation
- `/admin/ml` — accessible par ADMIN
- `/doctor/ml` — accessible par DOCTOR
- Liens ajoutés dans la navbar pour les deux rôles

### Configuration
- `proxy.conf.json` — ajout de `/api/ml` → `localhost:8010`

### Build
```bash
npx ng build --configuration development
# ✅ Build succeeded
```

---

## ⏳ Backend ML Service — Prêt mais non entraîné

Le dossier `ml-service/` contient :
- `train.py` — Script d'entraînement et export `.pkl`
- `main.py` — API FastAPI avec 8 endpoints
- `requirements.txt` — Dépendances Python
- `Dockerfile` — Conteneurisation
- `models/` — Dossier vide (attend les `.pkl`)

> **⚠️ Python n'est pas installé sur cette machine.** Les modèles `.pkl` n'ont pas été générés.

### Pour lancer le backend
```bash
# 1. Installer Python 3.11+ et pip

# 2. Créer un venv et installer les dépendances
cd ml-service
python -m venv venv
venv\Scripts\pip install -r requirements.txt

# 3. Entraîner et exporter les modèles
venv\Scripts\python train.py

# 4. Lancer le service
venv\Scripts\uvicorn main:app --host 127.0.0.1 --port 8010

# 5. Tester
# curl http://localhost:8010/health
```

### Passer le frontend en mode API réelle
Dans `src/app/core/services/ml.service.ts`, changer :
```typescript
const USE_MOCK = false;
```

---

## 🚀 Tester le frontend maintenant (Mock Mode)

```bash
npx ng serve
```

Puis naviguer vers :
- `http://localhost:4200/admin/ml`
- `http://localhost:4200/doctor/ml`

Tous les graphiques et prédictions fonctionnent avec des données mock.

---

## 📋 Prochaines étapes suggérées

1. **Lancer le backend ML** sur une machine avec Python
2. **Connecter PatientService** au formulaire pour pré-remplir les features
3. **Ajouter des guards** spécifiques si nécessaire
4. **Docker Compose** — ajouter `ml-service` au `docker-compose.yml`

*Task en cours — Session 2026-05-07*
