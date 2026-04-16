import { CommonModule, SlicePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, of, forkJoin } from 'rxjs';
import { takeUntil, catchError, map } from 'rxjs/operators';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';
import { ApiService } from '../../../core/services/api.service';
import { DataService } from '../../../core/services/data.service';
import { MedicalFollowupService } from '../../../core/services/medical-followup.service';
import { SafetyAlertService } from '../../../core/services/safety-alert.service';
import { DailyCareService } from '../../../core/services/daily-care.service';
import { PatientProfileResponse, PatientService } from '../../../core/services/patient.service';
import { DailyCheckInStatus, GameActivity, HealthRecord, RecordType } from '../../../core/models/api.model';
import { CareTeamService } from '../../../core/services/care-team.service';
import { CaregiverPatientContextService } from '../../../core/services/caregiver-patient-context.service';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { StatCardComponent } from '../../../shared/components/stat-card.component';
import { AlertCardComponent } from '../../../shared/components/alert-card.component';
import { AppointmentRequestCardComponent } from '../../../shared/components/appointment-request-card.component';
import { BehaviorLogFormComponent } from '../../../shared/components/behavior-log-form.component';
import { NotificationBellComponent } from '../../../shared/components/notification-bell/notification-bell.component';
import { SafetyAlertBellComponent } from '../../../shared/components/safety-alert-bell/safety-alert-bell.component';
import { PendingValidationsComponent } from '../../alerts/pending-validations/pending-validations.component';
import { AlertPollingService } from '../../../core/services/alert-polling.service';
import { RoleTheme } from '../../../shared/components/navbar.component';
import { CareTask } from '../../../core/models/user.model';
import { Appointment } from '../../../core/models/medical-followup.model';
import { AlertResponse, BehaviorLogResponse, BehaviorSeverity, ResolveAlertRequest, AcknowledgeAlertRequest } from '../../../core/models/safety-alert.model';
import { CaregiverAssignment, CaregiverRole, AssignmentStatus } from '../../../core/models/care-team.model';
import { AutonomySuggestion } from '../../../core/models/daily-care.model';

type AutonomyPatientOption = {
  id: string;
  label: string;
};

@Component({
  selector: 'app-caregiver-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, SlicePipe, RouterLink, StatCardComponent, AlertCardComponent, AppointmentRequestCardComponent, BehaviorLogFormComponent, NotificationBellComponent, SafetyAlertBellComponent, PendingValidationsComponent],
  templateUrl: './caregiver-dashboard.component.html',
  styleUrls: ['./caregiver-dashboard.component.scss']
})
export class CaregiverDashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private readonly missedCheckInAlertStorageKey = 'caregiver-missed-checkin-alerts';
  caregiverName = '';

  // Role theme for notification bell (emerald for caregiver)
  currentTheme: RoleTheme = {
    name: 'Caregiver',
    primary: '#10b981',
    primaryLight: '#ecfdf5',
    primaryDark: '#047857',
    gradientFrom: '#10b981',
    gradientTo: '#059669',
    borderColor: '#d1fae5',
    hoverBg: '#d1fae5',
    activeBg: '#10b981',
    activeText: '#ffffff'
  };
  caregiverId = '';
  patients: PatientProfileResponse[] = [];
  allPatientsDirectory: PatientProfileResponse[] = [];
  allTasks: CareTask[] = [];
  patientAppointments: Map<string, Appointment[]> = new Map();
  loadingAppointments = false;

  // Care Team - My Patients
  caregiverAssignments: CaregiverAssignment[] = [];
  pendingInvites: CaregiverAssignment[] = [];
  loadingAssignments = false;
  acceptingInviteId: string | null = null;

  // Behavior tracking
  showBehaviorLogModal = false;
  recentBehaviors: BehaviorLogResponse[] = [];
  isLoadingBehaviors = false;
  selectedPatientId = '';
  gameAnalyticsLoading = false;
  gameAnalyticsError = '';
  totalGameSessions = 0;
  avgAccuracy = 0;
  adaptiveSessionsRate = 0;
  patientGameMetrics: Array<{
    patientName: string;
    sessions: number;
    accuracy: number;
    voiceUsage: number;
    adaptiveAdjustments: number;
  }> = [];
  showDailyCheckInModal = false;
  showTodayCheckInModal = false;
  showMissedCheckInCalendarModal = false;
  showMissedCheckInAlertModal = false;
  caregiverCheckInPatientId = '';
  caregiverCheckInPatientName = '';
  selectedTodayCheckInForView: HealthRecord | null = null;
  selectedMissedCalendarPatientId = '';
  selectedMissedAlertPatientId = '';
  missedCalendarViewDate: Date = new Date();
  caregiverCheckInSubmitting = false;
  caregiverCheckInError = '';
  caregiverCheckInSuccessMessage = '';
  caregiverCheckInStepIndex = 0;
  caregiverCheckInTouchStartX = 0;
  todaySharedCheckIns: Record<string, HealthRecord> = {};
  dailyCheckInStatuses: Record<string, DailyCheckInStatus> = {};
  caregiverCheckInAnswers: {
    confusion: number | null;
    memory: number | null;
    notes: string;
  } = {
      confusion: null,
      memory: null,
      notes: ''
    };

  // Enums for template
  CaregiverRole = CaregiverRole;

  // Autonomy AI
  selectedAutonomyPatientId = '';
  autonomyPatientOptions: AutonomyPatientOption[] = [];
  autonomyNotes = '';
  autonomyLoading = false;
  latestAutonomySuggestion: AutonomySuggestion | null = null;

  // Role badge colors
  roleColors: Record<CaregiverRole, string> = {
    [CaregiverRole.PRIMARY]: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    [CaregiverRole.FAMILY]: 'bg-blue-100 text-blue-800 border-blue-200',
    [CaregiverRole.EMERGENCY]: 'bg-rose-100 text-rose-800 border-rose-200'
  };

  // Safety alerts (from polling service)
  activeAlerts: AlertResponse[] = [];
  alertCount = 0;
  criticalAlertCount = 0;
  resolvingAlertId: string | null = null;
  acknowledgeAlertId: string | null = null;
  acknowledgeNotes = '';
  resolveNotes = '';
  resolutionType: string = 'CHECKED_OK';
  resolveSubmitting = false;
  acknowledgeSubmitting = false;

  constructor(
    private authService: AuthService,
    private apiService: ApiService,
    private dataService: DataService,
    private patientService: PatientService,

    private medicalService: MedicalFollowupService,
    private safetyAlertService: SafetyAlertService,
    private dailyCareService: DailyCareService,
    private alertPolling: AlertPollingService,
    private careTeamService: CareTeamService,
    private caregiverPatientContext: CaregiverPatientContextService,
    private toastService: ToastService,
    private router: Router
  ) { }

  ngOnInit(): void {
    const currentUser = this.authService.getCurrentUser();

    if (currentUser) {
      this.caregiverName = currentUser.name;
      this.caregiverId = currentUser.id;

      // Get tasks assigned to this caregiver (still from mock for now)
      this.allTasks = this.dataService.getTasksForCaregiver(currentUser.id);

      // Load real patients from backend (includes assignments via context service)
      this.loadRealPatients();
    }

    this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.caregiverName = user.name;
      }
    });

    // Subscribe to safety alert polling
    this.alertPolling.alerts$.pipe(takeUntil(this.destroy$)).subscribe(alerts => {
      this.activeAlerts = alerts.slice(0, 5); // show top 5 on dashboard
      this.alertCount = alerts.length;
      this.criticalAlertCount = alerts.filter(a => a.severity === 'CRITICAL').length;
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ─── Alert helpers ─────────────────────────────────────────────
  openAcknowledge(alertId: string): void {
    this.acknowledgeAlertId = alertId;
    this.acknowledgeNotes = '';
  }

  submitAcknowledge(): void {
    if (!this.acknowledgeAlertId) return;
    const userId = this.authService.getCurrentUser()?.id ?? '';
    this.acknowledgeSubmitting = true;
    this.safetyAlertService.acknowledgeAlert(this.acknowledgeAlertId, { userId, notes: this.acknowledgeNotes })
      .pipe(catchError(() => of(undefined)), takeUntil(this.destroy$))
      .subscribe(() => {
        this.acknowledgeSubmitting = false;
        this.acknowledgeAlertId = null;
        this.toastService.success('Alert acknowledged');
        this.alertPolling.refresh();
      });
  }

  openResolve(alertId: string): void {
    this.resolvingAlertId = alertId;
    this.resolveNotes = '';
    this.resolutionType = 'CHECKED_OK';
  }

  submitResolve(): void {
    if (!this.resolvingAlertId) return;
    const userId = this.authService.getCurrentUser()?.id ?? '';
    this.resolveSubmitting = true;
    const req: ResolveAlertRequest = {
      resolutionType: this.resolutionType as any,
      resolutionNotes: this.resolveNotes,
      isFalsePositive: false,
      resolvedBy: userId
    };
    this.safetyAlertService.resolveAlert(this.resolvingAlertId, req)
      .pipe(catchError(() => of(undefined)), takeUntil(this.destroy$))
      .subscribe(() => {
        this.resolveSubmitting = false;
        this.resolvingAlertId = null;
        this.toastService.success('Alert resolved');
        this.alertPolling.refresh();
      });
  }

  alertSeverityClass(sev: string): string {
    const m: Record<string, string> = {
      CRITICAL: 'bg-red-100 text-red-800 border-red-200',
      HIGH: 'bg-orange-100 text-orange-800 border-orange-200',
      MEDIUM: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      LOW: 'bg-green-100 text-green-800 border-green-200'
    };
    return m[sev] ?? 'bg-gray-100 text-gray-700 border-gray-200';
  }

  alertCountdown(mins: number): string {
    if (mins <= 0) return 'Overdue';
    if (mins < 60) return `${mins}m`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  }

  loadRealPatients(): void {
    this.loadingAssignments = true;
    forkJoin({
      assignments: this.caregiverPatientContext.getActiveAssignments(),
      patients: this.caregiverPatientContext.getAssignedPatients()
    })
      .pipe(
        takeUntil(this.destroy$),
        catchError(error => {
          console.error('Failed to load assigned patients:', error);
          this.toastService.error('Failed to load your assigned patients');
          return of({
            assignments: [] as CaregiverAssignment[],
            patients: [] as PatientProfileResponse[]
          });
        })
      )
      .subscribe({
        next: ({ assignments, patients }) => {
          this.caregiverAssignments = assignments;
          this.patients = patients;
          // Separate pending invites from assignments
          this.pendingInvites = assignments.filter(a => a.status === AssignmentStatus.PENDING);
          this.loadingAssignments = false;
          this.loadTodayCaregiverCheckIns();
          this.loadDailyCheckInStatuses();
          this.loadPatientAppointments();
          this.loadRecentBehaviors();
          this.loadGameAnalytics();
        },
        error: (err) => {
          console.error('Failed to load patients:', err);
          this.patients = [];
          this.caregiverAssignments = [];
          this.pendingInvites = [];
          this.loadingAssignments = false;
          this.todaySharedCheckIns = {};
          this.dailyCheckInStatuses = {};
          this.loadRecentBehaviors();
          this.loadGameAnalytics();
        }
      });


  }

  // ==================== My Patients Section ====================

  loadCaregiverAssignments(): void {
    this.loadingAssignments = true;
    this.careTeamService.getCaregiverAssignments(this.caregiverId)
      .pipe(
        takeUntil(this.destroy$),
        catchError(error => {
          console.error('Failed to load caregiver assignments:', error);
          this.toastService.error('Failed to load your patient assignments');
          return of([]);
        })
      )
      .subscribe(assignments => {
        // Separate pending invites (assignments already loaded in loadRealPatients)
        this.pendingInvites = assignments.filter(a => a.status === AssignmentStatus.PENDING);
        this.loadingAssignments = false;
      });
  }

  acceptInvite(invite: CaregiverAssignment): void {
    if (!invite.inviteToken) return;

    this.acceptingInviteId = invite.id;

    this.careTeamService.acceptInvite(invite.inviteToken, this.caregiverId)
      .pipe(
        takeUntil(this.destroy$),
        catchError(error => {
          console.error('Failed to accept invite:', error);
          this.toastService.error('Failed to accept invitation');
          this.acceptingInviteId = null;
          return of(null);
        })
      )
      .subscribe(result => {
        if (result) {
          this.toastService.success('Invitation accepted! You are now assigned to this patient.');
          this.caregiverPatientContext.invalidate();
          this.loadRealPatients(); // Refresh the lists (includes pending invites)
        }
        this.acceptingInviteId = null;
      });
  }

  declineInvite(invite: CaregiverAssignment): void {
    // Remove from pending list (invite remains in system for other caregivers)
    this.pendingInvites = this.pendingInvites.filter(i => i.id !== invite.id);
    this.toastService.info('Invitation declined');
  }

  getAssignmentForPatient(patientId: string): CaregiverAssignment | undefined {
    return this.caregiverAssignments.find(a => a.patientId.toString() === patientId);
  }

  getRoleBadgeClass(role: CaregiverRole | undefined): string {
    if (!role) return 'bg-gray-100 text-gray-800';
    return this.roleColors[role];
  }

  getRoleLabel(role: CaregiverRole | undefined): string {
    if (!role) return 'Unknown';
    const labels: Record<CaregiverRole, string> = {
      [CaregiverRole.PRIMARY]: 'PRIMARY',
      [CaregiverRole.FAMILY]: 'FAMILY',
      [CaregiverRole.EMERGENCY]: 'EMERGENCY'
    };
    return labels[role];
  }

  viewPatientTasks(patientId: string): void {
    this.router.navigate(['/caregiver/tasks'], { queryParams: { patientId } });
  }

  getAppointmentsForPatient(patientId: string): Appointment[] {
    return this.patientAppointments.get(patientId) || [];
  }

  handleAppointmentRequestCreated(patientId: string, appointment: Appointment): void {
    const existingAppointments = this.patientAppointments.get(patientId) || [];
    this.patientAppointments.set(
      patientId,
      [...existingAppointments, appointment].sort(
        (left, right) => new Date(left.startAt).getTime() - new Date(right.startAt).getTime()
      )
    );
  }

  private loadPatientAppointments(): void {
    const patientIds = [...new Set(this.caregiverAssignments.map(a => a.patientId).filter(Boolean))];

    if (patientIds.length === 0) {
      this.patientAppointments.clear();
      return;
    }

    this.loadingAppointments = true;
    const today = new Date();
    const ninetyDaysLater = new Date();
    ninetyDaysLater.setDate(today.getDate() + 90);
    const fromDate = today.toISOString();
    const toDate = ninetyDaysLater.toISOString();

    const appointmentRequests = patientIds.map(patientId =>
      this.medicalService.getPatientAppointments(patientId, fromDate, toDate).pipe(
        catchError(() => of([] as Appointment[]))
      )
    );

    forkJoin(appointmentRequests).pipe(takeUntil(this.destroy$)).subscribe({
      next: (appointmentsArray) => {
        this.patientAppointments.clear();
        patientIds.forEach((patientId, index) => {
          this.patientAppointments.set(patientId, appointmentsArray[index]);
        });
        this.loadingAppointments = false;
      },
      error: () => {
        this.loadingAppointments = false;
      }
    });
  }

  toggleTask(taskId: string): void {
    const task = this.allTasks.find(t => t.id === taskId);
    if (task) {
      task.completed = !task.completed;
      this.dataService.updateTaskStatus(taskId, task.completed);
    }
  }

  getPatientName(patientId: string): string {
    const patient = this.findPatientByAnyId(patientId);
    return patient ? `${patient.firstName} ${patient.lastName}` : 'Unknown';
  }

  getAssignmentPatientName(assignment: CaregiverAssignment): string {
    const patient = this.findPatientByAnyId(assignment.patientId);
    if (patient) {
      return `${patient.firstName} ${patient.lastName}`;
    }

    const firstName = assignment.patientFirstName?.trim();
    const lastName = assignment.patientLastName?.trim();
    const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();

    return fullName || 'Unknown Patient';
  }

  getTodayCaregiverCheckIn(patientId: string): HealthRecord | null {
    return this.todaySharedCheckIns[patientId] || null;
  }

  hasTodayCaregiverCheckIn(patientId: string): boolean {
    return !!this.getTodayCaregiverCheckIn(patientId);
  }

  hasPatientSubmittedToday(patientId: string): boolean {
    return this.hasPatientMetrics(this.getTodayCaregiverCheckIn(patientId));
  }

  getDailyCheckInStatus(patientId: string): DailyCheckInStatus | null {
    return this.dailyCheckInStatuses[patientId] || null;
  }

  getMissedCheckInCount(patientId: string): number {
    return this.getDailyCheckInStatus(patientId)?.missedDays ?? 0;
  }

  hasMissedCheckIns(patientId: string): boolean {
    return this.getMissedCheckInCount(patientId) > 0;
  }

  viewTodayCheckIn(patientId: string): void {
    const record = this.getTodayCaregiverCheckIn(patientId);
    if (!record) return;
    this.selectedTodayCheckInForView = record;
    this.showTodayCheckInModal = true;
  }

  closeTodayCheckInModal(): void {
    this.showTodayCheckInModal = false;
    this.selectedTodayCheckInForView = null;
  }

  openMissedCheckInCalendar(patientId: string): void {
    if (!this.hasMissedCheckIns(patientId)) return;
    this.selectedMissedCalendarPatientId = patientId;
    this.missedCalendarViewDate = this.getInitialMissedCalendarViewDate(patientId);
    this.showMissedCheckInCalendarModal = true;
  }

  closeMissedCheckInCalendar(): void {
    this.showMissedCheckInCalendarModal = false;
    this.selectedMissedCalendarPatientId = '';
    this.missedCalendarViewDate = new Date();
  }

  getMissedAlertPatientName(): string {
    return this.getPatientName(this.selectedMissedAlertPatientId);
  }

  getMissedAlertDays(): number {
    return this.getMissedCheckInCount(this.selectedMissedAlertPatientId);
  }

  closeMissedCheckInAlert(): void {
    this.acknowledgeCurrentMissedCheckInAlert();
    this.showMissedCheckInAlertModal = false;
    this.selectedMissedAlertPatientId = '';
  }

  viewMissedCheckInAlertCalendar(): void {
    const patientId = this.selectedMissedAlertPatientId;
    if (!patientId) {
      return;
    }

    this.closeMissedCheckInAlert();
    this.openMissedCheckInCalendar(patientId);
  }

  getMissedCalendarTitle(): string {
    return this.getPatientName(this.selectedMissedCalendarPatientId);
  }

  getMissedCalendarMonthLabel(): string {
    return this.missedCalendarViewDate.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric'
    });
  }

  goToPreviousMissedCalendarMonth(): void {
    this.missedCalendarViewDate = new Date(
      this.missedCalendarViewDate.getFullYear(),
      this.missedCalendarViewDate.getMonth() - 1,
      1
    );
  }

  goToNextMissedCalendarMonth(): void {
    this.missedCalendarViewDate = new Date(
      this.missedCalendarViewDate.getFullYear(),
      this.missedCalendarViewDate.getMonth() + 1,
      1
    );
  }

  getSelectedMissedDates(): string[] {
    return this.getMissedCheckInDates(this.selectedMissedCalendarPatientId);
  }

  getMissedCheckInDates(patientId: string): string[] {
    const missedDays = this.getMissedCheckInCount(patientId);
    if (missedDays <= 0) return [];

    const dates: string[] = [];
    const referenceDate = this.getMissedCheckInReferenceDate();
    for (let i = 0; i < missedDays; i++) {
      const date = new Date(referenceDate);
      date.setDate(referenceDate.getDate() - i);
      dates.push(this.getLocalDateKey(date));
    }
    return dates.sort();
  }

  getMissedCalendarWeeks(): Array<Array<{ date: Date; isMissed: boolean; isCurrentMonth: boolean }>> {
    const selectedDates = new Set(this.getSelectedMissedDates());
    const monthStart = new Date(this.missedCalendarViewDate.getFullYear(), this.missedCalendarViewDate.getMonth(), 1);
    const monthEnd = new Date(this.missedCalendarViewDate.getFullYear(), this.missedCalendarViewDate.getMonth() + 1, 0);
    const calendarStart = new Date(monthStart);
    calendarStart.setDate(monthStart.getDate() - monthStart.getDay());

    const weeks: Array<Array<{ date: Date; isMissed: boolean; isCurrentMonth: boolean }>> = [];

    for (let week = 0; week < 6; week++) {
      const days: Array<{ date: Date; isMissed: boolean; isCurrentMonth: boolean }> = [];
      for (let day = 0; day < 7; day++) {
        const date = new Date(calendarStart);
        date.setDate(calendarStart.getDate() + week * 7 + day);
        const key = this.getLocalDateKey(date);
        days.push({
          date,
          isMissed: selectedDates.has(key),
          isCurrentMonth: date >= monthStart && date <= monthEnd
        });
      }
      weeks.push(days);
    }

    return weeks;
  }

  private getInitialMissedCalendarViewDate(patientId: string): Date {
    const missedDates = this.getMissedCheckInDates(patientId).sort();
    if (!missedDates.length) {
      return new Date();
    }

    const firstMissedDate = new Date(`${missedDates[0]}T00:00:00`);
    return new Date(firstMissedDate.getFullYear(), firstMissedDate.getMonth(), 1);
  }

  private getMissedCheckInReferenceDate(): Date {
    const now = new Date();
    const referenceDate = new Date(now);
    const cutoffHour = 7;

    if (now.getHours() < cutoffHour) {
      referenceDate.setDate(referenceDate.getDate() - 2);
    } else {
      referenceDate.setDate(referenceDate.getDate() - 1);
    }

    return referenceDate;
  }

  private findPatientByAnyId(patientId: string): PatientProfileResponse | undefined {
    return this.patients.find(p => p.id === patientId || p.userId === patientId);
  }

  private getPatientApiId(patientId: string): string {
    const patient = this.findPatientByAnyId(patientId);
    return patient?.userId || patient?.id || patientId;
  }

  // ==================== Behavior Tracking ====================

  openBehaviorLogModal(patientId: string = ''): void {
    this.selectedPatientId = patientId;
    this.showBehaviorLogModal = true;
  }

  closeBehaviorLogModal(): void {
    this.showBehaviorLogModal = false;
    this.selectedPatientId = '';
  }

  openDailyCheckInModal(patientId: string, patientName: string): void {
    this.caregiverCheckInPatientId = patientId;
    this.caregiverCheckInPatientName = patientName;
    this.caregiverCheckInError = '';
    this.caregiverCheckInStepIndex = 0;
    this.showDailyCheckInModal = true;
    this.resetCaregiverCheckIn();
  }

  closeDailyCheckInModal(): void {
    this.showDailyCheckInModal = false;
    this.caregiverCheckInPatientId = '';
    this.caregiverCheckInPatientName = '';
    this.caregiverCheckInError = '';
    this.caregiverCheckInStepIndex = 0;
    this.resetCaregiverCheckIn();
  }

  handleCaregiverCheckInTouchStart(event: TouchEvent): void {
    this.caregiverCheckInTouchStartX = event.touches[0].clientX;
  }

  handleCaregiverCheckInTouchEnd(event: TouchEvent): void {
    const endX = event.changedTouches[0].clientX;
    const deltaX = endX - this.caregiverCheckInTouchStartX;
    if (Math.abs(deltaX) < 40) return;
    if (deltaX < 0) {
      this.nextCaregiverCheckInStep();
    } else {
      this.prevCaregiverCheckInStep();
    }
  }

  nextCaregiverCheckInStep(): void {
    if (!this.isCurrentCaregiverCheckInStepValid()) {
      this.caregiverCheckInError = this.caregiverCheckInStepIndex === 2
        ? 'Add a note or leave it empty, then submit.'
        : 'Pick an answer before moving on.';
      return;
    }

    if (this.caregiverCheckInStepIndex < this.getCaregiverCheckInStepCount() - 1) {
      this.caregiverCheckInStepIndex += 1;
      return;
    }

    this.submitCaregiverDailyCheckIn();
  }

  prevCaregiverCheckInStep(): void {
    if (this.caregiverCheckInStepIndex > 0) {
      this.caregiverCheckInStepIndex -= 1;
      this.caregiverCheckInError = '';
    }
  }

  setCaregiverCheckInAnswer(field: 'confusion' | 'memory', value: number): void {
    this.caregiverCheckInAnswers[field] = value;
    this.caregiverCheckInError = '';
  }

  setCaregiverCheckInNotes(value: string): void {
    this.caregiverCheckInAnswers.notes = value;
    this.caregiverCheckInError = '';
  }

  autoAdvanceCaregiverCheckIn(): void {
    if (this.caregiverCheckInStepIndex < this.getCaregiverCheckInStepCount() - 1) {
      setTimeout(() => {
        this.nextCaregiverCheckInStep();
      }, 400);
    }
  }

  submitCaregiverDailyCheckIn(): void {
    if (!this.caregiverId || !this.caregiverCheckInPatientId || this.caregiverCheckInSubmitting) return;
    if (this.caregiverCheckInAnswers.confusion === null || this.caregiverCheckInAnswers.memory === null) {
      this.caregiverCheckInError = 'Answer confusion and memory before saving.';
      return;
    }

    this.caregiverCheckInSubmitting = true;
    this.caregiverCheckInError = '';
    this.caregiverCheckInSuccessMessage = '';

    this.apiService.submitCaregiverDailyCheckIn({
      patientId: this.caregiverCheckInPatientId,
      caregiverUserId: this.caregiverId,
      confusion: this.caregiverCheckInAnswers.confusion,
      memory: this.caregiverCheckInAnswers.memory,
      checkInNotes: this.caregiverCheckInAnswers.notes.trim() || undefined
    }).pipe(
      takeUntil(this.destroy$),
      catchError(error => {
        console.error('Failed to save caregiver daily check-in:', error);
        this.caregiverCheckInSubmitting = false;
        this.caregiverCheckInError = 'Failed to save caregiver check-in.';
        return of(null);
      })
    ).subscribe(result => {
      if (!result) return;
      this.caregiverCheckInSubmitting = false;
      this.showDailyCheckInModal = false;
      this.caregiverCheckInStepIndex = 0;
      this.todaySharedCheckIns[this.caregiverCheckInPatientId] = result;
      this.loadDailyCheckInStatuses();
      this.caregiverCheckInSuccessMessage = `Caregiver check-in saved for ${this.caregiverCheckInPatientName}.`;
      this.resetCaregiverCheckIn();
    });
  }

  canAdvanceCaregiverCheckIn(): boolean {
    return !this.caregiverCheckInSubmitting && this.isCurrentCaregiverCheckInStepValid();
  }

  getCaregiverCheckInStepCount(): number {
    return 3;
  }

  getCaregiverCheckInPrimaryButtonLabel(): string {
    if (this.caregiverCheckInSubmitting) {
      return 'Saving...';
    }
    return this.caregiverCheckInStepIndex < this.getCaregiverCheckInStepCount() - 1 ? 'Next →' : 'Submit ✓';
  }

  private isCurrentCaregiverCheckInStepValid(): boolean {
    switch (this.caregiverCheckInStepIndex) {
      case 0:
        return this.caregiverCheckInAnswers.confusion !== null;
      case 1:
        return this.caregiverCheckInAnswers.memory !== null;
      case 2:
        return true;
      default:
        return false;
    }
  }

  private resetCaregiverCheckIn(): void {
    this.caregiverCheckInAnswers = {
      confusion: null,
      memory: null,
      notes: ''
    };
  }

  private loadTodayCaregiverCheckIns(): void {
    if (!this.caregiverAssignments.length) {
      this.todaySharedCheckIns = {};
      return;
    }

    const requests = this.caregiverAssignments.map(assignment =>
      this.apiService.getHealthRecords(this.getPatientApiId(assignment.patientId), undefined, RecordType.DAILY_CHECKIN).pipe(
        map(records => ({ patientId: assignment.patientId, record: this.findTodayCaregiverCheckIn(records) })),
        catchError(() => of({ patientId: assignment.patientId, record: null as HealthRecord | null }))
      )
    );

    forkJoin(requests)
      .pipe(takeUntil(this.destroy$))
      .subscribe(results => {
        this.todaySharedCheckIns = {};
        results.forEach(({ patientId, record }) => {
          if (record) {
            this.todaySharedCheckIns[patientId] = record;
          }
        });
      });
  }

  private loadDailyCheckInStatuses(): void {
    if (!this.caregiverAssignments.length) {
      this.dailyCheckInStatuses = {};
      return;
    }

    const requests = this.caregiverAssignments.map(assignment =>
      this.apiService.getDailyCheckInStatus(this.getPatientApiId(assignment.patientId)).pipe(
        map(status => ({ patientId: assignment.patientId, status })),
        catchError(() => of({ patientId: assignment.patientId, status: null as DailyCheckInStatus | null }))
      )
    );

    forkJoin(requests)
      .pipe(takeUntil(this.destroy$))
      .subscribe(results => {
        this.dailyCheckInStatuses = {};
        results.forEach(({ patientId, status }) => {
          if (status) {
            this.dailyCheckInStatuses[patientId] = status;
          }
        });
        this.syncMissedCheckInAlertModal();
      });
  }

  private syncMissedCheckInAlertModal(): void {
    const mostOverduePatientId = this.caregiverAssignments
      .map(assignment => assignment.patientId)
      .filter(patientId => this.getMissedCheckInCount(patientId) >= 1)
      .filter(patientId => this.shouldShowMissedCheckInAlert(patientId))
      .sort((patientA, patientB) => this.getMissedCheckInCount(patientB) - this.getMissedCheckInCount(patientA))[0];

    if (!mostOverduePatientId) {
      this.showMissedCheckInAlertModal = false;
      this.selectedMissedAlertPatientId = '';
      return;
    }

    this.selectedMissedAlertPatientId = mostOverduePatientId;
    this.showMissedCheckInAlertModal = true;
  }

  private shouldShowMissedCheckInAlert(patientId: string): boolean {
    const missedDays = this.getMissedCheckInCount(patientId);
    if (missedDays < 1) {
      return false;
    }

    return missedDays > this.getAcknowledgedMissedCheckInDays(patientId);
  }

  private acknowledgeCurrentMissedCheckInAlert(): void {
    const patientId = this.selectedMissedAlertPatientId;
    if (!patientId) {
      return;
    }

    const missedDays = this.getMissedCheckInCount(patientId);
    if (missedDays < 1) {
      return;
    }

    const acknowledgedAlerts = this.getAcknowledgedMissedCheckInAlerts();
    acknowledgedAlerts[this.getMissedCheckInAlertStorageId(patientId)] = missedDays;
    localStorage.setItem(this.missedCheckInAlertStorageKey, JSON.stringify(acknowledgedAlerts));
  }

  private getAcknowledgedMissedCheckInDays(patientId: string): number {
    const acknowledgedAlerts = this.getAcknowledgedMissedCheckInAlerts();
    return acknowledgedAlerts[this.getMissedCheckInAlertStorageId(patientId)] ?? 0;
  }

  private getAcknowledgedMissedCheckInAlerts(): Record<string, number> {
    try {
      const storedValue = localStorage.getItem(this.missedCheckInAlertStorageKey);
      if (!storedValue) {
        return {};
      }

      const parsedValue = JSON.parse(storedValue) as Record<string, number>;
      return typeof parsedValue === 'object' && parsedValue !== null ? parsedValue : {};
    } catch {
      return {};
    }
  }

  private getMissedCheckInAlertStorageId(patientId: string): string {
    return `${this.caregiverId}:${patientId}`;
  }

  private findTodayCaregiverCheckIn(records: HealthRecord[]): HealthRecord | null {
    const todayKey = this.getLocalDateKey(new Date());

    const todaysRecord = records
      .filter(record => this.getLocalDateKey(new Date(record.completedAt || record.date)) === todayKey)
      .filter(record => typeof record.confusion === 'number' || typeof record.memory === 'number' || !!record.checkInNotes)
      .sort((a, b) => new Date(b.completedAt || b.date).getTime() - new Date(a.completedAt || a.date).getTime())[0];

    return todaysRecord || null;
  }

  hasPatientMetrics(record: HealthRecord | null): boolean {
    if (!record) return false;
    return typeof record.mood === 'number'
      || typeof record.sleep === 'number'
      || typeof record.appetite === 'number';
  }

  private getLocalDateKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  onBehaviorLogged(): void {
    // Refresh the recent behaviors list after a new behavior is logged
    this.loadRecentBehaviors();
  }

  loadRecentBehaviors(): void {
    if (this.patients.length === 0) {
      this.recentBehaviors = [];
      return;
    }

    this.isLoadingBehaviors = true;
    this.recentBehaviors = [];

    // Load behaviors for all patients and combine them
    let completedRequests = 0;
    const allBehaviors: BehaviorLogResponse[] = [];

    this.patients.forEach(patient => {
      this.safetyAlertService.getBehaviorLogsByPatient(patient.id).pipe(
        takeUntil(this.destroy$)
      ).subscribe({
        next: (behaviors) => {
          allBehaviors.push(...behaviors);
          completedRequests++;

          if (completedRequests === this.patients.length) {
            // Sort by timestamp (newest first) and take last 5
            this.recentBehaviors = allBehaviors
              .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
              .slice(0, 5);
            this.isLoadingBehaviors = false;
          }
        },
        error: () => {
          completedRequests++;
          if (completedRequests === this.patients.length) {
            this.recentBehaviors = allBehaviors
              .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
              .slice(0, 5);
            this.isLoadingBehaviors = false;
          }
        }
      });
    });
  }

  getBehaviorTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      'FALL': 'Fall',
      'WANDERING': 'Wandering',
      'AGITATION': 'Agitation',
      'SLEEP_DISORDER': 'Sleep Disorder',
      'HALLUCINATION': 'Hallucination',
      'CONFUSION': 'Confusion',
      'AGGRESSION': 'Aggression',
      'MEDICATION_REFUSAL': 'Medication Refusal',
      'OTHER': 'Other'
    };
    return labels[type] || type;
  }

  getBehaviorIcon(type: string): string {
    const icons: Record<string, string> = {
      'FALL': '💥',
      'WANDERING': '🚶',
      'AGITATION': '😰',
      'SLEEP_DISORDER': '😴',
      'HALLUCINATION': '👁️',
      'CONFUSION': '😕',
      'AGGRESSION': '😠',
      'MEDICATION_REFUSAL': '💊',
      'OTHER': '📝'
    };
    return icons[type] || '📝';
  }

  severityToNumber(severity: BehaviorSeverity): number {
    const map: Record<BehaviorSeverity, number> = {
      'ONE': 1, 'TWO': 2, 'THREE': 3, 'FOUR': 4, 'FIVE': 5
    };
    return map[severity] || 1;
  }

  getSeverityColor(severity: BehaviorSeverity): string {
    const num = this.severityToNumber(severity);
    switch (num) {
      case 1: return 'border-green-400 bg-green-50';
      case 2: return 'border-emerald-400 bg-emerald-50';
      case 3: return 'border-yellow-400 bg-yellow-50';
      case 4: return 'border-orange-400 bg-orange-50';
      case 5: return 'border-red-400 bg-red-50';
      default: return 'border-gray-400 bg-gray-50';
    }
  }

  getSeverityLabel(severity: BehaviorSeverity): string {
    const num = this.severityToNumber(severity);
    const labels: Record<number, string> = {
      1: 'Mild', 2: 'Low', 3: 'Moderate', 4: 'High', 5: 'Severe'
    };
    return labels[num] || 'Unknown';
  }

  formatTimeAgo(timestamp: string): string {
    const date = new Date(timestamp);
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

  viewAllBehaviors(): void {
    // Navigate to behaviors page
    this.router.navigate(['/caregiver/behaviors']);
  }

  private loadGameAnalytics(): void {
    if (!this.patients.length) {
      this.resetGameAnalytics();
      return;
    }

    this.gameAnalyticsLoading = true;
    this.gameAnalyticsError = '';
    const requests = this.patients.map(patient => this.apiService.getGameActivities(patient.userId));
    forkJoin(requests).pipe(takeUntil(this.destroy$)).subscribe({
      next: (activitiesByPatient) => {
        this.patientGameMetrics = this.patients.map((patient, index) =>
          this.computePatientGameMetrics(patient, activitiesByPatient[index] || [])
        );
        const allActivities = activitiesByPatient.flat();
        this.totalGameSessions = allActivities.length;
        this.avgAccuracy = this.patientGameMetrics.length
          ? Math.round(this.patientGameMetrics.reduce((sum, metric) => sum + metric.accuracy, 0) / this.patientGameMetrics.length)
          : 0;
        this.adaptiveSessionsRate = allActivities.length
          ? Math.round((allActivities.filter(activity => activity.adaptiveMode).length / allActivities.length) * 100)
          : 0;
        this.gameAnalyticsLoading = false;
      },
      error: () => {
        this.gameAnalyticsError = 'Failed to load game analytics.';
        this.gameAnalyticsLoading = false;
      }
    });
  }

  private resetGameAnalytics(): void {
    this.totalGameSessions = 0;
    this.avgAccuracy = 0;
    this.adaptiveSessionsRate = 0;
    this.patientGameMetrics = [];
    this.gameAnalyticsLoading = false;
    this.gameAnalyticsError = '';
  }

  private computePatientGameMetrics(
    patient: PatientProfileResponse,
    activities: GameActivity[]
  ): { patientName: string; sessions: number; accuracy: number; voiceUsage: number; adaptiveAdjustments: number } {
    const sessions = activities.length;
    const accuracy = sessions
      ? Math.round(activities.reduce((sum, activity) => {
        if (typeof activity.accuracyPercent === 'number') return sum + activity.accuracyPercent;
        if (activity.maxScore && activity.maxScore > 0 && typeof activity.score === 'number') {
          return sum + (activity.score / activity.maxScore) * 100;
        }
        return sum;
      }, 0) / sessions)
      : 0;
    const voiceUsage = sessions
      ? Math.round((activities.filter(activity => activity.voiceUsed).length / sessions) * 100)
      : 0;
    const adaptiveAdjustments = activities.reduce((sum, activity) => sum + (activity.difficultyAdjustments || 0), 0);

    return {
      patientName: `${patient.firstName} ${patient.lastName}`,
      sessions,
      accuracy,
      voiceUsage,
      adaptiveAdjustments
    };
  }
}
