import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, of } from 'rxjs';
import { takeUntil, catchError, finalize } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth.service';
import { PatientService, PatientProfileResponse } from '../../../core/services/patient.service';
import { CareTeamService } from '../../../core/services/care-team.service';
import { DoctorPatientContextService } from '../../../core/services/doctor-patient-context.service';
import { DoctorWorkflowService } from '../../../core/services/doctor-workflow.service';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { StatCardComponent } from '../../../shared/components/stat-card.component';
import { AlertCardComponent } from '../../../shared/components/alert-card.component';
import { NotificationBellComponent } from '../../../shared/components/notification-bell/notification-bell.component';
import { SafetyAlertBellComponent } from '../../../shared/components/safety-alert-bell/safety-alert-bell.component';
import { AlertPollingService } from '../../../core/services/alert-polling.service';
import { SafetyAlertService } from '../../../core/services/safety-alert.service';
import { AlertResponse, ResolveAlertRequest } from '../../../core/models/safety-alert.model';
import { RoleTheme } from '../../../shared/components/navbar.component';
import { DoctorAssignment, DoctorAssignmentStatus } from '../../../core/models/care-team.model';

@Component({
  selector: 'app-doctor-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ReactiveFormsModule, StatCardComponent, AlertCardComponent, NotificationBellComponent, SafetyAlertBellComponent],
  templateUrl: './doctor-dashboard.component.html',
  styleUrls: ['./doctor-dashboard.component.scss']
})
export class DoctorDashboardComponent implements OnInit, OnDestroy {
  doctorName = '';
  doctorId: string | null = null;
  private destroy$ = new Subject<void>();
  
  currentTheme: RoleTheme = {
    name: 'Doctor',
    primary: '#3b82f6',
    primaryLight: '#eff6ff',
    primaryDark: '#1d4ed8',
    gradientFrom: '#3b82f6',
    gradientTo: '#2563eb',
    borderColor: '#dbeafe',
    hoverBg: '#dbeafe',
    activeBg: '#3b82f6',
    activeText: '#ffffff'
  };
  
  // Doctor's assigned patients (from care-team)
  doctorAssignments: DoctorAssignment[] = [];
  assignedPatients: PatientProfileResponse[] = [];
  loadingPatients = false;
  
  /** Live text from care-team NewsAPI integration (when configured) */
  researchNewsPreview: string | null = null;
  /** Curated bullets when live news is unavailable (reads like content, not an error page) */
  researchCuratedBullets: string[] | null = null;
  /** Optional short line under curated list (non-technical, e.g. feed unavailable) */
  researchNewsFooterNote: string | null = null;
  /** True after first research-news request finishes */
  researchNewsLoaded = false;

  /** Shown when live headlines are unavailable; clinical tone only */
  private static readonly RESEARCH_CURATED_DEFAULT = [
    'Early Alzheimer\'s disease often includes memory changes that interfere with everyday activities — use standardized tools (e.g. MMSE/MoCA) alongside history when staging.',
    'Combine medication plans with non-pharmacologic support: structured routine, sleep hygiene, and caregiver education often improve safety and quality of life.',
    'Discuss advance care planning, driving, and supervision needs early; align with your institution\'s policies and local regulations.'
  ];

  /** PDF: doctor creates patient account */
  showCreatePatientModal = false;
  creatingPatient = false;
  createPatientForm: FormGroup;
  lastGeneratedPatientPassword: string | null = null;

  // Safety alerts
  escalatedAlerts: AlertResponse[] = [];
  resolvingAlertId: string | null = null;
  resolveNotes = '';
  resolutionType = 'CHECKED_OK';
  resolveSubmitting = false;
  acknowledgeAlertId: string | null = null;
  acknowledgeNotes = '';
  acknowledgeSubmitting = false;

  constructor(
    private authService: AuthService,
    private patientService: PatientService,
    private careTeamService: CareTeamService,
    private doctorPatientContext: DoctorPatientContextService,
    private doctorWorkflow: DoctorWorkflowService,
    private toastService: ToastService,
    private alertPolling: AlertPollingService,
    private safetyAlertService: SafetyAlertService,
    private fb: FormBuilder
  ) {
    const today = new Date();
    const defaultDob = new Date(today.getFullYear() - 72, 0, 1).toISOString().split('T')[0];
    this.createPatientForm = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      password: [''],
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      dateOfBirth: [defaultDob, Validators.required],
      gender: ['MALE', Validators.required],
      phone: [''],
      address: [''],
      emergencyContact: [''],
      diagnosisStage: ['']
    });
  }

  ngOnInit(): void {
    const currentUser = this.authService.getCurrentUser();

    if (currentUser) {
      this.doctorName = currentUser.name;
      this.doctorId = currentUser.id || null;

      // Load doctor's assigned patients from context service
      this.loadDoctorPatients();
      this.loadResearchNews();
    }

    this.authService.currentUser$.pipe(takeUntil(this.destroy$)).subscribe(user => {
      if (user) {
        this.doctorName = user.name;
      }
    });

    // Subscribe to alerts — show only those at DOCTOR or EMERGENCY_CONTACT level
    this.alertPolling.alerts$.pipe(takeUntil(this.destroy$)).subscribe(alerts => {
      this.escalatedAlerts = alerts.filter(
        a => a.currentLevel === 'DOCTOR' || a.currentLevel === 'EMERGENCY_CONTACT'
      ).slice(0, 5);
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

  private loadResearchNews(): void {
    this.researchNewsPreview = null;
    this.researchCuratedBullets = null;
    this.researchNewsFooterNote = null;
    this.researchNewsLoaded = false;
    this.careTeamService
      .researchNews()
      .pipe(
        catchError(() => of('__NETWORK_ERROR__')),
        finalize(() => {
          this.researchNewsLoaded = true;
        })
      )
      .subscribe((text) => {
        const useCurated = (footer: string | null = null) => {
          this.researchCuratedBullets = [...DoctorDashboardComponent.RESEARCH_CURATED_DEFAULT];
          this.researchNewsFooterNote = footer;
        };

        if (text === '__NETWORK_ERROR__') {
          useCurated('We couldn\'t load the latest headlines. The reminders below are still available.');
          return;
        }
        const t = (text || '').trim();
        if (!t) {
          useCurated(null);
          return;
        }
        if (t.startsWith('{')) {
          try {
            const j = JSON.parse(t) as { status?: string; message?: string };
            if (j.status === 'error' || /not configured|NEWS_API_KEY/i.test(String(j.message || ''))) {
              useCurated(null);
              return;
            }
          } catch {
            /* treat as non-JSON text below */
          }
        }
        this.researchNewsPreview = t.length > 800 ? `${t.slice(0, 800)}…` : t;
      });
  }

  loadDoctorPatients(): void {
    if (!this.doctorId) {
      this.toastService.error('Doctor ID not found', 'Error');
      return;
    }

    this.loadingPatients = true;
    
    // Load assignments and patients from context service
    this.doctorPatientContext.getActiveAssignments().pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (assignments) => {
        this.doctorAssignments = assignments;
      },
      error: (error) => {
        console.error('Error loading doctor assignments:', error);
        this.toastService.error('Failed to load your patient assignments', 'Error');
        this.doctorAssignments = [];
      }
    });

    this.doctorPatientContext.getAssignedPatients().pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (patients) => {
        this.assignedPatients = patients;
        this.loadingPatients = false;
      },
      error: (error) => {
        console.error('Error loading assigned patients:', error);
        this.toastService.error('Failed to load your patients', 'Error');
        this.assignedPatients = [];
        this.loadingPatients = false;
      }
    });
  }

  get patientCount(): number {
    return this.doctorAssignments.length;
  }

  getPatientFullName(assignment: DoctorAssignment): string {
    // First check if we have the patient in our assigned patients list
    const patient = this.assignedPatients.find(p => p.userId === assignment.patientId || p.id === assignment.patientId);
    if (patient?.firstName || patient?.lastName) {
      const full = `${patient.firstName || ''} ${patient.lastName || ''}`.trim();
      if (full.length > 0) return full;
    }
    
    // Fallback to assignment data
    if (assignment.patientFirstName && assignment.patientLastName) {
      return `${assignment.patientFirstName} ${assignment.patientLastName}`;
    }
    if (assignment.patientFirstName) {
      return assignment.patientFirstName;
    }
    
    const id = assignment.patientId;
    const short = id.length > 10 ? `${id.slice(0, 8)}…` : id;
    return `Patient (${short})`;
  }

  /** Avatar letter when we have a real first name */
  getPatientAvatarLetter(assignment: DoctorAssignment): string {
    const patient = this.assignedPatients.find(p => p.userId === assignment.patientId || p.id === assignment.patientId);
    if (patient?.firstName?.length) return patient.firstName.charAt(0).toUpperCase();
    if (assignment.patientFirstName?.length) {
      return assignment.patientFirstName.charAt(0).toUpperCase();
    }
    return '?';
  }

  getStatusClass(status: DoctorAssignmentStatus): string {
    switch (status) {
      case DoctorAssignmentStatus.ACTIVE:
        return 'bg-green-100 text-green-800';
      case DoctorAssignmentStatus.INACTIVE:
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  getAge(dateOfBirth: string | undefined): number {
    if (!dateOfBirth) return 0;
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  }

  openCreatePatientModal(): void {
    this.lastGeneratedPatientPassword = null;
    this.showCreatePatientModal = true;
  }

  closeCreatePatientModal(): void {
    this.showCreatePatientModal = false;
    this.creatingPatient = false;
  }

  submitCreatePatient(): void {
    if (!this.doctorId || this.createPatientForm.invalid) {
      this.toastService.warning('Please fill all required fields');
      return;
    }
    const v = this.createPatientForm.value;
    this.creatingPatient = true;
    this.lastGeneratedPatientPassword = null;
    this.doctorWorkflow
      .createPatientAsDoctor(this.doctorId, {
        username: v.username,
        email: v.email,
        password: v.password || undefined,
        firstName: v.firstName,
        lastName: v.lastName,
        dateOfBirth: v.dateOfBirth,
        gender: v.gender,
        phone: v.phone || undefined,
        address: v.address || undefined,
        emergencyContact: v.emergencyContact || undefined,
        diagnosisStage: v.diagnosisStage || undefined,
        emailVerified: true
      })
      .subscribe({
        next: (res) => {
          this.toastService.success('Patient created and assigned to you (PDF workflow)');
          if (res.generatedPassword) {
            this.lastGeneratedPatientPassword = res.generatedPassword;
            this.toastService.info('A temporary password was generated — copy it from the modal.', 'Password');
          }
          this.creatingPatient = false;
          // Refresh the patient context and reload
          this.doctorPatientContext.refreshAssignedPatients().pipe(
            takeUntil(this.destroy$)
          ).subscribe(() => {
            this.loadDoctorPatients();
          });
        },
        error: (err) => {
          const msg =
            err.error?.detail ||
            err.error?.message ||
            (typeof err.error === 'string' ? err.error : null) ||
            'Could not create patient';
          this.toastService.error(msg);
          this.creatingPatient = false;
        }
      });
  }
}
