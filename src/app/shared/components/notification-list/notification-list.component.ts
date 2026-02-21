import {
  Component,
  Input,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  HostListener
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { RoleTheme } from '../navbar.component';
import {
  Notification,
  NotificationType,
  NotificationPriority,
  NotificationFilterType,
  NOTIFICATION_FILTERS,
  PagedNotificationResponse
} from '../../../core/models/notification.model';
import { NotificationService } from '../../../core/services/notification.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-notification-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './notification-list.component.html',
  styleUrls: ['./notification-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NotificationListComponent implements OnInit, OnDestroy {
  @Input() theme: RoleTheme | null = null;
  @Input() showFilters = true;
  @Input() showMarkAllRead = true;
  @Input() pageSize = 10;

  // Filter tabs
  filterTabs = NOTIFICATION_FILTERS;
  currentFilter: NotificationFilterType = 'ALL';

  // Notifications data
  notifications: Notification[] = [];
  filteredNotifications: Notification[] = [];
  selectedNotifications = new Set<string>();

  // Pagination
  currentPage = 0;
  totalElements = 0;
  totalPages = 0;
  isLastPage = false;
  isLoading = false;
  isLoadingMore = false;

  // Summary counts
  unreadCount = 0;
  totalCount = 0;

  // Delete confirmation
  notificationToDelete: string | null = null;

  // Search
  searchQuery = '';
  private searchSubject = new Subject<string>();
  private searchSubscription?: Subscription;

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

  constructor(
    private cdr: ChangeDetectorRef,
    private notificationService: NotificationService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.setupSearchDebounce();
    this.loadNotifications();
  }

  ngOnDestroy(): void {
    if (this.searchSubscription) {
      this.searchSubscription.unsubscribe();
    }
  }

  /**
   * Get the effective theme (input or default)
   */
  get effectiveTheme(): RoleTheme {
    return this.theme || this.defaultTheme;
  }

  /**
   * Setup search debounce
   */
  private setupSearchDebounce(): void {
    this.searchSubscription = this.searchSubject
      .pipe(
        debounceTime(300),
        distinctUntilChanged()
      )
      .subscribe(() => {
        this.currentPage = 0;
        this.loadNotifications();
      });
  }

  /**
   * Load notifications from the service
   */
  loadNotifications(): void {
    if (this.isLoading) return;

    const userId = this.authService.getCurrentUser()?.id;
    if (!userId) {
      this.isLoading = false;
      this.cdr.markForCheck();
      return;
    }

    this.isLoading = true;
    this.cdr.markForCheck();

    this.notificationService.getUserNotifications(userId, {
      page: this.currentPage,
      size: this.pageSize
    }).subscribe({
      next: (response) => {
        this.notifications = response.content;
        this.totalElements = response.totalElements;
        this.totalPages = response.totalPages;
        this.isLastPage = response.last;
        this.applyFilter(this.currentFilter);
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('[NotificationList] Failed to load notifications:', error);
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  /**
   * Load more notifications (pagination)
   */
  loadMore(): void {
    if (this.isLoadingMore || this.isLastPage) return;

    const userId = this.authService.getCurrentUser()?.id;
    if (!userId) return;

    this.isLoadingMore = true;
    this.currentPage++;
    this.cdr.markForCheck();

    this.notificationService.getUserNotifications(userId, {
      page: this.currentPage,
      size: this.pageSize
    }).subscribe({
      next: (response) => {
        this.notifications = [...this.notifications, ...response.content];
        this.isLastPage = response.last;
        this.applyFilter(this.currentFilter);
        this.isLoadingMore = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('[NotificationList] Failed to load more notifications:', error);
        this.currentPage--;
        this.isLoadingMore = false;
        this.cdr.markForCheck();
      }
    });
  }

  /**
   * Apply filter to notifications
   */
  applyFilter(filterType: NotificationFilterType): void {
    this.currentFilter = filterType;

    switch (filterType) {
      case 'ALL':
        this.filteredNotifications = [...this.notifications];
        break;
      case 'UNREAD':
        this.filteredNotifications = this.notifications.filter(n => n.status === 'UNREAD');
        break;
      case 'ALERTS':
        this.filteredNotifications = this.notifications.filter(n => n.type === 'ALERT');
        break;
      case 'REMINDERS':
        this.filteredNotifications = this.notifications.filter(
          n => n.type === 'REMINDER' || n.type === 'APPOINTMENT'
        );
        break;
      case 'SYSTEM':
        this.filteredNotifications = this.notifications.filter(n => n.type === 'SYSTEM');
        break;
    }

    // Apply search filter if present
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      this.filteredNotifications = this.filteredNotifications.filter(
        n => 
          n.title.toLowerCase().includes(query) ||
          n.message.toLowerCase().includes(query)
      );
    }

    this.updateSummaryCounts();
    this.cdr.markForCheck();
  }

  /**
   * Update summary counts
   */
  private updateSummaryCounts(): void {
    this.unreadCount = this.notifications.filter(n => n.status === 'UNREAD').length;
    this.totalCount = this.totalElements;
  }

  /**
   * Get count for a filter tab
   */
  getFilterCount(filterType: NotificationFilterType): number {
    switch (filterType) {
      case 'ALL':
        return this.totalCount;
      case 'UNREAD':
        return this.notifications.filter(n => n.status === 'UNREAD').length;
      case 'ALERTS':
        return this.notifications.filter(n => n.type === 'ALERT').length;
      case 'REMINDERS':
        return this.notifications.filter(
          n => n.type === 'REMINDER' || n.type === 'APPOINTMENT'
        ).length;
      case 'SYSTEM':
        return this.notifications.filter(n => n.type === 'SYSTEM').length;
      default:
        return 0;
    }
  }

  /**
   * Mark a notification as read
   */
  markAsRead(id: string): void {
    const notification = this.notifications.find(n => n.id === id);
    if (notification && notification.status === 'UNREAD') {
      // Update local state optimistically
      notification.status = 'READ';
      notification.readAt = new Date().toISOString();
      this.applyFilter(this.currentFilter);
      this.cdr.markForCheck();

      // Call service to persist
      this.notificationService.markAsRead(id).subscribe({
        error: (error) => {
          console.error('[NotificationList] Failed to mark notification as read:', error);
        }
      });
    }
  }

  /**
   * Mark all notifications as read
   */
  markAllAsRead(): void {
    const userId = this.authService.getCurrentUser()?.id;
    if (!userId) return;

    let hasChanges = false;
    this.notifications.forEach(notification => {
      if (notification.status === 'UNREAD') {
        notification.status = 'READ';
        notification.readAt = new Date().toISOString();
        hasChanges = true;
      }
    });

    if (hasChanges) {
      this.applyFilter(this.currentFilter);
      this.cdr.markForCheck();

      // Call service to persist
      this.notificationService.markAllAsRead(userId).subscribe({
        error: (error) => {
          console.error('[NotificationList] Failed to mark all notifications as read:', error);
        }
      });
    }
  }

  /**
   * Delete a notification
   */
  deleteNotification(id: string): void {
    // Update local state optimistically
    this.notifications = this.notifications.filter(n => n.id !== id);
    this.selectedNotifications.delete(id);
    this.applyFilter(this.currentFilter);
    this.notificationToDelete = null;
    this.cdr.markForCheck();

    // Call service to persist
    this.notificationService.deleteNotification(id).subscribe({
      error: (error) => {
        console.error('[NotificationList] Failed to delete notification:', error);
      }
    });
  }

  /**
   * Show delete confirmation
   */
  confirmDelete(id: string, event?: Event): void {
    event?.stopPropagation();
    this.notificationToDelete = id;
    this.cdr.markForCheck();
  }

  /**
   * Cancel delete
   */
  cancelDelete(): void {
    this.notificationToDelete = null;
    this.cdr.markForCheck();
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
   * Get background color class based on notification priority
   */
  getNotificationColorClass(priority: NotificationPriority): string {
    const classes: Record<NotificationPriority, string> = {
      LOW: 'bg-emerald-50 border-emerald-200',
      MEDIUM: 'bg-blue-50 border-blue-200',
      HIGH: 'bg-amber-50 border-amber-200',
      CRITICAL: 'bg-red-50 border-red-200'
    };
    return classes[priority] || 'bg-gray-50 border-gray-200';
  }

  /**
   * Get text color class based on notification priority
   */
  getNotificationTextColorClass(priority: NotificationPriority): string {
    const classes: Record<NotificationPriority, string> = {
      LOW: 'text-emerald-600',
      MEDIUM: 'text-blue-600',
      HIGH: 'text-amber-600',
      CRITICAL: 'text-red-600'
    };
    return classes[priority] || 'text-gray-600';
  }

  /**
   * Get icon color class based on notification priority
   */
  getNotificationIconColorClass(priority: NotificationPriority): string {
    const classes: Record<NotificationPriority, string> = {
      LOW: 'text-emerald-500',
      MEDIUM: 'text-blue-500',
      HIGH: 'text-amber-500',
      CRITICAL: 'text-red-500'
    };
    return classes[priority] || 'text-gray-500';
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
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  }

  /**
   * Format full date time
   */
  formatFullDateTime(timestamp: string): string {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }

  /**
   * Handle search input
   */
  onSearchInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchQuery = input.value;
    this.searchSubject.next(this.searchQuery);
  }

  /**
   * Clear search
   */
  clearSearch(): void {
    this.searchQuery = '';
    this.currentPage = 0;
    this.loadNotifications();
  }

  /**
   * Handle infinite scroll
   */
  @HostListener('window:scroll')
  onScroll(): void {
    if (this.isLoadingMore || this.isLastPage) return;

    const scrollPosition = window.innerHeight + window.scrollY;
    const documentHeight = document.documentElement.scrollHeight;

    if (scrollPosition >= documentHeight - 200) {
      this.loadMore();
    }
  }

  /**
   * Get priority label
   */
  getPriorityLabel(priority: NotificationPriority): string {
    return priority.charAt(0) + priority.slice(1).toLowerCase();
  }

  /**
   * Get type label
   */
  getTypeLabel(type: NotificationType): string {
    return type.charAt(0) + type.slice(1).toLowerCase();
  }
}
