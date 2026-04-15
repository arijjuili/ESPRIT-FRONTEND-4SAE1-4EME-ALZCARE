export type HabitType = 'MORNING' | 'EVENING' | 'ACTIVITY';
export type AutonomyMode = 'INDEPENDENT' | 'ASSISTED' | 'DEPENDENT';
export type AutonomyAssessmentLevel = 'INDEPENDENT' | 'ASSISTED' | 'DEPENDENT';
export type AutonomyAssessmentStatus = 'DRAFT' | 'PENDING_DOCTOR' | 'APPROVED' | 'REJECTED';

export interface HabitTask {
  id: number;
  habitId: number;
  title: string;
  description: string;
  orderIndex: number;
  isCritical: boolean;
  autonomyMode: AutonomyMode;
}

export interface HabitTaskRequest {
  habitId: number;
  title: string;
  description: string;
  orderIndex: number;
  critical: boolean;
  autonomyMode: AutonomyMode;
}

export interface Habit {
  id: number;
  name: string;
  type: HabitType;
  targetTime: string;
  active: boolean;
  tasks: HabitTask[];
}

export interface HabitRequest {
  name: string;
  type: HabitType;
  targetTime: string;
  active: boolean;
}

export interface AssignHabitRequest {
  habitId: number;
}

export interface DailyCompletionTrend {
  date: string;
  count: number;
}

export interface DoctorStats {
  habitsPerPatient: Record<string, number>;
  tasksByAutonomyMode: Record<string, number>;
  tasksByCriticality: Record<string, number>;
  completionTrend: DailyCompletionTrend[];
}

export interface AutonomyProfile {
  patientId: string;
  mobilityLevel: AutonomyAssessmentLevel;
  hygieneLevel: AutonomyAssessmentLevel;
  medicationLevel: AutonomyAssessmentLevel;
  decisionMakingLevel: AutonomyAssessmentLevel;
  updatedBy: string;
  updatedAt: string;
}

export interface AutonomySuggestion {
  id: number;
  patientId: string;
  sourceSummary?: string;
  mobilityLevel: AutonomyAssessmentLevel;
  hygieneLevel: AutonomyAssessmentLevel;
  medicationLevel: AutonomyAssessmentLevel;
  decisionMakingLevel: AutonomyAssessmentLevel;
  mobilityReason?: string;
  hygieneReason?: string;
  medicationReason?: string;
  decisionMakingReason?: string;
  confidenceScore?: number;
  aiSummary?: string;
  status: AutonomyAssessmentStatus;
  createdBy: string;
  createdAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
}

export interface AutonomySuggestionDecisionRequest {
  reviewNotes?: string;
  mobilityLevel?: AutonomyAssessmentLevel;
  hygieneLevel?: AutonomyAssessmentLevel;
  medicationLevel?: AutonomyAssessmentLevel;
  decisionMakingLevel?: AutonomyAssessmentLevel;
}

export interface AutonomyHistoryItem {
  id: number;
  patientId: string;
  oldMobilityLevel?: AutonomyAssessmentLevel;
  oldHygieneLevel?: AutonomyAssessmentLevel;
  oldMedicationLevel?: AutonomyAssessmentLevel;
  oldDecisionMakingLevel?: AutonomyAssessmentLevel;
  newMobilityLevel: AutonomyAssessmentLevel;
  newHygieneLevel: AutonomyAssessmentLevel;
  newMedicationLevel: AutonomyAssessmentLevel;
  newDecisionMakingLevel: AutonomyAssessmentLevel;
  changedBy: string;
  changeReason?: string;
  changedAt: string;
}
