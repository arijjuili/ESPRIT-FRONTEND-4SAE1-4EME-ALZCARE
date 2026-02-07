export type UserRole = 'patient' | 'caregiver' | 'doctor' | 'admin';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
}

export interface AuthUser extends User {
  token: string;
}

export interface Patient {
  id: string;
  name: string;
  dateOfBirth: Date;
  email: string;
  phone: string;
  avatar?: string;
  condition: string;
  medicalHistory: string[];
  currentMedications: Medication[];
  emergencyContact: string;
}

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  prescribedBy: string;
}

export interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  date: Date;
  type: string;
  notes: string;
  status: 'scheduled' | 'completed' | 'cancelled';
}

export interface CareTask {
  id: string;
  patientId: string;
  title: string;
  description: string;
  dueDate: Date;
  assignedTo: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
}

export interface HealthMetric {
  id: string;
  patientId: string;
  type: string; // 'blood_pressure', 'heart_rate', 'glucose', etc.
  value: string;
  timestamp: Date;
  unit: string;
}
