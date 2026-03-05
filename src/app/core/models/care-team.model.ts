// ==========================================
// Care Team Enums
// ==========================================

/** Role of a caregiver in the care team */
export enum CaregiverRole {
  /** Main caregiver with full access */
  PRIMARY = 'PRIMARY',
  /** Family member with limited access */
  FAMILY = 'FAMILY',
  /** Emergency contact only */
  EMERGENCY = 'EMERGENCY'
}

/** Status of a caregiver assignment */
export enum AssignmentStatus {
  /** Invitation sent, awaiting acceptance */
  PENDING = 'PENDING',
  /** Assignment is active */
  ACTIVE = 'ACTIVE',
  /** Access has been revoked */
  REVOKED = 'REVOKED'
}

/** Status of a doctor assignment */
export enum DoctorAssignmentStatus {
  /** Doctor is actively treating patient */
  ACTIVE = 'ACTIVE',
  /** Assignment has been deactivated */
  INACTIVE = 'INACTIVE'
}

/** Priority level for checklist items */
export enum ChecklistPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  /** High priority requiring immediate attention */
  HIGH = 'HIGH'
}

/** Status of a checklist item */
export enum ChecklistStatus {
  /** Item created but not yet assigned */
  PENDING = 'PENDING',
  /** Assigned to a caregiver */
  ASSIGNED = 'ASSIGNED',
  /** Task has been completed */
  COMPLETED = 'COMPLETED'
}

/** Category of a checklist item */
export enum ChecklistCategory {
  MEDICATION = 'MEDICATION',
  INCIDENT = 'INCIDENT',
  COGNITIVE_TEST = 'COGNITIVE_TEST',
  GENERAL = 'GENERAL'
}

/** Completion status of a checklist */
export enum ChecklistCompletionStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED'
}

// ==========================================
// Care Team Interfaces
// ==========================================

/** Caregiver assignment linking a caregiver to a patient */
export interface CaregiverAssignment {
  /** Primary key (UUID) */
  id: string;
  /** Reference to caregiver profile (UUID) */
  caregiverId: string;
  /** Reference to patient profile (UUID) */
  patientId: string;
  /** PRIMARY, FAMILY, or EMERGENCY */
  role: CaregiverRole;
  /** PENDING, ACTIVE, or REVOKED */
  status: AssignmentStatus;
  /** ISO datetime */
  assignedAt: string;
  /** ISO datetime (if applicable) */
  revokedAt?: string;
  /** Secure token for invitation flow */
  inviteToken?: string;
  /** Token expiration timestamp */
  inviteExpiresAt?: string;
  /** When invite was accepted */
  inviteAcceptedAt?: string;
  /** Start of unavailability period */
  unavailableFrom?: string;
  /** End of unavailability period */
  unavailableTo?: string;
  /** Reason for temporary unavailability */
  unavailabilityReason?: string;
  // Extended fields for UI display (populated from identity service)
  caregiverFirstName?: string;
  caregiverLastName?: string;
  patientFirstName?: string;
  patientLastName?: string;
}

/** Doctor assignment linking a doctor to a patient */
export interface DoctorAssignment {
  /** Primary key (UUID) */
  id: string;
  /** Reference to doctor profile (UUID) */
  doctorId: string;
  /** Reference to patient profile (UUID) */
  patientId: string;
  /** User ID who created the assignment (UUID) */
  createdBy: string;
  /** ACTIVE or INACTIVE */
  status: DoctorAssignmentStatus;
  /** ISO datetime */
  assignedAt: string;
  /** Additional notes about the assignment */
  notes?: string;
  // Extended fields for UI display
  doctorFirstName?: string;
  doctorLastName?: string;
  patientFirstName?: string;
  patientLastName?: string;
}

/** Checklist item created by doctors for patient care tasks */
export interface ChecklistItem {
  /** Primary key (UUID) */
  id: string;
  /** Reference to doctor who created (UUID) */
  doctorId: string;
  /** Reference to patient (UUID) */
  patientId: string;
  /** Date for which item is scheduled (YYYY-MM-DD) */
  date: string;
  /** Display order */
  itemOrder: number;
  /** Task description */
  description: string;
  /** LOW, MEDIUM, or HIGH */
  priority: ChecklistPriority;
  /** PENDING, ASSIGNED, or COMPLETED */
  status: ChecklistStatus;
  /** MEDICATION, INCIDENT, COGNITIVE_TEST, GENERAL */
  category: ChecklistCategory;
  /** Reference to assigned caregiver (UUID) */
  assignedCaregiverId?: string;
  /** Reference to user who completed (UUID) */
  completedBy?: string;
  /** Completion timestamp */
  completedAt?: string;
  /** Reference to source axis/event */
  sourceAxisReference?: string;
  /** When checklist was generated */
  checklistGeneratedAt?: string;
  checklistStatus: ChecklistCompletionStatus;
  // Extended fields for UI display
  doctorFirstName?: string;
  doctorLastName?: string;
  caregiverFirstName?: string;
  caregiverLastName?: string;
  patientFirstName?: string;
  patientLastName?: string;
}

/** Handover note for transferring care information between caregivers */
export interface CaregiverHandover {
  /** Primary key (UUID) */
  id: string;
  /** Reference to patient (UUID) */
  patientId: string;
  /** Caregiver transferring info (UUID) */
  fromCaregiverId: string;
  /** Caregiver receiving info (UUID) */
  toCaregiverId: string;
  /** Handover notes */
  notes: string;
  /** Whether handover has been acknowledged */
  acknowledged: boolean;
  /** ISO datetime */
  createdAt: string;
  /** ISO datetime */
  acknowledgedAt?: string;
  // Extended fields for UI display
  fromCaregiverFirstName?: string;
  fromCaregiverLastName?: string;
  toCaregiverFirstName?: string;
  toCaregiverLastName?: string;
  patientFirstName?: string;
  patientLastName?: string;
}

// ==========================================
// Request DTOs
// ==========================================

/** Generate caregiver invite request */
export interface GenerateCaregiverInviteRequest {
  patientId: string;
  caregiverId: string;
  role: CaregiverRole;
}

/** Accept caregiver invite request */
export interface AcceptCaregiverInviteRequest {
  token: string;
}

/** Change caregiver role request */
export interface ChangeCaregiverRoleRequest {
  role: CaregiverRole;
}

/** Mark caregiver unavailable request */
export interface MarkUnavailableRequest {
  /** ISO datetime */
  from: string;
  /** ISO datetime */
  to: string;
  reason: string;
}

/** Assign doctor to patient request */
export interface AssignDoctorRequest {
  patientId: string;
  notes?: string;
}

/** Create checklist item request */
export interface CreateChecklistItemRequest {
  doctorId: string;
  patientId: string;
  /** YYYY-MM-DD */
  date: string;
  itemOrder: number;
  description: string;
  priority: ChecklistPriority;
  category: ChecklistCategory;
}

/** Assign checklist item request */
export interface AssignChecklistItemRequest {
  caregiverId: string;
}

/** Complete checklist item request */
export interface CompleteChecklistItemRequest {
  completedBy: string;
}

/** Create handover note request */
export interface CreateHandoverRequest {
  patientId: string;
  fromCaregiverId: string;
  toCaregiverId: string;
  notes: string;
}

// ==========================================
// Response DTOs
// ==========================================

/** Invite generation response */
export interface CaregiverInviteResponse {
  assignmentId: string;
  inviteToken: string;
  /** Full URL for the invite */
  inviteUrl: string;
  /** ISO datetime */
  expiresAt: string;
}

/** Assignment count/statistics */
export interface CareTeamStats {
  totalCaregivers: number;
  totalDoctors: number;
  activeAssignments: number;
  pendingInvites: number;
}

// ==========================================
// Filter Types
// ==========================================

/** Filter options for caregiver assignments */
export interface CaregiverAssignmentFilter {
  patientId?: string;
  caregiverId?: string;
  role?: CaregiverRole;
  status?: AssignmentStatus;
  active?: boolean;
}

/** Filter options for doctor assignments */
export interface DoctorAssignmentFilter {
  doctorId?: string;
  patientId?: string;
  status?: DoctorAssignmentStatus;
  active?: boolean;
}

/** Filter options for checklist items */
export interface ChecklistFilter {
  patientId?: string;
  doctorId?: string;
  caregiverId?: string;
  assignedTo?: string;
  /** YYYY-MM-DD */
  date?: string;
  status?: ChecklistStatus;
  priority?: ChecklistPriority;
  category?: ChecklistCategory;
  completed?: boolean;
}

/** Filter options for handover notes */
export interface HandoverFilter {
  patientId?: string;
  /** Either from or to caregiver (UUID) */
  caregiverId?: string;
  fromCaregiverId?: string;
  toCaregiverId?: string;
  acknowledged?: boolean;
}
