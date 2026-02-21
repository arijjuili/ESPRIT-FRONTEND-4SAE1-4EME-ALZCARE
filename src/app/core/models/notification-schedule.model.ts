/**
 * Notification Schedule Models
 * 
 * TypeScript interfaces for the Dynamic Notification Scheduler system.
 * Matches backend API at notification-service/api/v1/schedules
 */

// ==================== ENUMS (String Literal Unions) ====================

export type ScheduleType = 'INTERVAL' | 'CRON' | 'ONE_TIME';

export type TargetRole = 'PATIENT' | 'CAREGIVER' | 'DOCTOR' | 'ALL';

export type NotificationChannel = 'IN_APP' | 'SMS' | 'EMAIL' | 'PUSH';

// ==================== NOTIFICATION SCHEDULE INTERFACE ====================

export interface NotificationSchedule {
    id: string;
    name: string;
    description?: string;
    targetRole: TargetRole;
    targetUserIds: string[];
    titleTemplate: string;
    messageTemplate: string;
    type: string; // ALERT, REMINDER, SYSTEM, EMERGENCY
    priority: string; // LOW, NORMAL, HIGH, CRITICAL
    channels: NotificationChannel[];
    scheduleType: ScheduleType;
    cronExpression?: string;
    intervalMinutes?: number;
    startDate: string;
    endDate?: string;
    timezone: string;
    active: boolean;
    createdBy?: string;
    createdAt: string;
    updatedAt: string;
    lastExecutedAt?: string;
    executionCount: number;
    nextExecutionTime?: string;
}

// ==================== REQUEST DTOs ====================

export interface CreateScheduleRequest {
    name: string;
    description?: string;
    targetRole: TargetRole;
    targetUserIds?: string[];
    titleTemplate: string;
    messageTemplate: string;
    type: string;
    priority: string;
    channels: NotificationChannel[];
    scheduleType: ScheduleType;
    cronExpression?: string;
    intervalMinutes?: number;
    startDate: string;
    endDate?: string;
    timezone: string;
    active: boolean;
}

export interface UpdateScheduleRequest {
    name?: string;
    description?: string;
    targetRole?: TargetRole;
    targetUserIds?: string[];
    titleTemplate?: string;
    messageTemplate?: string;
    type?: string;
    priority?: string;
    channels?: NotificationChannel[];
    scheduleType?: ScheduleType;
    cronExpression?: string;
    intervalMinutes?: number;
    startDate?: string;
    endDate?: string;
    timezone?: string;
    active?: boolean;
}

// ==================== RESPONSE DTOs ====================

export interface PagedScheduleResponse {
    content: NotificationSchedule[];
    totalElements: number;
    totalPages: number;
    size: number;
    number: number;
    first: boolean;
    last: boolean;
}

// ==================== UI HELPERS ====================

export const SCHEDULE_TYPE_LABELS: Record<ScheduleType, string> = {
    INTERVAL: 'Recurring (Every X minutes)',
    CRON: 'Cron Expression',
    ONE_TIME: 'One-Time Execution'
};

export const SCHEDULE_TYPE_ICONS: Record<ScheduleType, string> = {
    INTERVAL: '🔄',
    CRON: '⏰',
    ONE_TIME: '📅'
};

export const TARGET_ROLE_LABELS: Record<TargetRole, string> = {
    PATIENT: 'Patients',
    CAREGIVER: 'Caregivers',
    DOCTOR: 'Doctors',
    ALL: 'All Users'
};

export const TARGET_ROLE_ICONS: Record<TargetRole, string> = {
    PATIENT: '🧑‍🦳',
    CAREGIVER: '👨‍⚕️',
    DOCTOR: '👨‍⚕️',
    ALL: '👥'
};

export const CHANNEL_LABELS: Record<NotificationChannel, string> = {
    IN_APP: 'In-App',
    SMS: 'SMS',
    EMAIL: 'Email',
    PUSH: 'Push Notification'
};

export const CHANNEL_ICONS: Record<NotificationChannel, string> = {
    IN_APP: '📱',
    SMS: '💬',
    EMAIL: '📧',
    PUSH: '🔔'
};

export const TEMPLATE_VARIABLES = [
    { variable: '{{userName}}', description: 'Full name of the user' },
    { variable: '{{firstName}}', description: 'First name only' },
    { variable: '{{currentDate}}', description: 'Current date' },
    { variable: '{{currentTime}}', description: 'Current time' }
];

export const COMMON_CRON_EXPRESSIONS = [
    { label: 'Every day at 9 AM', expression: '0 0 9 * * *' },
    { label: 'Every day at 6 PM', expression: '0 0 18 * * *' },
    { label: 'Every Monday at 10 AM', expression: '0 0 10 * * MON' },
    { label: 'Every hour', expression: '0 0 * * * *' },
    { label: 'Every 30 minutes', expression: '0 */30 * * * *' }
];

export const TIMEZONES = [
    'UTC',
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'Europe/London',
    'Europe/Paris',
    'Asia/Tokyo',
    'Australia/Sydney'
];
