import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import {
  PatientMlFeatures,
  EventRiskPrediction,
  CognitiveDeclinePrediction,
  FallRiskPrediction,
  ClusterAssignment,
  ClusterAnalysis,
  ModelMetrics,
  FeatureImportance,
  PcaVisualization,
} from '../models/ml.model';

const USE_MOCK = true; // Passer à false quand le backend tourne
const API_BASE = '/api/ml';

@Injectable({ providedIn: 'root' })
export class MlService {
  constructor(private http: HttpClient) {}

  predictEventRisk(features: PatientMlFeatures): Observable<EventRiskPrediction> {
    if (USE_MOCK) {
      return of({
        risk: 1,
        riskLabel: 'Moyen',
        probabilities: [0.15, 0.75, 0.1],
        model: 'Random Forest',
        featuresUsed: 32,
      });
    }
    return this.http.post<EventRiskPrediction>(`${API_BASE}/predict/event-risk`, features);
  }

  predictCognitiveDecline(features: PatientMlFeatures): Observable<CognitiveDeclinePrediction> {
    if (USE_MOCK) {
      const mmse = features.MMSE;
      let decline = 0, label = 'Normal';
      if (mmse >= 24) { decline = 0; label = 'Normal'; }
      else if (mmse >= 18) { decline = 1; label = 'Déclin Léger'; }
      else if (mmse >= 10) { decline = 2; label = 'Déclin Modéré'; }
      else { decline = 3; label = 'Déclin Sévère'; }
      return of({ decline, label, mmse, thresholds: { normal: 24, mild: 18, moderate: 10 } });
    }
    return this.http.post<CognitiveDeclinePrediction>(`${API_BASE}/predict/cognitive-decline`, features);
  }

  predictFallRisk(features: PatientMlFeatures): Observable<FallRiskPrediction> {
    if (USE_MOCK) {
      let score = 0;
      const factors: string[] = [];
      if (features.Age > 75) { score += 2; factors.push('Age > 75'); }
      if (features.PhysicalActivity < 2) { score += 2; factors.push('PhysicalActivity < 2'); }
      if (features.ADL < 5) { score += 3; factors.push('ADL < 5'); }
      if (features.Confusion) { score += 2; factors.push('Confusion'); }
      if (features.Disorientation) { score += 2; factors.push('Disorientation'); }
      const level = score <= 2 ? 'Faible' : score <= 5 ? 'Moyen' : 'Élevé';
      return of({ score, level, factors });
    }
    return this.http.post<FallRiskPrediction>(`${API_BASE}/predict/fall-risk`, features);
  }

  assignCluster(features: PatientMlFeatures, algorithm: 'kmeans' | 'gmm' = 'gmm'): Observable<ClusterAssignment> {
    if (USE_MOCK) {
      return of({ clusterId: 2, algorithm, probability: 0.89, clusterName: 'Cluster 2' });
    }
    return this.http.post<ClusterAssignment>(`${API_BASE}/cluster/assign?algorithm=${algorithm}`, features);
  }

  getClusterAnalysis(algorithm: 'kmeans' | 'gmm' = 'kmeans'): Observable<ClusterAnalysis> {
    if (USE_MOCK) {
      return of({
        algorithm,
        totalPatients: 2500,
        clusters: [
          { clusterId: 0, count: 520, percentage: 20.8, avgAge: 72.3, avgMMSE: 22.1, dominantRisk: '0' },
          { clusterId: 1, count: 610, percentage: 24.4, avgAge: 78.1, avgMMSE: 18.5, dominantRisk: '1' },
          { clusterId: 2, count: 870, percentage: 34.8, avgAge: 75.4, avgMMSE: 20.2, dominantRisk: '2' },
          { clusterId: 3, count: 500, percentage: 20.0, avgAge: 80.2, avgMMSE: 15.8, dominantRisk: '1' },
        ]
      });
    }
    return this.http.get<ClusterAnalysis>(`${API_BASE}/cluster/analysis?algorithm=${algorithm}`);
  }

  getModelMetrics(): Observable<ModelMetrics> {
    if (USE_MOCK) {
      return of({
        classification: [
          { model: 'KNN (K=5)', accuracy: 0.82, balanced_accuracy: 0.79, f1_macro: 0.76, f1_weighted: 0.82 },
          { model: 'SVM (rbf)', accuracy: 0.85, balanced_accuracy: 0.82, f1_macro: 0.79, f1_weighted: 0.85 },
          { model: 'Random Forest', accuracy: 0.91, balanced_accuracy: 0.89, f1_macro: 0.87, f1_weighted: 0.91 },
          { model: 'Gradient Boosting', accuracy: 0.90, balanced_accuracy: 0.88, f1_macro: 0.86, f1_weighted: 0.90 },
        ],
        clustering: {
          kmeans: { silhouette: 0.23, davies_bouldin: 1.45, calinski_harabasz: 890 },
          gmm: { silhouette: 0.25, davies_bouldin: 1.38, calinski_harabasz: 920 },
        }
      });
    }
    return this.http.get<ModelMetrics>(`${API_BASE}/model/metrics`);
  }

  getFeatureImportance(model: 'random_forest' | 'gradient_boosting' = 'random_forest'): Observable<FeatureImportance> {
    if (USE_MOCK) {
      const features = model === 'random_forest'
        ? [
            { feature: 'MMSE', importance: 0.142 },
            { feature: 'FunctionalAssessment', importance: 0.098 },
            { feature: 'ADL', importance: 0.087 },
            { feature: 'Age', importance: 0.076 },
            { feature: 'CholesterolLDL', importance: 0.065 },
            { feature: 'SystolicBP', importance: 0.062 },
            { feature: 'BMI', importance: 0.058 },
            { feature: 'SleepQuality', importance: 0.054 },
            { feature: 'DiastolicBP', importance: 0.051 },
            { feature: 'PhysicalActivity', importance: 0.048 },
            { feature: 'CholesterolTotal', importance: 0.045 },
            { feature: 'AlcoholConsumption', importance: 0.042 },
            { feature: 'DietQuality', importance: 0.039 },
            { feature: 'CholesterolHDL', importance: 0.036 },
            { feature: 'CholesterolTriglycerides', importance: 0.033 },
          ]
        : [
            { feature: 'MMSE', importance: 0.138 },
            { feature: 'ADL', importance: 0.095 },
            { feature: 'FunctionalAssessment', importance: 0.091 },
            { feature: 'Age', importance: 0.072 },
            { feature: 'SystolicBP', importance: 0.068 },
            { feature: 'CholesterolLDL', importance: 0.063 },
            { feature: 'BMI', importance: 0.059 },
            { feature: 'SleepQuality', importance: 0.056 },
            { feature: 'DiastolicBP', importance: 0.053 },
            { feature: 'PhysicalActivity', importance: 0.049 },
            { feature: 'CholesterolTotal', importance: 0.046 },
            { feature: 'AlcoholConsumption', importance: 0.043 },
            { feature: 'DietQuality', importance: 0.040 },
            { feature: 'CholesterolHDL', importance: 0.037 },
            { feature: 'CholesterolTriglycerides', importance: 0.034 },
          ];
      return of({ model, features });
    }
    return this.http.get<FeatureImportance>(`${API_BASE}/model/feature-importance?model=${model}`);
  }

  getPcaVisualization(algorithm: 'kmeans' | 'gmm' = 'kmeans'): Observable<PcaVisualization> {
    if (USE_MOCK) {
      const clusters = algorithm === 'kmeans' ? [0, 1, 2, 3] : [0, 1, 2, 3];
      const points: { x: number; y: number; cluster: number; index: number }[] = [];
      for (let i = 0; i < 500; i++) {
        const cluster = i % 4;
        const x = cluster === 0 ? -2 + Math.random() * 2 : cluster === 1 ? 1 + Math.random() * 2 : cluster === 2 ? -1 + Math.random() * 2 : 2 + Math.random() * 2;
        const y = cluster === 0 ? 1 + Math.random() * 2 : cluster === 1 ? -2 + Math.random() * 2 : cluster === 2 ? 2 + Math.random() * 2 : -1 + Math.random() * 2;
        points.push({ x: parseFloat(x.toFixed(2)), y: parseFloat(y.toFixed(2)), cluster, index: i });
      }
      return of({ algorithm, points, clusters });
    }
    return this.http.get<PcaVisualization>(`${API_BASE}/visualization/pca?algorithm=${algorithm}`);
  }
}
