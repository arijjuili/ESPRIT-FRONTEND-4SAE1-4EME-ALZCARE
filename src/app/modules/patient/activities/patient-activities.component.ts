import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { Subject, of } from 'rxjs';
import { takeUntil, catchError, finalize } from 'rxjs/operators';
import { ActivityService } from '../../../core/services/activity.service';
import { AuthService } from '../../../core/services/auth.service';
import { DailyCareService } from '../../../core/services/daily-care.service';
import { DailyCareTask } from '../../../core/models/daily-care.model';

import { ToastService } from '../../../shared/components/toast/toast.service';
import {
  ActivityResponse,
  ActivityType,
  ActivityReminder,
  PatientInterest,
  ReminderTiming
} from '../../../core/models/activity.model';

type ActiveTab = 'upcoming' | 'recommended' | 'reminders' | 'daily' | 'interests';

@Component({
  selector: 'app-patient-activities',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule, FormsModule],
  templateUrl: './patient-activities.component.html',
  styleUrls: ['./patient-activities.component.scss']
})
export class PatientActivitiesComponent implements OnInit, OnDestroy {
  private patientId = '';
  private destroy$ = new Subject<void>();
  todayTasks: DailyCareTask[] = [];
  loading = false;

  activeTab: ActiveTab = 'upcoming';

  // ── Upcoming activities ──────────────────────────────────────────
  upcomingActivities: ActivityResponse[] = [];
  loadingUpcoming = false;
  filterType: ActivityType | '' = '';

  // ── Recommended ──────────────────────────────────────────────────
  recommendedActivities: ActivityResponse[] = [];
  loadingRecommended = false;

  // ── Reminders ────────────────────────────────────────────────────
  reminders: ActivityReminder[] = [];
  loadingReminders = false;

  // ── Interests ────────────────────────────────────────────────────
  interests: PatientInterest | null = null;
  loadingInterests = false;
  savingInterests = false;
  interestsForm: FormGroup;
  interestsLoaded = false;

  readonly activityTypeOptions: { value: ActivityType; label: string }[] = [
    { value: 'GROUP', label: 'Group' },
    { value: 'INDIVIDUAL', label: 'Individual' },
    { value: 'VIRTUAL', label: 'Virtual' },
    { value: 'IN_PERSON', label: 'In-Person' }
  ];

  readonly reminderTimingOptions: { value: ReminderTiming; label: string }[] = [
    { value: 'H2', label: '2 hours before' },
    { value: 'H24', label: '24 hours before' },
    { value: 'H48', label: '48 hours before' }
  ];

  constructor(
    private activityService: ActivityService,
    private authService: AuthService,
    private toastService: ToastService,
    private fb: FormBuilder,
    private dailyCareService: DailyCareService,

  ) {
    this.interestsForm = this.fb.group({
      city: ['', Validators.required],
      activityTypes: [[]],
      emailNotifications: [true],
      preferredReminderTiming: ['H24', Validators.required]
    });
  }

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    if (user) this.patientId = user.id;
      if (!user) {
      return;
    }
    this.loadUpcoming();

    this.loading = true;
    this.dailyCareService
      .getPatientDailyTasks(user.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: tasks => {
          this.todayTasks = tasks;
          this.loading = false;
        },
        error: () => {
          this.loading = false;
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  setTab(tab: string): void {
    this.activeTab = tab as ActiveTab;
    if (tab === 'upcoming' && !this.upcomingActivities.length && !this.loadingUpcoming) this.loadUpcoming();
    if (tab === 'recommended' && !this.recommendedActivities.length && !this.loadingRecommended) this.loadRecommended();
    if (tab === 'reminders' && !this.reminders.length && !this.loadingReminders) this.loadReminders();
    if (tab === 'interests' && !this.interestsLoaded) this.loadInterests();
    // daily tab loads on init already, no extra fetch needed
  }

  // ── Upcoming ────────────────────────────────────────────────────

  loadUpcoming(): void {
    this.loadingUpcoming = true;
    this.activityService.getUpcomingActivities()
      .pipe(
        catchError(() => {
          this.toastService.error('Failed to load activities');
          return of([]);
        }),
        finalize(() => { this.loadingUpcoming = false; }),
        takeUntil(this.destroy$)
      )
      .subscribe(activities => {
        this.upcomingActivities = this.filterType
          ? activities.filter(a => a.type === this.filterType)
          : activities;
      });
  }

  applyFilter(): void {
    this.loadUpcoming();
  }

  // ── Recommended ─────────────────────────────────────────────────

  loadRecommended(): void {
    if (!this.patientId) return;
    this.loadingRecommended = true;
    this.activityService.getRecommendedActivities(this.patientId)
      .pipe(
        catchError(() => {
          this.toastService.error('Failed to load recommendations');
          return of([]);
        }),
        finalize(() => { this.loadingRecommended = false; }),
        takeUntil(this.destroy$)
      )
      .subscribe(activities => { this.recommendedActivities = activities; });
  }

  // ── Reminders ───────────────────────────────────────────────────

  loadReminders(): void {
    if (!this.patientId) return;
    this.loadingReminders = true;
    this.activityService.getUpcomingReminders(this.patientId)
      .pipe(
        catchError(() => {
          this.toastService.error('Failed to load reminders');
          return of([]);
        }),
        finalize(() => { this.loadingReminders = false; }),
        takeUntil(this.destroy$)
      )
      .subscribe(reminders => { this.reminders = reminders; });
  }

  getReminderTimingLabel(timing: ReminderTiming): string {
    return this.reminderTimingOptions.find(o => o.value === timing)?.label ?? timing;
  }

  // ── Interests ───────────────────────────────────────────────────

  loadInterests(): void {
    if (!this.patientId) return;
    this.loadingInterests = true;
    this.activityService.getPatientInterests(this.patientId)
      .pipe(
        catchError(() => of(null)),
        finalize(() => {
          this.loadingInterests = false;
          this.interestsLoaded = true;
        }),
        takeUntil(this.destroy$)
      )
      .subscribe(interests => {
        if (interests) {
          this.interests = interests;
          this.interestsForm.patchValue({
            city: interests.city,
            activityTypes: interests.activityTypes ?? [],
            emailNotifications: interests.emailNotifications,
            preferredReminderTiming: interests.preferredReminderTiming
          });
        }
      });
  }
  toggleTask(taskId: string): void {
    const task = this.todayTasks.find(t => t.id === taskId);
    if (task) {
      const updatedValue = !task.completed;
      this.dailyCareService
        .updateTaskStatus(taskId, { completed: updatedValue })
        .pipe(takeUntil(this.destroy$))
        .subscribe(updatedTask => {
          const index = this.todayTasks.findIndex(t => t.id === updatedTask.id);
          if (index !== -1) {
            this.todayTasks[index] = updatedTask;
          }
        });
    }
  }
  isTypeSelected(type: ActivityType): boolean {
    const types: ActivityType[] = this.interestsForm.get('activityTypes')?.value ?? [];
    return types.includes(type);
  }

  toggleInterestType(type: ActivityType): void {
    const ctrl = this.interestsForm.get('activityTypes')!;
    const current: ActivityType[] = [...(ctrl.value ?? [])];
    const idx = current.indexOf(type);
    if (idx >= 0) current.splice(idx, 1);
    else current.push(type);
    ctrl.setValue(current);
  }

  saveInterests(): void {
    if (this.interestsForm.invalid || !this.patientId) return;
    this.savingInterests = true;
    const payload: PatientInterest = {
      ...this.interestsForm.value,
      patientId: this.patientId
    };
    this.activityService.savePatientInterests(payload)
      .pipe(
        catchError(() => {
          this.toastService.error('Failed to save preferences');
          return of(null);
        }),
        finalize(() => { this.savingInterests = false; }),
        takeUntil(this.destroy$)
      )
      .subscribe(result => {
        if (result) {
          this.interests = result;
          this.toastService.success('Preferences saved');
          // refresh recommendations with new interests
          this.recommendedActivities = [];
          if (this.activeTab === 'recommended') this.loadRecommended();
        }
      });
  }

  // ── Display helpers ─────────────────────────────────────────────

  typeIcon(type: ActivityType): string {
    const map: Record<ActivityType, string> = {
      GROUP: '👥', INDIVIDUAL: '🧑', VIRTUAL: '💻', IN_PERSON: '📍'
    };
    return map[type] ?? '📋';
  }

  statusClass(status: string): string {
    const m: Record<string, string> = {
      PUBLISHED: 'bg-green-100 text-green-800',
      IN_PROGRESS: 'bg-blue-100 text-blue-800',
      CANCELLED: 'bg-gray-100 text-gray-500'
    };
    return m[status] ?? 'bg-gray-100 text-gray-600';
  }

  capacityPercent(activity: ActivityResponse): number {
    if (!activity.maxCapacity) return 0;
    return Math.min(100, Math.round((activity.registeredCount / activity.maxCapacity) * 100));
  }

  capacityClass(activity: ActivityResponse): string {
    const pct = this.capacityPercent(activity);
    if (pct >= 90) return 'bg-red-400';
    if (pct >= 60) return 'bg-yellow-400';
    return 'bg-green-400';
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  }

  formatReminderDate(iso: string): string {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = d.getTime() - now.getTime();
    const diffH = Math.round(diffMs / 3600000);
    if (diffH < 0) return 'Overdue';
    if (diffH < 24) return `In ${diffH}h`;
    const days = Math.floor(diffH / 24);
    return `In ${days}d`;
  }
}
