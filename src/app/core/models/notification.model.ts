/**
 * Notification Models
 * 
 * TypeScript interfaces for the notification system.
 */

// ==================== ENUMS (String Literal Unions) ====================

export type NotificationType = 
  | 'ALERT' 
  | 'REMINDER' 
  | 'SYSTEM' 
  | 'MESSAGE' 
  | 'APPOINTMENT' 
  | 'BEHAVIOR';

export type NotificationPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type NotificationStatus = 'READ' | 'UNREAD';

export type NotificationFilterType = 'ALL' | 'UNREAD' | 'ALERTS' | 'REMINDERS' | 'SYSTEM';

// ==================== NOTIFICATION INTERFACE ====================

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  priority: NotificationPriority;
  status: NotificationStatus;
  title: string;
  message: string;
  icon?: string;
  actionUrl?: string;
  actionLabel?: string;
  createdAt: string;
  readAt?: string;
  metadata?: Record<string, unknown>;
}

// ==================== REQUEST DTOs ====================

export interface CreateNotificationRequest {
  userId: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  icon?: string;
  actionUrl?: string;
  actionLabel?: string;
  metadata?: Record<string, unknown>;
}

export interface MarkAsReadRequest {
  notificationIds: string[];
}

export interface NotificationFilterRequest {
  type?: NotificationType;
  status?: NotificationStatus;
  priority?: NotificationPriority;
  startDate?: string;
  endDate?: string;
  page?: number;
  size?: number;
}

// ==================== RESPONSE DTOs ====================

export interface NotificationSummaryResponse {
  totalCount: number;
  unreadCount: number;
  criticalCount: number;
  highPriorityCount: number;
}

export interface UnreadCountResponse {
  userId?: string;
  unreadCount: number;
  totalCount?: number;
}

export interface PagedNotificationResponse {
  content: Notification[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
}

// ==================== API FILTER ====================

export interface NotificationFilter {
  status?: NotificationStatus;
  type?: NotificationType;
  priority?: NotificationPriority;
  page?: number;
  size?: number;
  days?: number;
  hours?: number;
}

// ==================== UI HELPERS ====================

export interface NotificationTabFilter {
  type: NotificationFilterType;
  label: string;
  icon: string;
}

export const NOTIFICATION_FILTERS: NotificationTabFilter[] = [
  { type: 'ALL', label: 'All', icon: '📋' },
  { type: 'UNREAD', label: 'Unread', icon: '🔔' },
  { type: 'ALERTS', label: 'Alerts', icon: '🚨' },
  { type: 'REMINDERS', label: 'Reminders', icon: '⏰' },
  { type: 'SYSTEM', label: 'System', icon: '⚙️' }
];

export const NOTIFICATION_TYPE_ICONS: Record<NotificationType, string> = {
  ALERT: '🚨',
  REMINDER: '⏰',
  SYSTEM: '⚙️',
  MESSAGE: '💬',
  APPOINTMENT: '📅',
  BEHAVIOR: '📊'
};

export const NOTIFICATION_PRIORITY_COLORS: Record<NotificationPriority, string> = {
  LOW: '#10b981',      // Success/Emerald
  MEDIUM: '#3b82f6',   // Info/Blue
  HIGH: '#f59e0b',     // Warning/Amber
  CRITICAL: '#ef4444'  // Danger/Red
};

export const NOTIFICATION_PRIORITY_BG_COLORS: Record<NotificationPriority, string> = {
  LOW: 'bg-emerald-50',
  MEDIUM: 'bg-blue-50',
  HIGH: 'bg-amber-50',
  CRITICAL: 'bg-red-50'
};

export const NOTIFICATION_PRIORITY_BORDER_COLORS: Record<NotificationPriority, string> = {
  LOW: 'border-emerald-200',
  MEDIUM: 'border-blue-200',
  HIGH: 'border-amber-200',
  CRITICAL: 'border-red-200'
};

export const NOTIFICATION_PRIORITY_TEXT_COLORS: Record<NotificationPriority, string> = {
  LOW: 'text-emerald-600',
  MEDIUM: 'text-blue-600',
  HIGH: 'text-amber-600',
  CRITICAL: 'text-red-600'
};
