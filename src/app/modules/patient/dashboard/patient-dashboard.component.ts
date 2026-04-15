import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { catchError, of, Subscription, switchMap } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { DataService } from '../../../core/services/data.service';
import { DailyCareService } from '../../../core/services/daily-care.service';
import { PatientService } from '../../../core/services/patient.service';
import { NotificationService } from '../../../core/services/notification.service';
import { AlertCardComponent } from '../../../shared/components/alert-card.component';
import { NotificationBellComponent } from '../../../shared/components/notification-bell/notification-bell.component';
import { WeatherPrayerCardComponent } from '../../../shared/components/weather-prayer-card.component';
import { PrayerTimesComponent } from '../../../shared/components/prayer-times.component';
import { RoleTheme } from '../../../shared/components/navbar.component';
import { HealthMetric } from '../../../core/models/user.model';
import { AutonomyHistoryItem, AutonomyProfile, Habit, HabitTask } from '../../../core/models/daily-care.model';
import { ToastService } from '../../../shared/components/toast/toast.service';

type DashboardTask = {
  id: number;
  title: string;
  description: string;
  completed: boolean;
  habitName: string;
  targetTime: string;
  orderIndex: number;
};

@Component({
  selector: 'app-patient-dashboard',
  standalone: true,
  imports: [CommonModule, AlertCardComponent, NotificationBellComponent, WeatherPrayerCardComponent, PrayerTimesComponent],
  templateUrl: './patient-dashboard.component.html',
  styleUrls: ['./patient-dashboard.component.scss']
})
export class PatientDashboardComponent implements OnInit {
  patientName = '';
  
  // Role theme for notification bell (teal for patient)
  currentTheme: RoleTheme = {
    name: 'Patient',
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
  appointments: any[] = [];
  medications: any[] = [];
  todayTasks: DashboardTask[] = [];
  healthMetrics: HealthMetric[] = [];
  completedTasksCount = 0;
  loadingTasks = false;
  autonomyProfile: AutonomyProfile | null = null;
  loadingAutonomy = false;
  autonomyHistory: AutonomyHistoryItem[] = [];
  private unreadCountSubscription?: Subscription;
  private lastUnreadCount: number = -1; // Force type
  private completingTaskIds = new Set<number>();

  constructor(
    private authService: AuthService,
    private dataService: DataService,
    private dailyCareService: DailyCareService,
    private patientService: PatientService,
    private notificationService: NotificationService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    const currentUser = this.authService.getCurrentUser();
    
    if (currentUser) {
      this.patientName = currentUser.name;
      this.toastService.success(`Welcome back, ${this.patientName}! Checking notifications...`);
      this.initNotificationPolling(currentUser.id);
      
      // Get patient data (assuming patient 1 for demo)
      const patient = this.dataService.getPatients()[0];
      if (patient) {
        this.medications = patient.currentMedications;
        this.appointments = this.dataService.getAppointments(patient.id);
        this.healthMetrics = this.dataService.getHealthMetrics(patient.id);
      }
      this.loadTodayTasks();
      this.loadAutonomyProfile();
      this.loadAutonomyHistory();
    }
  }

  toggleTask(taskId: number): void {
    const task = this.todayTasks.find(t => t.id === taskId);
    if (!task || task.completed || this.completingTaskIds.has(taskId)) {
      return;
    }

    this.completingTaskIds.add(taskId);
    this.dailyCareService.completeTask(taskId).pipe(
      catchError((err) => {
        console.warn('[PatientDashboard] Backend completion failed, keeping local completion:', err);
        return of(null);
      })
    ).subscribe(() => {
      task.completed = true;
      this.persistCompletedTask(task.id);
      this.updateCompletedCount();
      this.completingTaskIds.delete(taskId);
      this.toastService.success('Task marked as completed');
    });
  }

  getProgressPercentage(): number {
    if (this.todayTasks.length === 0) return 0;
    return (this.completedTasksCount / this.todayTasks.length) * 100;
  }

  private updateCompletedCount(): void {
    this.completedTasksCount = this.todayTasks.filter(t => t.completed).length;
  }

  isTaskCompleting(taskId: number): boolean {
    return this.completingTaskIds.has(taskId);
  }

  private loadTodayTasks(): void {
    this.loadingTasks = true;
    const authUser = this.authService.getCurrentUser();
    const userId = this.authService.getCurrentUserId() || authUser?.id || '';

    if (!userId) {
      this.todayTasks = [];
      this.updateCompletedCount();
      this.loadingTasks = false;
      return;
    }

    this.patientService.getPatientById(userId).pipe(
      catchError((err) => {
        console.warn('[PatientDashboard] Could not resolve patient profile id, fallback to userId', err);
        return of(null);
      }),
      switchMap((profile) => {
        const idsToCheck = profile ? [userId, profile.id] : [userId];
        return this.dailyCareService.getAssignedHabitsForPatient(idsToCheck, true);
      })
    ).subscribe({
      next: (habits) => {
        this.todayTasks = this.mapHabitsToTodayTasks(habits, userId);
        this.updateCompletedCount();
        this.loadingTasks = false;
      },
      error: (err) => {
        console.error('[PatientDashboard] Failed to load today tasks:', err);
        this.todayTasks = [];
        this.updateCompletedCount();
        this.loadingTasks = false;
      }
    });
  }

  private loadAutonomyProfile(): void {
    const authUser = this.authService.getCurrentUser();
    const userId = this.authService.getCurrentUserId() || authUser?.id || '';
    if (!userId) {
      return;
    }
    this.loadingAutonomy = true;
    this.dailyCareService.getAutonomyProfile(userId).subscribe({
      next: (profile) => {
        this.autonomyProfile = profile;
        this.loadingAutonomy = false;
      },
      error: (err) => {
        console.warn('[PatientDashboard] Failed to load autonomy profile:', err);
        this.loadingAutonomy = false;
      }
    });
  }

  private loadAutonomyHistory(): void {
    const authUser = this.authService.getCurrentUser();
    const userId = this.authService.getCurrentUserId() || authUser?.id || '';
    if (!userId) {
      return;
    }
    this.dailyCareService.getAutonomyHistory(userId).subscribe({
      next: (items) => {
        this.autonomyHistory = items || [];
      },
      error: (err) => {
        console.warn('[PatientDashboard] Failed to load autonomy history:', err);
      }
    });
  }

  private mapHabitsToTodayTasks(habits: Habit[], userId: string): DashboardTask[] {
    const completedIds = this.getCompletedTaskIds(userId);
    return habits
      .flatMap((habit: Habit) =>
        (habit.tasks || []).map((task: HabitTask) => ({
          id: task.id,
          title: task.title,
          description: task.description,
          completed: completedIds.has(task.id),
          habitName: habit.name,
          targetTime: habit.targetTime,
          orderIndex: task.orderIndex ?? 0
        }))
      )
      .sort((a, b) => {
        const timeSort = a.targetTime.localeCompare(b.targetTime);
        return timeSort !== 0 ? timeSort : a.orderIndex - b.orderIndex;
      });
  }

  private completedTaskStorageKey(userId: string): string {
    const today = new Date().toISOString().slice(0, 10);
    return `patientCompletedTasks:${userId}:${today}`;
  }

  private getCompletedTaskIds(userId: string): Set<number> {
    const raw = localStorage.getItem(this.completedTaskStorageKey(userId));
    if (!raw) {
      return new Set<number>();
    }
    try {
      const parsed = JSON.parse(raw) as number[];
      return new Set<number>(parsed);
    } catch {
      return new Set<number>();
    }
  }

  private persistCompletedTask(taskId: number): void {
    const authUser = this.authService.getCurrentUser();
    const userId = this.authService.getCurrentUserId() || authUser?.id || '';
    if (!userId) {
      return;
    }
    const completed = this.getCompletedTaskIds(userId);
    completed.add(taskId);
    localStorage.setItem(this.completedTaskStorageKey(userId), JSON.stringify(Array.from(completed)));
  }

  getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning! 🌅 Hope you had a good sleep.';
    if (hour < 17) return 'Good afternoon! ☀️ Keep taking care of yourself.';
    return 'Good evening! 🌙 Relax and enjoy your evening.';
  }

  private initNotificationPolling(userId: string): void {
    console.log('[NotificationService] Initializing polling for user:', userId);
    // Start polling every 10 seconds for testing
    this.notificationService.startPolling(userId, 10000);

    // Watch for unread count increases
    this.unreadCountSubscription = this.notificationService.unreadCount$.subscribe((count: any) => {
      // Safety check: ensure count is a valid number
      const currentCount = (count === undefined || count === null) ? 0 : Number(count);
      
      console.log(`[Notification Check] User: ${userId} | Unread: ${currentCount} | Previous: ${this.lastUnreadCount}`);
      
      // TRIGGER TAOST LOGIC
      if (currentCount > 0 && (this.lastUnreadCount === -1 || currentCount > this.lastUnreadCount)) {
        console.log('[Notification Check] Displaying Toast for new/DELIVERED notifications');
        this.onNewNotificationReceived();
      } else if (currentCount === 0 && this.lastUnreadCount === -1) {
        console.log('[Notification Check] No DELIVERED notifications found on first check.');
      }
      this.lastUnreadCount = currentCount;
    });
  }

  private onNewNotificationReceived(): void {
    const userId = this.authService.getCurrentUser()?.id;
    if (!userId) return;

    // Fetch the latest notifications to show the actual content in the toast
    this.notificationService.getUserNotifications(userId, { page: 0, size: 1 }).subscribe({
      next: (response) => {
        if (response.content && response.content.length > 0) {
          const latest = response.content[0];
          console.log(`[Notification Content] Found message: "${latest.message}" | Type: ${latest.type}`);
          
          // Show the actual message from the notification (e.g., "Time to drink water!")
          if (latest.type === 'REMINDER' || latest.message.toLowerCase().includes('water')) {
             this.toastService.info(latest.message, 'Hydration Reminder 🥤');
          } else {
             this.toastService.info(latest.message, 'New Notification');
          }
        } else {
          // Fallback if we couldn't fetch the details
          this.toastService.info('You have a new health reminder!', 'Notification');
        }
        
        // Refresh tasks to show the new completion items if needed
        this.loadTodayTasks();
      },
      error: () => {
        this.toastService.info('You have a new health reminder!', 'Notification');
      }
    });
  }

  ngOnDestroy(): void {
    if (this.unreadCountSubscription) {
      this.unreadCountSubscription.unsubscribe();
    }
    this.notificationService.stopPolling();
  }
}
