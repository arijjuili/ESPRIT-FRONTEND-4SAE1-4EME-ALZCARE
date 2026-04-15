import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subject, forkJoin, of } from 'rxjs';
import { takeUntil, catchError } from 'rxjs/operators';

import { AuthService } from '../../../core/services/auth.service';
import { UserManagementService } from '../../../core/services/user-management.service';
import { PatientService } from '../../../core/services/patient.service';
import { SafetyAlertService } from '../../../core/services/safety-alert.service';
import { CareTeamService } from '../../../core/services/care-team.service';
import { NotificationService } from '../../../core/services/notification.service';
import { StatCardComponent } from '../../../shared/components/stat-card.component';
import { AlertCardComponent } from '../../../shared/components/alert-card.component';
import { AlertResponse } from '../../../core/models/safety-alert.model';
import { Notification } from '../../../core/models/notification.model';
import { ChecklistItem, ChecklistStatus, CaregiverAssignment, DoctorAssignment } from '../../../core/models/care-team.model';

interface ManagementCategory {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  axes: Axis[];
  stats: { label: string; value: string };
}

interface Axis {
  id: number;
  name: string;
  description: string;
  route: string;
  count: number;
  status: 'active' | 'maintenance' | 'warning';
}

interface QuickAction {
  label: string;
  icon: string;
  color: string;
  action: () => void;
}

interface SystemAlert {
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  message: string;
  timestamp: string;
}

interface ActivityItem {
  type: string;
  action: string;
  user: string;
  timestamp: string;
  icon: string;
  color: string;
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, StatCardComponent, AlertCardComponent],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.scss']
})
export class AdminDashboardComponent implements OnInit, OnDestroy {
  adminName = 'Administrator';
  currentDate = new Date();
  loading = true;

  private destroy$ = new Subject<void>();

  // System Overview Stats
  systemStats = [
    { label: 'Total Users', value: 0, icon: '👥', color: 'primary', change: 'Loading...' },
    { label: 'Active Patients', value: 0, icon: '🏥', color: 'success', change: 'Loading...' },
    { label: 'Pending Tasks', value: 0, icon: '📋', color: 'warning', change: 'Loading...' },
    { label: 'System Alerts', value: 0, icon: '🔔', color: 'danger', change: 'Loading...' }
  ];

  // Management Categories with 12 Axes
  managementCategories: ManagementCategory[] = [
    {
      id: 'medical',
      title: 'Medical Management',
      description: 'Healthcare operations, medications, appointments & monitoring',
      icon: '🏥',
      color: 'from-rose-500 to-pink-600',
      stats: { label: 'Active Prescriptions', value: '—' },
      axes: [
        { id: 1, name: 'Medication & Reminders', description: 'Drug inventory, schedules & adherence', route: '/admin/medications', count: 0, status: 'active' },
        { id: 2, name: 'Appointments', description: 'Scheduling & calendar management', route: '/admin/appointments', count: 0, status: 'active' },
        { id: 3, name: 'Behavior Monitoring', description: 'Pattern tracking & incident reports', route: '/admin/behavior', count: 0, status: 'active' },
        { id: 4, name: 'Alert System', description: 'Critical alerts & escalation rules', route: '/admin/alerts', count: 0, status: 'active' },
        { id: 6, name: 'Doctor Workflows', description: 'Prescriptions & consultations', route: '/admin/doctors', count: 0, status: 'active' },
        { id: 10, name: 'Patient Profiles', description: 'Demographics & medical history', route: '/admin/patients', count: 0, status: 'active' }
      ]
    },
    {
      id: 'care',
      title: 'Care & Support',
      description: 'Caregiver coordination & daily patient routines',
      icon: '🤝',
      color: 'from-emerald-500 to-teal-600',
      stats: { label: 'Active Caregivers', value: '—' },
      axes: [
        { id: 5, name: 'Caregiver Management', description: 'Assignments, workloads & performance', route: '/admin/caregivers', count: 0, status: 'active' },
        { id: 9, name: 'Daily Routines', description: 'Activity schedules & task templates', route: '/admin/routines', count: 0, status: 'active' }
      ]
    },
    {
      id: 'interactive',
      title: 'Interactive Features',
      description: 'Cognitive games, memory wallet & social activities',
      icon: '🧩',
      color: 'from-violet-500 to-purple-600',
      stats: { label: 'Games Played Today', value: '—' },
      axes: [
        { id: 7, name: 'Cognitive Games', description: 'Games library & progress tracking', route: '/admin/games', count: 0, status: 'active' },
        { id: 8, name: 'Memory Wallet', description: 'Memory items, photos & recognition', route: '/admin/memory', count: 0, status: 'active' },
        { id: 12, name: 'Social Activities', description: 'Events & group participation', route: '/admin/activities', count: 0, status: 'active' }
      ]
    },
    {
      id: 'community',
      title: 'Community & Content',
      description: 'Forum moderation & user-generated content',
      icon: '💬',
      color: 'from-blue-500 to-indigo-600',
      stats: { label: 'Forum Posts', value: '—' },
      axes: [
        { id: 11, name: 'Community Forum', description: 'Posts moderation & topics', route: '/admin/forum', count: 0, status: 'active' }
      ]
    }
  ];

  // Quick Actions
  quickActions: QuickAction[] = [
    { label: 'Add Patient', icon: '➕', color: 'bg-emerald-500', action: () => this.addPatient() },
    { label: 'Schedule Appointment', icon: '📅', color: 'bg-blue-500', action: () => this.scheduleAppointment() },
    { label: 'Send Broadcast', icon: '📢', color: 'bg-violet-500', action: () => this.sendBroadcast() },
    { label: 'System Settings', icon: '⚙️', color: 'bg-gray-600', action: () => this.openSettings() },
    { label: 'Generate Report', icon: '📊', color: 'bg-amber-500', action: () => this.generateReport() },
    { label: 'User Management', icon: '👤', color: 'bg-rose-500', action: () => this.manageUsers() }
  ];

  // System Alerts
  systemAlerts: SystemAlert[] = [];

  // Recent Activity
  recentActivity: ActivityItem[] = [];

  // System Status
  systemStatus = [
    { name: 'Database', status: 'operational', uptime: '99.99%' },
    { name: 'API Server', status: 'operational', uptime: '99.95%' },
    { name: 'Email Service', status: 'operational', uptime: '99.90%' },
    { name: 'File Storage', status: 'operational', uptime: '99.85%' },
    { name: 'Notification Service', status: 'operational', uptime: '99.99%' }
  ];

  constructor(
    private authService: AuthService,
    private userManagementService: UserManagementService,
    private patientService: PatientService,
    private safetyAlertService: SafetyAlertService,
    private careTeamService: CareTeamService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    const currentUser = this.authService.getCurrentUser();
    if (currentUser) {
      this.adminName = currentUser.name || 'Administrator';
    }

    this.authService.currentUser$.pipe(takeUntil(this.destroy$)).subscribe(user => {
      if (user) {
        this.adminName = user.name || 'Administrator';
      }
    });

    this.loadDashboardData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadDashboardData(): void {
    this.loading = true;

    // Load all data in parallel
    forkJoin({
      users: this.userManagementService.getUsers({}, 0, 1).pipe(
        catchError(() => of({ content: [], totalElements: 0, totalPages: 0, size: 1, number: 0 }))
      ),
      patients: this.patientService.getPatients().pipe(
        catchError(() => of([]))
      ),
      caregiverAssignments: this.careTeamService.getAllCaregiverAssignments().pipe(
        catchError(() => of([]))
      ),
      doctorAssignments: this.careTeamService.getAllDoctorAssignments().pipe(
        catchError(() => of([]))
      ),
      checklists: this.careTeamService.getChecklistItems().pipe(
        catchError(() => of([]))
      ),
      activeAlerts: this.safetyAlertService.getActiveAlerts().pipe(
        catchError(() => of([]))
      ),
      overdueAlerts: this.safetyAlertService.getOverdueAlerts().pipe(
        catchError(() => of([]))
      ),
      adminNotifications: this.loadAdminNotifications()
    })
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (data) => {
        const totalUsers = data.users.totalElements || 0;
        const totalPatients = data.patients.length;
        const activeCaregivers = data.caregiverAssignments.filter((a: CaregiverAssignment) => a.status === 'ACTIVE').length;
        const activeDoctors = data.doctorAssignments.filter((a: DoctorAssignment) => a.status === 'ACTIVE').length;
        const pendingTasks = data.checklists.filter((c: ChecklistItem) => c.status !== ChecklistStatus.COMPLETED).length;
        const allAlerts = [...data.activeAlerts, ...data.overdueAlerts];
        const criticalAlerts = allAlerts.filter((a: AlertResponse) => a.severity === 'CRITICAL' || a.isEscalationOverdue).length;

        // Update system stats
        this.systemStats = [
          { label: 'Total Users', value: totalUsers, icon: '👥', color: 'primary', change: this.pluralize(totalUsers, 'user', 'users') },
          { label: 'Active Patients', value: totalPatients, icon: '🏥', color: 'success', change: this.pluralize(totalPatients, 'patient', 'patients') },
          { label: 'Pending Tasks', value: pendingTasks, icon: '📋', color: 'warning', change: pendingTasks > 0 ? `${pendingTasks} need attention` : 'All caught up' },
          { label: 'System Alerts', value: allAlerts.length, icon: '🔔', color: 'danger', change: criticalAlerts > 0 ? `${criticalAlerts} critical` : 'All clear' }
        ];

        // Update management categories
        this.updateManagementCategoryCount('medical', 10, totalPatients); // Patient Profiles
        this.updateManagementCategoryCount('medical', 6, activeDoctors); // Doctor Workflows
        this.updateManagementCategoryCount('care', 5, activeCaregivers); // Caregiver Management
        this.updateManagementCategoryCount('medical', 4, allAlerts.length, allAlerts.length > 0 ? 'warning' : 'active'); // Alert System
        this.updateManagementCategoryCount('medical', 3, data.checklists.length); // Behavior Monitoring -> use checklist count as proxy for now
        this.updateManagementCategoryCount('care', 9, pendingTasks); // Daily Routines -> pending checklists

        // Update system alerts from real data
        this.systemAlerts = this.mapAlertsToSystemAlerts(allAlerts);

        // Update recent activity from admin notifications
        this.recentActivity = this.mapNotificationsToActivity(data.adminNotifications);

        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  private loadAdminNotifications(): Promise<Notification[]> {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser?.id) {
      return Promise.resolve([]);
    }
    return this.notificationService.getUserNotifications(currentUser.id, { page: 0, size: 6 })
      .pipe(
        catchError(() => of({ content: [], totalElements: 0, totalPages: 0, size: 6, number: 0 })),
        takeUntil(this.destroy$)
      )
      .toPromise()
      .then(response => response?.content || []);
  }

  private updateManagementCategoryCount(categoryId: string, axisId: number, count: number, status?: 'active' | 'maintenance' | 'warning'): void {
    const category = this.managementCategories.find(c => c.id === categoryId);
    if (!category) return;

    const axis = category.axes.find(a => a.id === axisId);
    if (axis) {
      axis.count = count;
      if (status) {
        axis.status = status;
      }
    }

    // Update category stats where applicable
    if (categoryId === 'care' && axisId === 5) {
      category.stats = { label: 'Active Caregivers', value: String(count) };
    }
    if (categoryId === 'medical' && axisId === 10) {
      category.stats = { label: 'Active Patients', value: String(count) };
    }
  }

  private mapAlertsToSystemAlerts(alerts: AlertResponse[]): SystemAlert[] {
    if (alerts.length === 0) {
      return [{
        type: 'success',
        title: 'All Clear',
        message: 'No active system alerts. All monitored patients are within normal parameters.',
        timestamp: 'Just now'
      }];
    }

    return alerts.slice(0, 5).map(alert => {
      let type: 'success' | 'warning' | 'error' | 'info' = 'info';
      if (alert.severity === 'CRITICAL' || alert.isEscalationOverdue) {
        type = 'error';
      } else if (alert.severity === 'HIGH') {
        type = 'warning';
      } else if (alert.severity === 'MEDIUM') {
        type = 'info';
      }

      const title = alert.isEscalationOverdue
        ? `Overdue Alert: ${alert.ruleCode}`
        : `${alert.severity} Alert: ${alert.ruleCode}`;

      let message = `Triggered at ${new Date(alert.triggeredAt).toLocaleString()}`;
      if (alert.isEscalationOverdue) {
        message += `. Escalation deadline has passed.`;
      } else if (alert.escalationMinutesRemaining > 0) {
        message += `. ${Math.ceil(alert.escalationMinutesRemaining)} minutes until escalation.`;
      }

      return {
        type,
        title,
        message,
        timestamp: this.formatRelativeTime(alert.triggeredAt)
      };
    });
  }

  private mapNotificationsToActivity(notifications: Notification[]): ActivityItem[] {
    if (notifications.length === 0) {
      return [{
        type: 'system',
        action: 'No recent activity to display',
        user: 'System',
        timestamp: '',
        icon: 'ℹ️',
        color: 'text-gray-400'
      }];
    }

    return notifications.map(n => {
      const iconMap: Record<string, string> = {
        ALERT: '🚨',
        REMINDER: '⏰',
        SYSTEM: '⚙️',
        MESSAGE: '💬',
        APPOINTMENT: '📅',
        BEHAVIOR: '📊'
      };

      const colorMap: Record<string, string> = {
        ALERT: 'text-rose-500',
        REMINDER: 'text-amber-500',
        SYSTEM: 'text-blue-500',
        MESSAGE: 'text-violet-500',
        APPOINTMENT: 'text-emerald-500',
        BEHAVIOR: 'text-cyan-500'
      };

      return {
        type: n.type.toLowerCase(),
        action: n.title,
        user: n.priority + ' priority',
        timestamp: this.formatRelativeTime(n.createdAt),
        icon: iconMap[n.type] || '🔔',
        color: colorMap[n.type] || 'text-blue-500'
      };
    });
  }

  private formatRelativeTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  }

  private pluralize(count: number, singular: string, plural: string): string {
    return `${count} ${count === 1 ? singular : plural}`;
  }

  getRoleClass(role: string): string {
    const classes: Record<string, string> = {
      patient: 'bg-emerald-100 text-emerald-700',
      caregiver: 'bg-blue-100 text-blue-700',
      doctor: 'bg-violet-100 text-violet-700',
      admin: 'bg-amber-100 text-amber-700'
    };
    return classes[role] || 'bg-gray-100 text-gray-800';
  }

  getStatusClass(status: string): string {
    const classes: Record<string, string> = {
      active: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      maintenance: 'bg-amber-100 text-amber-700 border-amber-200',
      warning: 'bg-rose-100 text-rose-700 border-rose-200'
    };
    return classes[status] || 'bg-gray-100 text-gray-700';
  }

  getSystemStatusClass(status: string): string {
    return status === 'operational' ? 'bg-emerald-500' :
           status === 'warning' ? 'bg-amber-500' : 'bg-rose-500';
  }

  getAlertClass(type: string): string {
    const classes: Record<string, string> = {
      success: 'border-l-emerald-500 bg-emerald-50',
      warning: 'border-l-amber-500 bg-amber-50',
      error: 'border-l-rose-500 bg-rose-50',
      info: 'border-l-blue-500 bg-blue-50'
    };
    return classes[type] || 'border-l-gray-500 bg-gray-50';
  }

  getAlertIcon(type: string): string {
    const icons: Record<string, string> = {
      success: '✅',
      warning: '⚠️',
      error: '❌',
      info: 'ℹ️'
    };
    return icons[type] || '🔔';
  }

  // Quick Action Handlers
  addPatient(): void {
    // Navigate to user management or patient creation
    window.location.href = '/admin/users';
  }

  scheduleAppointment(): void {
    window.location.href = '/admin/schedules';
  }

  sendBroadcast(): void {
    window.location.href = '/admin/schedules';
  }

  openSettings(): void {
    window.location.href = '/admin/settings';
  }

  generateReport(): void {
    window.location.href = '/admin/analytics';
  }

  manageUsers(): void {
    window.location.href = '/admin/users';
  }

  onQuickAction(action: QuickAction): void {
    action.action();
  }
}
