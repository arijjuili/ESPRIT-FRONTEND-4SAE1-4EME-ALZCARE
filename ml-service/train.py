# -*- coding: utf-8 -*-
"""
Script d'entraînement ML pour le microservice AlzCare.
Génère un dataset synthétique (si le vrai n'est pas présent),
entraîne les modèles du notebook untitled9.py et exporte les .pkl.
"""

import os
import json
import joblib
import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler
from sklearn.decomposition import PCA
from sklearn.cluster import KMeans
from sklearn.mixture import GaussianMixture
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.neighbors import KNeighborsClassifier
from sklearn.svm import SVC
from sklearn.model_selection import train_test_split
from sklearn.metrics import (accuracy_score, balanced_accuracy_score,
                             f1_score, confusion_matrix, classification_report,
                             silhouette_score, davies_bouldin_score, calinski_harabasz_score)

np.random.seed(42)
DATA_PATH = "ml-service/data/alzheimers_disease_data.csv"
MODELS_DIR = "ml-service/models"
N_SAMPLES = 2500

def generate_synthetic_dataset(n=N_SAMPLES):
    """Génère un dataset synthétique fidèle à la structure du notebook."""
    print(f"[INFO] Génération d'un dataset synthétique de {n} patients...")
    data = {
        'PatientID': range(1, n + 1),
        'DoctorInCharge': [f"DOC-{i % 50 + 1}" for i in range(n)],
        'Age': np.random.normal(75, 8, n).clip(60, 95).round(1),
        'Gender': np.random.randint(0, 2, n),
        'BMI': np.random.normal(26, 4, n).clip(18, 40).round(1),
        'Smoking': np.random.randint(0, 2, n),
        'AlcoholConsumption': np.random.normal(5, 3, n).clip(0, 15).round(1),
        'PhysicalActivity': np.random.normal(3, 2, n).clip(0, 10).round(1),
        'DietQuality': np.random.normal(5, 2, n).clip(0, 10).round(1),
        'SleepQuality': np.random.normal(6, 2, n).clip(0, 10).round(1),
        'FamilyHistoryAlzheimers': np.random.randint(0, 2, n),
        'CardiovascularDisease': np.random.randint(0, 2, n),
        'Diabetes': np.random.randint(0, 2, n),
        'Depression': np.random.randint(0, 2, n),
        'HeadInjury': np.random.randint(0, 2, n),
        'Hypertension': np.random.randint(0, 2, n),
        'SystolicBP': np.random.normal(135, 18, n).clip(100, 200).round(1),
        'DiastolicBP': np.random.normal(82, 12, n).clip(60, 120).round(1),
        'CholesterolTotal': np.random.normal(200, 35, n).clip(150, 300).round(1),
        'CholesterolLDL': np.random.normal(120, 30, n).clip(70, 200).round(1),
        'CholesterolHDL': np.random.normal(50, 12, n).clip(25, 90).round(1),
        'CholesterolTriglycerides': np.random.normal(150, 40, n).clip(70, 300).round(1),
        'MMSE': np.random.normal(22, 5, n).clip(5, 30).round(1),
        'FunctionalAssessment': np.random.normal(5, 2, n).clip(1, 10).round(1),
        'MemoryComplaints': np.random.randint(0, 2, n),
        'BehavioralProblems': np.random.randint(0, 2, n),
        'ADL': np.random.normal(5, 2, n).clip(1, 10).round(1),
        'Confusion': np.random.randint(0, 2, n),
        'Disorientation': np.random.randint(0, 2, n),
        'PersonalityChanges': np.random.randint(0, 2, n),
        'DifficultyCompletingTasks': np.random.randint(0, 2, n),
        'Forgetfulness': np.random.randint(0, 2, n),
        'EducationLevel': np.random.randint(1, 5, n),
        'Stroke': np.random.randint(0, 2, n),
        'Diagnosis': np.random.randint(0, 2, n),
    }
    df = pd.DataFrame(data)
    df.to_csv(DATA_PATH, index=False)
    print(f"[OK] Dataset sauvegardé dans {DATA_PATH}")
    return df


def load_data():
    if os.path.exists(DATA_PATH):
        print(f"[INFO] Chargement du dataset depuis {DATA_PATH}")
        return pd.read_csv(DATA_PATH)
    return generate_synthetic_dataset()


def classify_cognitive_decline(mmse):
    if mmse >= 24:
        return 0
    elif mmse >= 18:
        return 1
    elif mmse >= 10:
        return 2
    else:
        return 3


def main():
    os.makedirs(MODELS_DIR, exist_ok=True)
    df = load_data()

    # Nettoyage
    df_clean = df.drop(columns=['PatientID', 'DoctorInCharge'], errors='ignore')

    # Feature Engineering
    df_clean['CognitiveDecline'] = df_clean['MMSE'].apply(classify_cognitive_decline)

    df_clean['FallRisk'] = (
        (df_clean['Age'] > 75).astype(int) * 2 +
        (df_clean['PhysicalActivity'] < 2).astype(int) * 2 +
        (df_clean['ADL'] < 5).astype(int) * 3 +
        df_clean['Confusion'] * 2 +
        df_clean['Disorientation'] * 2
    )
    df_clean['FallRiskLevel'] = pd.cut(df_clean['FallRisk'],
                                       bins=[-1, 2, 5, 10],
                                       labels=['Faible', 'Moyen', 'Élevé'])

    df_clean['EventRiskScore'] = (
        df_clean['HeadInjury'] * 4 +
        df_clean['CardiovascularDisease'] * 3 +
        df_clean['Hypertension'] * 2 +
        df_clean['Diabetes'] * 2 +
        df_clean['Depression'] * 2 +
        (df_clean['SystolicBP'] > 140).astype(int) * 2 +
        (df_clean['DiastolicBP'] > 90).astype(int) * 2 +
        (df_clean['Age'] > 75).astype(int) * 2 +
        (df_clean['PhysicalActivity'] < 2).astype(int) * 2 +
        df_clean['Confusion'] +
        df_clean['Disorientation'] +
        df_clean['BehavioralProblems']
    )
    df_clean['EventRisk'] = pd.cut(df_clean['EventRiskScore'],
                                   bins=[-1, 3, 8, 20],
                                   labels=[0, 1, 2]).astype(int)

    # Colonnes continues à scaler
    continuous_cols = [
        'Age', 'BMI', 'AlcoholConsumption', 'PhysicalActivity',
        'DietQuality', 'SleepQuality', 'SystolicBP', 'DiastolicBP',
        'CholesterolTotal', 'CholesterolLDL', 'CholesterolHDL',
        'CholesterolTriglycerides', 'MMSE', 'FunctionalAssessment',
        'ADL', 'EventRiskScore'
    ]
    continuous_cols = [c for c in continuous_cols if c in df_clean.columns]

    scaler = StandardScaler()
    df_clean[continuous_cols] = scaler.fit_transform(df_clean[continuous_cols])
    joblib.dump(scaler, os.path.join(MODELS_DIR, 'scaler.pkl'))

    # Features / Targets
    target_cols = ['CognitiveDecline', 'FallRisk', 'FallRiskLevel', 'EventRiskScore', 'EventRisk']
    X = df_clean.drop(columns=target_cols, errors='ignore')
    y_event = df_clean['EventRisk'].values

    # Garder uniquement les features numériques pour PCA
    X_numeric = X.select_dtypes(include=[np.number])
    feature_columns = list(X_numeric.columns)
    joblib.dump(feature_columns, os.path.join(MODELS_DIR, 'feature_columns.pkl'))

    # PCA
    pca_full = PCA()
    pca_full.fit(X_numeric)
    cumvar = np.cumsum(pca_full.explained_variance_ratio_)
    n_comp_95 = int(np.argmax(cumvar >= 0.95) + 1)
    print(f"[INFO] PCA: {n_comp_95} composantes pour 95% de variance")

    pca = PCA(n_components=n_comp_95)
    X_pca = pca.fit_transform(X_numeric)
    joblib.dump(pca, os.path.join(MODELS_DIR, 'pca.pkl'))

    pca_2d = PCA(n_components=2)
    pca_2d.fit(X_numeric)
    joblib.dump(pca_2d, os.path.join(MODELS_DIR, 'pca_2d.pkl'))

    # Clustering
    print("[INFO] Entraînement K-Means (K=4)...")
    kmeans = KMeans(n_clusters=4, random_state=42, n_init='auto')
    labels_kmeans = kmeans.fit_predict(X_pca)
    joblib.dump(kmeans, os.path.join(MODELS_DIR, 'kmeans.pkl'))

    print("[INFO] Entraînement GMM (K=4)...")
    gmm = GaussianMixture(n_components=4, random_state=42)
    gmm.fit(X_pca)
    joblib.dump(gmm, os.path.join(MODELS_DIR, 'gmm.pkl'))

    sil_kmeans = silhouette_score(X_pca, labels_kmeans)
    db_kmeans = davies_bouldin_score(X_pca, labels_kmeans)
    ch_kmeans = calinski_harabasz_score(X_pca, labels_kmeans)

    labels_gmm = gmm.predict(X_pca)
    sil_gmm = silhouette_score(X_pca, labels_gmm)
    db_gmm = davies_bouldin_score(X_pca, labels_gmm)
    ch_gmm = calinski_harabasz_score(X_pca, labels_gmm)

    # Pré-calcul PCA 2D + clusters pour visualisation
    X_2d = pca_2d.transform(X_numeric)
    viz_data = {
        'points': X_2d.tolist(),
        'kmeans': labels_kmeans.tolist(),
        'gmm': labels_gmm.tolist(),
        'gmm_probs': gmm.predict_proba(X_pca).tolist()
    }
    joblib.dump(viz_data, os.path.join(MODELS_DIR, 'viz_data.pkl'))

    # Pré-calcul cluster analysis
    cluster_analysis = []
    for algo, labels in [('kmeans', labels_kmeans), ('gmm', labels_gmm)]:
        for cid in np.unique(labels):
            mask = labels == cid
            cluster_analysis.append({
                'algorithm': algo,
                'clusterId': int(cid),
                'count': int(mask.sum()),
                'percentage': round(float(mask.sum() / len(labels) * 100), 2),
                'avgAge': round(float(df.loc[mask, 'Age'].mean()), 2),
                'avgMMSE': round(float(df.loc[mask, 'MMSE'].mean()), 2),
                'dominantRisk': str(df.loc[mask, 'EventRisk'].mode().iloc[0]) if len(df.loc[mask]) > 0 else 'N/A'
            })
    joblib.dump(cluster_analysis, os.path.join(MODELS_DIR, 'cluster_analysis.pkl'))

    # Classification
    print("[INFO] Entraînement classificateurs...")
    X_class = X_numeric.values
    X_train, X_test, y_train, y_test = train_test_split(
        X_class, y_event, test_size=0.2, random_state=42, stratify=y_event
    )

    models = {
        'knn': KNeighborsClassifier(n_neighbors=5),
        'svm': SVC(kernel='rbf', random_state=42, probability=True),
        'random_forest': RandomForestClassifier(n_estimators=100, max_depth=10, random_state=42),
        'gradient_boosting': GradientBoostingClassifier(learning_rate=0.1, n_estimators=100, random_state=42)
    }

    results = []
    for name, model in models.items():
        model.fit(X_train, y_train)
        y_pred = model.predict(X_test)
        results.append({
            'model': name,
            'accuracy': float(accuracy_score(y_test, y_pred)),
            'balanced_accuracy': float(balanced_accuracy_score(y_test, y_pred)),
            'f1_macro': float(f1_score(y_test, y_pred, average='macro')),
            'f1_weighted': float(f1_score(y_test, y_pred, average='weighted'))
        })
        joblib.dump(model, os.path.join(MODELS_DIR, f"{name}.pkl"))
        print(f"  [OK] {name} -> Accuracy={results[-1]['accuracy']:.4f}")

    # Metrics
    metrics = {
        "classification": results,
        "clustering": {
            "kmeans": {
                "silhouette": float(sil_kmeans),
                "davies_bouldin": float(db_kmeans),
                "calinski_harabasz": float(ch_kmeans)
            },
            "gmm": {
                "silhouette": float(sil_gmm),
                "davies_bouldin": float(db_gmm),
                "calinski_harabasz": float(ch_gmm)
            }
        }
    }
    with open(os.path.join(MODELS_DIR, 'model_metrics.json'), 'w') as f:
        json.dump(metrics, f, indent=2)

    # Feature importance (RF + GB)
    rf_model = joblib.load(os.path.join(MODELS_DIR, 'random_forest.pkl'))
    gb_model = joblib.load(os.path.join(MODELS_DIR, 'gradient_boosting.pkl'))
    for name, model in [('random_forest', rf_model), ('gradient_boosting', gb_model)]:
        imp = model.feature_importances_
        fi = sorted(zip(feature_columns, imp), key=lambda x: x[1], reverse=True)
        fi_data = [{'feature': f, 'importance': round(float(i), 6)} for f, i in fi]
        with open(os.path.join(MODELS_DIR, f'feature_importance_{name}.json'), 'w') as f:
            json.dump(fi_data, f, indent=2)

    print("\n[OK] Tous les modèles exportés dans ml-service/models/")
    print("     Lancer le serveur: uvicorn ml-service.main:app --reload --port 8010")


if __name__ == '__main__':
    main()
