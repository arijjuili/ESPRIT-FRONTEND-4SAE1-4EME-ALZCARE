// ==================== ENUMS ====================

export type ActivityType = 'GROUP' | 'INDIVIDUAL' | 'VIRTUAL' | 'IN_PERSON';
export type ActivityStatus = 'PUBLISHED' | 'IN_PROGRESS' | 'CANCELLED';
export type RegistrationStatus = 'PENDING' | 'CONFIRMED' | 'RECORDED' | 'CANCELLED';
export type ReminderTiming = 'H2' | 'H24' | 'H48';

// ==================== ACTIVITY ====================

export interface ActivityResponse {
  id: string;
  title: string;
  description: string;
  type: ActivityType;
  startDate: string;
  endDate: string;
  location: string;
  latitude?: number;
  longitude?: number;
  maxCapacity: number;
  registeredCount: number;
  status: ActivityStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityCreateRequest {
  title: string;
  description: string;
  type: ActivityType;
  startDate: string;
  endDate: string;
  location: string;
  latitude?: number;
  longitude?: number;
  maxCapacity: number;
}

// ==================== REGISTRATION ====================

export interface Registration {
  id: string;
  activityId: string;
  activityTitle?: string;
  patientId: string;
  caregiverId?: string;
  specialNeeds?: string;
  status: RegistrationStatus;
  createdAt?: string;
}

export interface RegistrationCreateRequest {
  activityId: string;
  patientId: string;
  caregiverId?: string;
  specialNeeds?: string;
}

export interface RegistrationStatusUpdateRequest {
  status: RegistrationStatus;
}

// ==================== REMINDER ====================

export interface ActivityReminder {
  id: string;
  activityId: string;
  activityTitle: string;
  patientId: string;
  caregiverId?: string;
  reminderDate: string;
  activityStartDate: string;
  sent: boolean;
  sentAt?: string;
  timing: ReminderTiming;
  emailSent: boolean;
}

// ==================== PATIENT INTERESTS ====================

export interface PatientInterest {
  id?: string;
  patientId: string;
  city: string;
  activityTypes: ActivityType[];
  emailNotifications: boolean;
  preferredReminderTiming: ReminderTiming;
}
