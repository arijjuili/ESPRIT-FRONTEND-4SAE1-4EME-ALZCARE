export type HabitType = 'MORNING' | 'EVENING' | 'ACTIVITY';
export type AutonomyMode = 'INDEPENDENT' | 'ASSISTED' | 'DEPENDENT';

export interface Habit {
  id: number;
  name: string;
  type: HabitType;
  targetTime: string;
  active: boolean;
  createdAt: string;
  ownerId?: string;
  tasks: HabitTask[];
}

export interface HabitTask {
  id: number;
  title: string;
  description: string;
  orderIndex: number;
  isCritical: boolean;
  autonomyMode: AutonomyMode;
  habitId?: number;
}

export interface HabitTaskRequest {
  habitId: number;
  title: string;
  description: string;
  orderIndex: number;
  critical: boolean;
  autonomyMode: AutonomyMode;
}

export interface HabitAssignmentRequest {
  habitId: number;
}

export interface HabitAssignment {
  id?: number | string;
  habitId: number;
  patientId: string;
  doctorId: string;
  assignedAt?: string;
}

export interface CreateHabitRequest {
  name: string;
  type: HabitType;
  targetTime: string;
  active?: boolean;
}

export type UpdateHabitRequest = Partial<CreateHabitRequest>;

export interface CreateHabitTaskRequest {
  title: string;
  description: string;
  orderIndex: number;
  isCritical: boolean;
  autonomyMode: AutonomyMode;
}

export type UpdateHabitTaskRequest = Partial<CreateHabitTaskRequest>;

// Legacy - kept for admin/routines and other pages that still use these
export type DailyCarePriority = 'low' | 'medium' | 'high';
export type DailyCareStatus = 'PENDING' | 'COMPLETED' | 'MISSED';

export interface DailyCareTask {
  id: string;
  patientId: string;
  title: string;
  description: string;
  dueDate: string;
  priority: DailyCarePriority;
  completed: boolean;
  status: DailyCareStatus;
  routineId?: string;
  assignedCaregiverId?: string;
  notes?: string;
}

export interface DailyRoutine {
  id: string;
  name: string;
  description: string;
  active: boolean;
  patientCount: number;
  taskCount: number;
  scheduleWindow?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface UpdateTaskStatusRequest {
  completed: boolean;
  notes?: string;
}

export interface HabitTaskRequest {
  habitId: number;
  title: string;
  description: string;
  orderIndex: number;
  critical: boolean;
  autonomyMode: AutonomyMode;
}
