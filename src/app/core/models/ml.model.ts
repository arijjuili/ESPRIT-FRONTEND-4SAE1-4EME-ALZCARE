export interface PatientMlFeatures {
  Age: number;
  Gender: number;
  BMI: number;
  Smoking: number;
  AlcoholConsumption: number;
  PhysicalActivity: number;
  DietQuality: number;
  SleepQuality: number;
  FamilyHistoryAlzheimers: number;
  CardiovascularDisease: number;
  Diabetes: number;
  Depression: number;
  HeadInjury: number;
  Hypertension: number;
  SystolicBP: number;
  DiastolicBP: number;
  CholesterolTotal: number;
  CholesterolLDL: number;
  CholesterolHDL: number;
  CholesterolTriglycerides: number;
  MMSE: number;
  FunctionalAssessment: number;
  MemoryComplaints: number;
  BehavioralProblems: number;
  ADL: number;
  Confusion: number;
  Disorientation: number;
  PersonalityChanges: number;
  DifficultyCompletingTasks: number;
  Forgetfulness: number;
  EducationLevel: number;
  Stroke: number;
  Diagnosis: number;
}

export interface EventRiskPrediction {
  risk: number;
  riskLabel: string;
  probabilities: number[];
  model: string;
  featuresUsed: number;
}

export interface CognitiveDeclinePrediction {
  decline: number;
  label: string;
  mmse: number;
  thresholds: { normal: number; mild: number; moderate: number };
}

export interface FallRiskPrediction {
  score: number;
  level: string;
  factors: string[];
}

export interface ClusterAssignment {
  clusterId: number;
  algorithm: string;
  probability: number;
  clusterName: string;
}

export interface ClusterInfo {
  clusterId: number;
  count: number;
  percentage: number;
  avgAge: number;
  avgMMSE: number;
  dominantRisk: string;
}

export interface ClusterAnalysis {
  algorithm: string;
  totalPatients: number;
  clusters: ClusterInfo[];
}

export interface ModelMetric {
  model: string;
  accuracy: number;
  balanced_accuracy: number;
  f1_macro: number;
  f1_weighted: number;
}

export interface ModelMetrics {
  classification: ModelMetric[];
  clustering: {
    kmeans: { silhouette: number; davies_bouldin: number; calinski_harabasz: number };
    gmm: { silhouette: number; davies_bouldin: number; calinski_harabasz: number };
  };
}

export interface FeatureImportanceItem {
  feature: string;
  importance: number;
}

export interface FeatureImportance {
  model: string;
  features: FeatureImportanceItem[];
}

export interface PcaPoint {
  x: number;
  y: number;
  cluster: number;
  index: number;
}

export interface PcaVisualization {
  algorithm: string;
  points: PcaPoint[];
  clusters: number[];
}

export interface Recommendation {
  category: 'SÉCURITÉ' | 'COGNITION' | 'SOCIAL' | 'MÉDICAL' | 'ACTIVITÉ PHYSIQUE';
  title: string;
  description: string;
  priority: 'HAUTE' | 'MOYENNE' | 'BASSE';
  icon: string;
  reason: string;
}

export interface RecommendationsResponse {
  rulesBased: Recommendation[];
  clusterBased: Recommendation[];
  patientProfile: string;
  clusterProfile: string;
}
