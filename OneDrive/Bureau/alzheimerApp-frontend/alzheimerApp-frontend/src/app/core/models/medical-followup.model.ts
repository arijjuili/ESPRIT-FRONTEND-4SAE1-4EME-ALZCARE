/**
 * Medical Follow-up Microservice Models
 * 
 * These models correspond to the medical-followup-ms backend entities
 * for managing appointments and medication plans.
 */

// ==================== ENUMS ====================

export enum AppointmentStatus {
  REQUESTED = 'REQUESTED',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  CONFIRMED = 'CONFIRMED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export enum AppointmentType {
  ROUTINE = 'ROUTINE',
  FOLLOW_UP = 'FOLLOW_UP',
  COGNITIVE_TEST = 'COGNITIVE_TEST',
  EMERGENCY = 'EMERGENCY'
}

export enum AppointmentPriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export enum AppointmentMode {
  ONSITE = 'ONSITE',
  ONLINE = 'ONLINE'
}

export enum AttendanceStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  NO_SHOW = 'NO_SHOW'
}

export enum OutcomeType {
  STABLE = 'STABLE',
  FOLLOW_UP_NEEDED = 'FOLLOW_UP_NEEDED',
  URGENT_FOLLOW_UP = 'URGENT_FOLLOW_UP'
}

export enum ValidatorRole {
  PATIENT = 'PATIENT',
  CAREGIVER = 'CAREGIVER',
  BOTH = 'BOTH',
  SYSTEM = 'SYSTEM',
  DOCTOR = 'DOCTOR'
}

export enum PlanStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  STOPPED = 'STOPPED',
  COMPLETED = 'COMPLETED'
}

export enum FrequencyType {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  CUSTOM = 'CUSTOM'
}

export enum IntakeStatus {
  PENDING = 'PENDING',
  TAKEN = 'TAKEN',
  DELAYED = 'DELAYED',
  MISSED = 'MISSED',
  REFUSED = 'REFUSED'
}

export enum PatientReportedStatus {
  TAKEN_OK = 'TAKEN_OK',
  TAKEN_WITH_SIDE_EFFECTS = 'TAKEN_WITH_SIDE_EFFECTS',
  FORGOT = 'FORGOT',
  REFUSED = 'REFUSED',
  UNSURE = 'UNSURE',
  UNAVAILABLE = 'UNAVAILABLE'
}

export enum MedicationAutonomyLevel {
  INDEPENDENT = 'INDEPENDENT',
  ASSISTED = 'ASSISTED',
  DEPENDENT = 'DEPENDENT'
}

export enum RiskLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH'
}

// ==================== APPOINTMENT INTERFACES ====================

export interface Appointment {
  id: number;
  patientId: string;
  doctorId: number;
  caregiverId?: number;
  type: AppointmentType;
  priority: AppointmentPriority;
  mode: AppointmentMode;
  status: AppointmentStatus;
  startAt: string; // ISO datetime
  endAt: string; // ISO datetime
  confirmedByRole?: ValidatorRole;
  attendanceStatus?: AttendanceStatus;
  outcomeType?: OutcomeType;
  meetingUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppointmentCreateRequest {
  patientId: string;
  doctorId: string;
  caregiverId?: string;
  type: AppointmentType;
  priority: AppointmentPriority;
  mode: AppointmentMode;
  startAt: string;
  endAt: string;
  status?: AppointmentStatus;
  meetingUrl?: string;
}

export interface AppointmentUpdateRequest {
  type?: AppointmentType;
  priority?: AppointmentPriority;
  mode?: AppointmentMode;
  startAt?: string;
  endAt?: string;
  attendanceStatus?: AttendanceStatus;
  outcomeType?: OutcomeType;
  meetingUrl?: string;
}

export interface AppointmentStatusChangeRequest {
  status: AppointmentStatus;
}

export interface AppointmentQueryParams {
  doctorId?: string;
  patientId?: string;
  caregiverId?: string;
  from: string; // ISO datetime
  to: string; // ISO datetime
}

// ==================== MEDICATION INTERFACES ====================

export interface MedicationPlan {
  id: number;
  patientId: string;
  doctorId: number;
  title: string;
  notes?: string;
  startDate: string; // ISO date
  endDate?: string;
  autonomyLevel: MedicationAutonomyLevel;
  status: PlanStatus;
  version: number;
  lastRiskLevel?: RiskLevel;
  lastRiskReason?: string;
  lastRiskComputedAt?: string;
  createdAt: string;
  updatedAt: string;
  items?: MedicationItem[];
}

export interface MedicationPlanCreateRequest {
  patientId: string;
  doctorId: string;
  title: string;
  notes?: string;
  startDate: string;
  endDate?: string;
  autonomyLevel: MedicationAutonomyLevel;
  status: PlanStatus;
  version?: number;
  lastRiskLevel?: RiskLevel;
  lastRiskReason?: string;
}

export interface MedicationPlanUpdateRequest {
  title?: string;
  notes?: string;
  startDate?: string;
  endDate?: string;
  autonomyLevel?: MedicationAutonomyLevel;
  status?: PlanStatus;
  lastRiskLevel?: RiskLevel;
  lastRiskReason?: string;
}

export interface MedicationItem {
  id: number;
  planId: number;
  name: string;
  dosage: string;
  frequency: FrequencyType;
  timesOfDay: string; // CSV like "MORNING,EVENING"
  isHighRisk: boolean;
  stockQuantity: number;
  lowThreshold: number;
  expirationDate?: string;
  createdAt: string;
  updatedAt: string;
  intakes?: MedicationIntake[];
}

export interface MedicationItemCreateRequest {
  name: string;
  dosage: string;
  frequency: FrequencyType;
  timesOfDay: string;
  isHighRisk: boolean;
  stockQuantity: number;
  lowThreshold: number;
  expirationDate?: string;
}

export interface MedicationItemUpdateRequest {
  name?: string;
  dosage?: string;
  frequency?: FrequencyType;
  timesOfDay?: string;
  isHighRisk?: boolean;
  stockQuantity?: number;
  lowThreshold?: number;
  expirationDate?: string;
}

export interface MedicationIntake {
  id?: number;
  itemId?: number;
  scheduledAt: string;
  status: IntakeStatus;
  patientId?: string;
  confirmedByUserId?: string;
  confirmedByRole?: ValidatorRole;
  confirmedAt?: string;
  patientReportedStatus?: PatientReportedStatus;
  notes?: string;
  reminderSent?: boolean;
  reminderSentAt?: string;
  createdAt?: string;
  updatedAt?: string;
  item?: MedicationItem;
}

export interface MedicationIntakeCreateRequest {
  scheduledAt: string;
  status: IntakeStatus;
  confirmedByRole?: ValidatorRole;
}

export interface MedicationIntakeUpdateRequest {
  scheduledAt?: string;
  status?: IntakeStatus;
  confirmedByUserId?: string;
  confirmedByRole?: ValidatorRole;
  confirmedAt?: string;
  patientReportedStatus?: PatientReportedStatus;
  notes?: string;
}

// ==================== DASHBOARD STATS ====================

export interface MedicationDashboardStats {
  totalPlans: number;
  activePlans: number;
  totalItems?: number;
  highRiskItems?: number;
  pendingIntakes?: number;
  pendingIntakesToday?: number;
  takenIntakes?: number;
  missedIntakes?: number;
  adherenceRate?: number;
}

export interface AppointmentDashboardStats {
  totalAppointments: number;
  upcomingAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
}
