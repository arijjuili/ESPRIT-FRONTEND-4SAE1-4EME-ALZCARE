"""
ML Microservice - AlzCare Platform
FastAPI service exposing ML models trained in untitled9.py
"""

import os
import json
import joblib
import numpy as np
import pandas as pd
from typing import List, Literal, Optional
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

app = FastAPI(
    title="AlzCare ML Service",
    description="Machine Learning microservice for patient risk prediction and clustering",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4200"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MODELS_DIR = os.path.join(os.path.dirname(__file__), "models")

# ---------------------------------------------------------------------------
# Load models & artifacts at startup
# ---------------------------------------------------------------------------
def load_artifact(name: str):
    path = os.path.join(MODELS_DIR, name)
    if not os.path.exists(path):
        raise RuntimeError(f"Missing artifact: {path}")
    return joblib.load(path)

scaler = load_artifact("scaler.pkl")
pca = load_artifact("pca.pkl")
pca_2d = load_artifact("pca_2d.pkl")
kmeans = load_artifact("kmeans.pkl")
gmm = load_artifact("gmm.pkl")
knn = load_artifact("knn.pkl")
svm = load_artifact("svm.pkl")
rf = load_artifact("random_forest.pkl")
gb = load_artifact("gradient_boosting.pkl")
feature_columns: List[str] = load_artifact("feature_columns.pkl")
viz_data = load_artifact("viz_data.pkl")
cluster_analysis = load_artifact("cluster_analysis.pkl")

with open(os.path.join(MODELS_DIR, "model_metrics.json"), "r") as f:
    model_metrics = json.load(f)

with open(os.path.join(MODELS_DIR, "feature_importance_random_forest.json"), "r") as f:
    fi_rf = json.load(f)

with open(os.path.join(MODELS_DIR, "feature_importance_gradient_boosting.json"), "r") as f:
    fi_gb = json.load(f)

# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------
class PatientFeatures(BaseModel):
    Age: float = Field(..., ge=60, le=95)
    Gender: int = Field(..., ge=0, le=1)
    BMI: float = Field(..., ge=18, le=40)
    Smoking: int = Field(..., ge=0, le=1)
    AlcoholConsumption: float = Field(..., ge=0, le=15)
    PhysicalActivity: float = Field(..., ge=0, le=10)
    DietQuality: float = Field(..., ge=0, le=10)
    SleepQuality: float = Field(..., ge=0, le=10)
    FamilyHistoryAlzheimers: int = Field(..., ge=0, le=1)
    CardiovascularDisease: int = Field(..., ge=0, le=1)
    Diabetes: int = Field(..., ge=0, le=1)
    Depression: int = Field(..., ge=0, le=1)
    HeadInjury: int = Field(..., ge=0, le=1)
    Hypertension: int = Field(..., ge=0, le=1)
    SystolicBP: float = Field(..., ge=100, le=200)
    DiastolicBP: float = Field(..., ge=60, le=120)
    CholesterolTotal: float = Field(..., ge=150, le=300)
    CholesterolLDL: float = Field(..., ge=70, le=200)
    CholesterolHDL: float = Field(..., ge=25, le=90)
    CholesterolTriglycerides: float = Field(..., ge=70, le=300)
    MMSE: float = Field(..., ge=5, le=30)
    FunctionalAssessment: float = Field(..., ge=1, le=10)
    MemoryComplaints: int = Field(..., ge=0, le=1)
    BehavioralProblems: int = Field(..., ge=0, le=1)
    ADL: float = Field(..., ge=1, le=10)
    Confusion: int = Field(..., ge=0, le=1)
    Disorientation: int = Field(..., ge=0, le=1)
    PersonalityChanges: int = Field(..., ge=0, le=1)
    DifficultyCompletingTasks: int = Field(..., ge=0, le=1)
    Forgetfulness: int = Field(..., ge=0, le=1)
    EducationLevel: int = Field(..., ge=1, le=4)
    Stroke: int = Field(..., ge=0, le=1)
    Diagnosis: int = Field(..., ge=0, le=1)


class EventRiskPredictionResponse(BaseModel):
    risk: int
    riskLabel: str
    probabilities: List[float]
    model: str
    featuresUsed: int


class CognitiveDeclineResponse(BaseModel):
    decline: int
    label: str
    mmse: float
    thresholds: dict


class FallRiskResponse(BaseModel):
    score: int
    level: str
    factors: List[str]


class ClusterAssignmentResponse(BaseModel):
    clusterId: int
    algorithm: str
    probability: float
    clusterName: str


class ClusterInfo(BaseModel):
    clusterId: int
    count: int
    percentage: float
    avgAge: float
    avgMMSE: float
    dominantRisk: str


class ClusterAnalysisResponse(BaseModel):
    algorithm: str
    totalPatients: int
    clusters: List[ClusterInfo]


class ModelMetricItem(BaseModel):
    model: str
    accuracy: float
    balanced_accuracy: float
    f1_macro: float
    f1_weighted: float


class ModelMetricsResponse(BaseModel):
    classification: List[ModelMetricItem]
    clustering: dict


class FeatureImportanceItem(BaseModel):
    feature: str
    importance: float


class FeatureImportanceResponse(BaseModel):
    model: str
    features: List[FeatureImportanceItem]


class PcaPoint(BaseModel):
    x: float
    y: float
    cluster: int
    index: int


class PcaVisualizationResponse(BaseModel):
    algorithm: str
    points: List[PcaPoint]
    clusters: List[int]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
CONTINUOUS_COLS = [
    'Age', 'BMI', 'AlcoholConsumption', 'PhysicalActivity',
    'DietQuality', 'SleepQuality', 'SystolicBP', 'DiastolicBP',
    'CholesterolTotal', 'CholesterolLDL', 'CholesterolHDL',
    'CholesterolTriglycerides', 'MMSE', 'FunctionalAssessment',
    'ADL'
]


def features_to_dataframe(features: PatientFeatures) -> pd.DataFrame:
    data = features.model_dump()
    # EventRiskScore must be present for scaler consistency but is derived
    data['EventRiskScore'] = (
        data['HeadInjury'] * 4 +
        data['CardiovascularDisease'] * 3 +
        data['Hypertension'] * 2 +
        data['Diabetes'] * 2 +
        data['Depression'] * 2 +
        (1 if data['SystolicBP'] > 140 else 0) * 2 +
        (1 if data['DiastolicBP'] > 90 else 0) * 2 +
        (1 if data['Age'] > 75 else 0) * 2 +
        (1 if data['PhysicalActivity'] < 2 else 0) * 2 +
        data['Confusion'] +
        data['Disorientation'] +
        data['BehavioralProblems']
    )
    df = pd.DataFrame([data])
    # Ensure column order matches training
    df = df[[c for c in feature_columns if c in df.columns]]
    return df


def scale_features(df: pd.DataFrame) -> pd.DataFrame:
    df_scaled = df.copy()
    cols = [c for c in CONTINUOUS_COLS if c in df_scaled.columns]
    df_scaled[cols] = scaler.transform(df_scaled[cols])
    return df_scaled


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------
@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/predict/event-risk", response_model=EventRiskPredictionResponse)
def predict_event_risk(features: PatientFeatures):
    df = features_to_dataframe(features)
    df_scaled = scale_features(df)
    X = df_scaled.values
    pred = int(rf.predict(X)[0])
    probs = rf.predict_proba(X)[0].tolist()
    labels = {0: "Faible", 1: "Moyen", 2: "Élevé"}
    return EventRiskPredictionResponse(
        risk=pred,
        riskLabel=labels.get(pred, "Inconnu"),
        probabilities=probs,
        model="Random Forest",
        featuresUsed=len(feature_columns)
    )


@app.post("/predict/cognitive-decline", response_model=CognitiveDeclineResponse)
def predict_cognitive_decline(features: PatientFeatures):
    mmse = features.MMSE
    if mmse >= 24:
        decline, label = 0, "Normal"
    elif mmse >= 18:
        decline, label = 1, "Déclin Léger"
    elif mmse >= 10:
        decline, label = 2, "Déclin Modéré"
    else:
        decline, label = 3, "Déclin Sévère"
    return CognitiveDeclineResponse(
        decline=decline,
        label=label,
        mmse=mmse,
        thresholds={"normal": 24, "mild": 18, "moderate": 10}
    )


@app.post("/predict/fall-risk", response_model=FallRiskResponse)
def predict_fall_risk(features: PatientFeatures):
    score = 0
    factors = []
    if features.Age > 75:
        score += 2; factors.append("Age > 75")
    if features.PhysicalActivity < 2:
        score += 2; factors.append("PhysicalActivity < 2")
    if features.ADL < 5:
        score += 3; factors.append("ADL < 5")
    if features.Confusion:
        score += 2; factors.append("Confusion")
    if features.Disorientation:
        score += 2; factors.append("Disorientation")

    if score <= 2:
        level = "Faible"
    elif score <= 5:
        level = "Moyen"
    else:
        level = "Élevé"

    return FallRiskResponse(score=score, level=level, factors=factors)


@app.post("/cluster/assign", response_model=ClusterAssignmentResponse)
def cluster_assign(
    features: PatientFeatures,
    algorithm: Literal["kmeans", "gmm"] = Query("gmm")
):
    df = features_to_dataframe(features)
    df_scaled = scale_features(df)
    X_pca = pca.transform(df_scaled.values)

    if algorithm == "kmeans":
        cid = int(kmeans.predict(X_pca)[0])
        prob = 1.0
    else:
        cid = int(gmm.predict(X_pca)[0])
        prob = float(np.max(gmm.predict_proba(X_pca)))

    return ClusterAssignmentResponse(
        clusterId=cid,
        algorithm=algorithm,
        probability=round(prob, 4),
        clusterName=f"Cluster {cid}"
    )


@app.get("/cluster/analysis", response_model=ClusterAnalysisResponse)
def cluster_analysis(
    algorithm: Literal["kmeans", "gmm"] = Query("kmeans")
):
    clusters = [c for c in cluster_analysis if c["algorithm"] == algorithm]
    total = sum(c["count"] for c in clusters)
    return ClusterAnalysisResponse(
        algorithm=algorithm,
        totalPatients=total,
        clusters=[ClusterInfo(**c) for c in clusters]
    )


@app.get("/model/metrics", response_model=ModelMetricsResponse)
def model_metrics_endpoint():
    return ModelMetricsResponse(**model_metrics)


@app.get("/model/feature-importance", response_model=FeatureImportanceResponse)
def feature_importance(
    model: Literal["random_forest", "gradient_boosting"] = Query("random_forest")
):
    data = fi_rf if model == "random_forest" else fi_gb
    return FeatureImportanceResponse(
        model=model,
        features=[FeatureImportanceItem(**d) for d in data[:15]]
    )


@app.get("/visualization/pca", response_model=PcaVisualizationResponse)
def visualization_pca(
    algorithm: Literal["kmeans", "gmm"] = Query("kmeans")
):
    points_2d = np.array(viz_data["points"])
    labels = np.array(viz_data[algorithm])
    pts = [
        PcaPoint(x=float(x), y=float(y), cluster=int(c), index=i)
        for i, (x, y, c) in enumerate(zip(points_2d[:, 0], points_2d[:, 1], labels))
    ]
    return PcaVisualizationResponse(
        algorithm=algorithm,
        points=pts,
        clusters=sorted(np.unique(labels).tolist())
    )


# ---------------------------------------------------------------------------
# Entrypoint
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8010, reload=True)
