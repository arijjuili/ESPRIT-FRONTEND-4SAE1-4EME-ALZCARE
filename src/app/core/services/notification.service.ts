import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, interval, Subscription, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  Notification,
  NotificationFilter,
  PagedNotificationResponse,
  NotificationStatus,
  UnreadCountResponse
} from '../models/notification.model';

/**
 * Notification Service
 * 
 * Handles communication with the notification-service for managing user notifications.
 * Provides HTTP methods, state management via BehaviorSubject, and polling for real-time updates.
 * 
 * Note: Polling is temporary until WebSocket implementation is ready.
 */
@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private apiUrl = `${environment.apiUrl}/v1/notifications`;
  private pollingSubscription?: Subscription;
  private currentUserId: string | null = null;

  // ==================== STATE MANAGEMENT ====================

  private unreadCountSubject = new BehaviorSubject<number>(0);
  unreadCount$ = this.unreadCountSubject.asObservable();

  // Shared notifications state - used by both bell and list components
  private notificationsSubject = new BehaviorSubject<Notification[]>([]);
  notifications$ = this.notificationsSubject.asObservable();

  // Loading states
  private markingAsRead = new Set<string>();
  private deleting = new Set<string>();

  constructor(private http: HttpClient) { }

  // ==================== HTTP METHODS ====================

  /**
   * Get notifications for a specific user with optional filters
   */
  getUserNotifications(userId: string, filters?: NotificationFilter): Observable<PagedNotificationResponse> {
    let params = new HttpParams();

    if (filters) {
      if (filters.status) params = params.set('status', filters.status);
      if (filters.type) params = params.set('type', filters.type);
      if (filters.priority) params = params.set('priority', filters.priority);
      if (filters.page !== undefined) params = params.set('page', filters.page.toString());
      if (filters.size !== undefined) params = params.set('size', filters.size.toString());
      if (filters.days !== undefined) params = params.set('days', filters.days.toString());
      if (filters.hours !== undefined) params = params.set('hours', filters.hours.toString());
    }

    return this.http.get<PagedNotificationResponse>(`${this.apiUrl}/user/${userId}`, {
      headers: this.getAuthHeaders(),
      params
    }).pipe(
      catchError(error => {
        console.error('[NotificationService] Failed to get user notifications:', error);
        throw error;
      })
    );
  }

  /**
   * Get count of unread notifications for a user
   */
  getUnreadCount(userId: string): Observable<number> {
    return this.http.get<UnreadCountResponse>(`${this.apiUrl}/user/${userId}/unread/count`, {
      headers: this.getAuthHeaders()
    }).pipe(
      map(response => response.count),
      tap(count => this.unreadCountSubject.next(count)),
      catchError(error => {
        console.error('[NotificationService] Failed to get unread count:', error);
        throw error;
      })
    );
  }

  /**
   * Mark a specific notification as read
   */
  markAsRead(notificationId: string): Observable<void> {
    // Prevent duplicate requests
    if (this.markingAsRead.has(notificationId)) {
      return of(undefined);
    }
    this.markingAsRead.add(notificationId);

    // Optimistic update
    this.updateNotificationStatus(notificationId, 'READ');

    return this.http.patch<void>(`${this.apiUrl}/${notificationId}/read`, {}, {
      headers: this.getAuthHeaders()
    }).pipe(
      tap(() => {
        this.refreshUnreadCount();
        this.markingAsRead.delete(notificationId);
      }),
      catchError(error => {
        console.error('[NotificationService] Failed to mark notification as read:', error);
        // Rollback optimistic update on failure
        this.updateNotificationStatus(notificationId, 'UNREAD');
        this.markingAsRead.delete(notificationId);
        throw error;
      })
    );
  }

  /**
   * Mark all notifications as read for a user
   */
  markAllAsRead(userId: string): Observable<void> {
    // Optimistic update - mark all as read in local state
    const currentNotifications = this.notificationsSubject.value;
    const updatedNotifications = currentNotifications.map(n => 
      n.status === 'UNREAD' ? { ...n, status: 'READ' as const, readAt: new Date().toISOString() } : n
    );
    this.notificationsSubject.next(updatedNotifications);
    this.unreadCountSubject.next(0);

    return this.http.put<void>(`${this.apiUrl}/user/${userId}/mark-all-read`, {}, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(error => {
        console.error('[NotificationService] Failed to mark all notifications as read:', error);
        // Rollback - restore previous state
        this.notificationsSubject.next(currentNotifications);
        this.refreshUnreadCount();
        throw error;
      })
    );
  }

  /**
   * Delete a notification
   */
  deleteNotification(id: string): Observable<void> {
    // Prevent duplicate requests
    if (this.deleting.has(id)) {
      return of(undefined);
    }
    this.deleting.add(id);

    // Optimistic update - remove from local state immediately
    const currentNotifications = this.notificationsSubject.value;
    const notification = currentNotifications.find(n => n.id === id);
    const filteredNotifications = currentNotifications.filter(n => n.id !== id);
    this.notificationsSubject.next(filteredNotifications);

    return this.http.delete<void>(`${this.apiUrl}/${id}`, {
      headers: this.getAuthHeaders()
    }).pipe(
      tap(() => {
        this.refreshUnreadCount();
        this.deleting.delete(id);
      }),
      catchError(error => {
        console.error('[NotificationService] Failed to delete notification:', error);
        // Rollback - restore notification to list
        this.notificationsSubject.next(currentNotifications);
        this.deleting.delete(id);
        throw error;
      })
    );
  }

  /**
   * Get a single notification by ID
   */
  getNotificationById(id: string): Observable<Notification> {
    return this.http.get<Notification>(`${this.apiUrl}/${id}`, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(error => {
        console.error('[NotificationService] Failed to get notification:', error);
        throw error;
      })
    );
  }

  /**
   * Get notifications by status for a user
   */
  getNotificationsByStatus(userId: string, status: NotificationStatus): Observable<Notification[]> {
    return this.http.get<Notification[]>(`${this.apiUrl}/user/${userId}/status/${status}`, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(error => {
        console.error('[NotificationService] Failed to get notifications by status:', error);
        throw error;
      })
    );
  }

  // ==================== POLLING (Temporary until WebSocket) ====================

  /**
   * Start polling for new notifications
   * @param userId - The user ID to poll for
   * @param intervalMs - Polling interval in milliseconds (default: 30000ms)
   */
  startPolling(userId: string, intervalMs = 30000): void {
    this.stopPolling(); // Ensure no duplicate polling
    this.currentUserId = userId;

    // Initial fetch
    this.getUnreadCount(userId).subscribe();

    // Set up polling interval - refresh both count and notifications list
    this.pollingSubscription = interval(intervalMs).subscribe(() => {
      this.getUnreadCount(userId).subscribe({
        error: (error) => {
          console.error('[NotificationService] Polling error:', error);
        }
      });
      
      // Also refresh the notifications list if we have cached notifications
      if (this.notificationsSubject.value.length > 0) {
        this.refreshNotifications(userId).subscribe();
      }
    });

    console.log(`[NotificationService] Started polling for user ${userId} every ${intervalMs}ms`);
  }

  /**
   * Refresh notifications list for a user
   */
  refreshNotifications(userId: string, filters?: NotificationFilter): Observable<Notification[]> {
    return this.getUserNotifications(userId, filters).pipe(
      map(response => response.content),
      tap(notifications => {
        this.notificationsSubject.next(notifications);
      }),
      catchError(error => {
        console.error('[NotificationService] Failed to refresh notifications:', error);
        return of(this.notificationsSubject.value);
      })
    );
  }

  /**
   * Stop polling for notifications
   */
  stopPolling(): void {
    if (this.pollingSubscription) {
      this.pollingSubscription.unsubscribe();
      this.pollingSubscription = undefined;
      console.log('[NotificationService] Stopped polling');
    }
  }

  /**
   * Check if polling is currently active
   */
  isPolling(): boolean {
    return !!this.pollingSubscription && !this.pollingSubscription.closed;
  }

  // ==================== STATE HELPERS ====================

  /**
   * Get current unread count value
   */
  getCurrentUnreadCount(): number {
    return this.unreadCountSubject.value;
  }

  /**
   * Manually update unread count (useful for optimistic updates)
   */
  updateUnreadCount(count: number): void {
    this.unreadCountSubject.next(count);
  }

  /**
   * Increment unread count (e.g., when a new notification arrives via WebSocket)
   */
  incrementUnreadCount(): void {
    this.unreadCountSubject.next(this.unreadCountSubject.value + 1);
  }

  // ==================== PRIVATE HELPERS ====================

  /**
   * Get Authorization headers with Bearer token from localStorage
   */
  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('access_token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  /**
   * Refresh unread count from server
   * Uses stored userId from startPolling
   */
  private refreshUnreadCount(): void {
    if (this.currentUserId) {
      this.getUnreadCount(this.currentUserId).subscribe();
    }
  }

  /**
   * Update notification status in shared state
   */
  private updateNotificationStatus(notificationId: string, status: NotificationStatus): void {
    const currentNotifications = this.notificationsSubject.value;
    const updatedNotifications = currentNotifications.map(n => 
      n.id === notificationId 
        ? { ...n, status, readAt: status === 'READ' ? new Date().toISOString() : undefined }
        : n
    );
    this.notificationsSubject.next(updatedNotifications);
  }

  /**
   * Check if a notification is currently being marked as read
   */
  isMarkingAsRead(notificationId: string): boolean {
    return this.markingAsRead.has(notificationId);
  }

  /**
   * Check if a notification is currently being deleted
   */
  isDeleting(notificationId: string): boolean {
    return this.deleting.has(notificationId);
  }

  /**
   * Get critical unread count from current notifications
   */
  getCriticalUnreadCount(): number {
    return this.notificationsSubject.value.filter(
      n => n.status === 'UNREAD' && n.priority === 'CRITICAL'
    ).length;
  }
}
