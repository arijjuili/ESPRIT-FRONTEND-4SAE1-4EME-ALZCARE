import {
  Component,
  Input,
  ElementRef,
  HostListener,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { RoleTheme } from '../navbar.component';
import {
  Notification,
  NotificationType,
  NotificationPriority,
  NotificationSummaryResponse
} from '../../../core/models/notification.model';
import { NotificationService } from '../../../core/services/notification.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-notification-bell',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './notification-bell.component.html',
  styleUrls: ['./notification-bell.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NotificationBellComponent implements OnInit, OnDestroy {
  @Input() theme: RoleTheme | null = null;

  isDropdownOpen = false;
  notifications: Notification[] = [];
  unreadCount = 0;
  criticalCount = 0;
  isLoading = false;

  // Default theme fallback
  private defaultTheme: RoleTheme = {
    name: 'Default',
    primary: '#14b8a6',
    primaryLight: '#f0fdfa',
    primaryDark: '#0f766e',
    gradientFrom: '#14b8a6',
    gradientTo: '#0d9488',
    borderColor: '#ccfbf1',
    hoverBg: '#ccfbf1',
    activeBg: '#14b8a6',
    activeText: '#ffffff'
  };

  private unreadCountSubscription?: Subscription;

  constructor(
    private elementRef: ElementRef,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private notificationService: NotificationService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadNotificationSummary();
    this.loadNotifications();
  }

  ngOnDestroy(): void {
    if (this.unreadCountSubscription) {
      this.unreadCountSubscription.unsubscribe();
    }
  }

  /**
   * Get the effective theme (input or default)
   */
  get effectiveTheme(): RoleTheme {
    return this.theme || this.defaultTheme;
  }

  /**
   * Toggle dropdown visibility
   */
  toggleDropdown(): void {
    this.isDropdownOpen = !this.isDropdownOpen;
    if (this.isDropdownOpen) {
      this.loadNotifications();
    }
    this.cdr.markForCheck();
  }

  /**
   * Close dropdown
   */
  closeDropdown(): void {
    this.isDropdownOpen = false;
    this.cdr.markForCheck();
  }

  /**
   * Handle click outside to close dropdown
   */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.closeDropdown();
    }
  }

  /**
   * Mark a notification as read
   */
  markAsRead(id: string, event?: Event): void {
    event?.stopPropagation();
    
    const notification = this.notifications.find(n => n.id === id);
    if (notification && notification.status === 'DELIVERED') {
      // Update local state optimistically
      notification.status = 'READ';
      notification.readAt = new Date().toISOString();
      this.unreadCount = Math.max(0, this.unreadCount - 1);
      this.cdr.markForCheck();

      // Call service to persist
      this.notificationService.markAsRead(id).subscribe({
        error: (error) => {
          console.error('[NotificationBell] Failed to mark notification as read:', error);
        }
      });
    }
  }

  /**
   * Navigate to notifications page
   */
  viewAllNotifications(): void {
    this.closeDropdown();
    this.router.navigate(['/notifications']);
  }

  /**
   * Get icon for notification type
   */
  getNotificationIcon(type: NotificationType): string {
    const icons: Record<NotificationType, string> = {
      ALERT: '🚨',
      REMINDER: '⏰',
      SYSTEM: '⚙️',
      MESSAGE: '💬',
      APPOINTMENT: '📅',
      BEHAVIOR: '📊'
    };
    return icons[type] || '🔔';
  }

  /**
   * Get color class based on notification priority
   */
  getNotificationColorClass(priority: NotificationPriority): string {
    const classes: Record<NotificationPriority, string> = {
      LOW: 'text-emerald-500',
      MEDIUM: 'text-blue-500',
      HIGH: 'text-amber-500',
      CRITICAL: 'text-red-500'
    };
    return classes[priority] || 'text-gray-500';
  }

  /**
   * Get background color class based on notification priority
   */
  getNotificationBgClass(priority: NotificationPriority): string {
    const classes: Record<NotificationPriority, string> = {
      LOW: 'bg-emerald-50',
      MEDIUM: 'bg-blue-50',
      HIGH: 'bg-amber-50',
      CRITICAL: 'bg-red-50'
    };
    return classes[priority] || 'bg-gray-50';
  }

  /**
   * Format timestamp for display
   */
  formatTimestamp(timestamp: string): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  }

  /**
   * Handle notification click
   */
  onNotificationClick(notification: Notification): void {
    this.markAsRead(notification.id);
    
    if (notification.actionUrl) {
      this.closeDropdown();
      this.router.navigate([notification.actionUrl]);
    }
  }

  /**
   * Load recent notifications from the service
   */
  private loadNotifications(): void {
    const userId = this.authService.getCurrentUser()?.id;
    if (!userId) {
      this.isLoading = false;
      this.cdr.markForCheck();
      return;
    }

    this.isLoading = true;
    this.cdr.markForCheck();

    this.notificationService.getUserNotifications(userId, { 
      page: 0, 
      size: 10,
      hours: 24
    }).subscribe({
      next: (response) => {
        this.notifications = response.content;
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('[NotificationBell] Failed to load notifications:', error);
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  /**
   * Load notification summary and subscribe to real-time unread count
   */
  private loadNotificationSummary(): void {
    const userId = this.authService.getCurrentUser()?.id;
    if (!userId) {
      this.cdr.markForCheck();
      return;
    }

    // Subscribe to real-time unread count updates
    this.unreadCountSubscription = this.notificationService.unreadCount$.subscribe(count => {
      this.unreadCount = count;
      this.cdr.markForCheck();
    });

    // Initial fetch of unread count
    this.notificationService.getUnreadCount(userId).subscribe({
      error: (error) => {
        console.error('[NotificationBell] Failed to load unread count:', error);
      }
    });

    // Count critical notifications from current list
    this.criticalCount = this.notifications.filter(n => n.priority === 'CRITICAL' && n.status === 'DELIVERED').length;
    this.cdr.markForCheck();
  }
}
