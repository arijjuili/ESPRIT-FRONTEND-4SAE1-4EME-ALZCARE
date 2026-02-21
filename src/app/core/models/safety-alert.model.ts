/**
 * Safety Alert Models
 * 
 * TypeScript interfaces matching the backend DTOs from safety-alert-engine.
 */

// ==================== ENUMS (String Literal Unions) ====================

export type BehaviorType = 
  | 'FALL' 
  | 'WANDERING' 
  | 'AGITATION' 
  | 'SLEEP_DISORDER' 
  | 'HALLUCINATION' 
  | 'CONFUSION' 
  | 'AGGRESSION' 
  | 'MEDICATION_REFUSAL' 
  | 'OTHER';

export type BehaviorSource = 'MANUAL' | 'AUTO';

export type BehaviorValidationStatus = 'PENDING' | 'CONFIRMED' | 'FALSE_ALARM';

export type BehaviorSeverity = 'ONE' | 'TWO' | 'THREE' | 'FOUR' | 'FIVE';

export type AlertSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type AlertStatus = 'ACTIVE' | 'RESOLVED';

export type ResolutionActionType = 
  | 'CHECKED_OK' 
  | 'APPOINTMENT_SCHEDULED' 
  | 'EMERGENCY_CONTACTED' 
  | 'MEDICATION_ADJUSTED' 
  | 'ENVIRONMENT_MODIFIED' 
  | 'INCIDENT_REPORT_CREATED';

export type AlertActionType = 'NOTIFIED' | 'ESCALATED' | 'ACKNOWLEDGED' | 'RESOLVED' | 'FALSE_POSITIVE';

// ==================== REQUEST DTOs ====================

export interface CreateManualBehaviorLogRequest {
  patientId: string;
  type: BehaviorType;
  severity: number; // 1-5
  timestamp?: string; // ISO datetime
  location?: string;
  description?: string;
  triggers?: string;
  witnesses?: string;
  reportedBy: string; // Required - ID of the caregiver logging the behavior
  imageUrls?: string[];
}

export interface ValidateBehaviorRequest {
  validationStatus: BehaviorValidationStatus;
  validatedBy?: string;
  validationNotes?: string;
}

export interface AcknowledgeAlertRequest {
  userId: string;
  notes?: string;
}

export interface ResolveAlertRequest {
  resolutionType: ResolutionActionType;
  resolutionNotes?: string;
  isFalsePositive: boolean;
  resolvedBy: string;
}

// ==================== RESPONSE DTOs ====================

export interface BehaviorLogResponse {
  id: string;
  patientId: string;
  type: BehaviorType;
  severity: BehaviorSeverity;
  timestamp: string;
  location?: string;
  source: BehaviorSource;
  validationStatus: BehaviorValidationStatus;
  validatedBy?: string;
  validationNotes?: string;
  validatedAt?: string;
  description?: string;
  triggers?: string;
  witnesses?: string;
  reportedBy?: string;
  deviceId?: string;
  confidenceScore?: number;
  processedForAlert: boolean;
  imageUrls: string[];
}

export interface AlertResponse {
  id: string;
  patientId: string;
  ruleCode: string;
  severity: AlertSeverity;
  status: AlertStatus;
  sourceId?: string;
  triggeredAt: string;
  escalationDeadlineAt: string;
  resolvedAt?: string;
  resolutionType?: ResolutionActionType;
  resolutionNotes?: string;
  resolvedBy?: string;
  isFalsePositive: boolean;
  currentLevel: string;
  createdAt: string;
  isEscalationOverdue: boolean;
  escalationMinutesRemaining: number;
}

export interface AlertHistoryResponse {
  id: string;
  alertId: string;
  actionType: AlertActionType;
  performedAt: string;
  performedBy?: string;
  notes?: string;
  isSystemAction: boolean;
}

export interface PagedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}
