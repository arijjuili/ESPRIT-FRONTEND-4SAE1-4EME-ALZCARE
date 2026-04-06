import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError, finalize, map, switchMap } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth.service';
import { DataService } from '../../../core/services/data.service';
import { PatientService, PatientProfileResponse } from '../../../core/services/patient.service';
import { CareTeamService } from '../../../core/services/care-team.service';
import { DoctorWorkflowService } from '../../../core/services/doctor-workflow.service';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { StatCardComponent } from '../../../shared/components/stat-card.component';
import { AlertCardComponent } from '../../../shared/components/alert-card.component';
import { NotificationBellComponent } from '../../../shared/components/notification-bell/notification-bell.component';
import { RoleTheme } from '../../../shared/components/navbar.component';
import { DoctorAssignment, DoctorAssignmentStatus } from '../../../core/models/care-team.model';

@Component({
  selector: 'app-doctor-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule, StatCardComponent, AlertCardComponent, NotificationBellComponent],
  templateUrl: './doctor-dashboard.component.html',
  styleUrls: ['./doctor-dashboard.component.scss']
})
export class DoctorDashboardComponent implements OnInit {
  doctorName = '';
  doctorId: string | null = null;
  
  // Role theme for notification bell (blue for doctor)
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
  
  // Doctor's assigned patients
  doctorAssignments: DoctorAssignment[] = [];
  /** Keycloak userId -> name from identity (care-team assignments rarely include patientFirstName/LastName) */
  patientProfilesByUserId: Record<string, { firstName: string; lastName: string }> = {};
  /** patientIds we looked up in identity but got no profile (orphan care-team rows, tests, or deleted users) */
  patientIdsMissingProfile = new Set<string>();
  loadingPatients = false;
  
  // Legacy data for compatibility
  patients: any[] = [];
  appointments: any[] = [];

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
    'Early Alzheimer’s disease often includes memory changes that interfere with everyday activities — use standardized tools (e.g. MMSE/MoCA) alongside history when staging.',
    'Combine medication plans with non-pharmacologic support: structured routine, sleep hygiene, and caregiver education often improve safety and quality of life.',
    'Discuss advance care planning, driving, and supervision needs early; align with your institution’s policies and local regulations.'
  ];

  /** PDF: doctor creates patient account */
  showCreatePatientModal = false;
  creatingPatient = false;
  createPatientForm: FormGroup;
  lastGeneratedPatientPassword: string | null = null;

  constructor(
    private authService: AuthService,
    private dataService: DataService,
    private patientService: PatientService,
    private careTeamService: CareTeamService,
    private doctorWorkflow: DoctorWorkflowService,
    private toastService: ToastService,
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
      
      // Get all patients and appointments (legacy)
      this.patients = this.dataService.getPatients();
      this.appointments = this.dataService.getAppointments();
      
      // Load doctor's assigned patients from care team service
      this.loadDoctorPatients();
      this.loadResearchNews();
    }
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
          useCurated('We couldn’t load the latest headlines. The reminders below are still available.');
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
    this.patientProfilesByUserId = {};
    this.patientIdsMissingProfile.clear();
    this.careTeamService
      .getDoctorPatients(this.doctorId)
      .pipe(
        switchMap((assignments) => {
          const active = assignments.filter((a) => a.status === DoctorAssignmentStatus.ACTIVE);
          const ids = [...new Set(active.map((a) => a.patientId))];
          if (ids.length === 0) {
            return of({
              active,
              rows: [] as { id: string; profile: PatientProfileResponse | null }[]
            });
          }
          return forkJoin(
            ids.map((id) =>
              this.patientService.getPatientById(id).pipe(
                map((profile) => ({ id, profile })),
                catchError(() => of({ id, profile: null as PatientProfileResponse | null }))
              )
            )
          ).pipe(map((rows) => ({ active, rows })));
        })
      )
      .subscribe({
        next: ({ active, rows }) => {
          this.patientProfilesByUserId = {};
          this.patientIdsMissingProfile.clear();
          for (const row of rows) {
            if (row.profile?.firstName != null || row.profile?.lastName != null) {
              this.patientProfilesByUserId[row.id] = {
                firstName: row.profile.firstName || '',
                lastName: row.profile.lastName || ''
              };
            } else {
              this.patientIdsMissingProfile.add(row.id);
            }
          }
          const hasDirectoryProfile = (patientId: string): boolean => {
            const p = this.patientProfilesByUserId[patientId];
            return !!(p && (p.firstName?.trim() || p.lastName?.trim()));
          };
          // Stale care-team rows (deleted Keycloak/identity users, API tests) must not appear
          this.doctorAssignments = active.filter((a) => hasDirectoryProfile(a.patientId));
          this.loadingPatients = false;
        },
        error: (error) => {
          console.error('Error loading doctor patients:', error);
          this.toastService.error('Failed to load your patients', 'Error');
          this.doctorAssignments = [];
          this.loadingPatients = false;
        }
      });
  }

  get patientCount(): number {
    return this.doctorAssignments.length;
  }

  getPatientFullName(assignment: DoctorAssignment): string {
    const prof = this.patientProfilesByUserId[assignment.patientId];
    if (prof) {
      const full = `${prof.firstName || ''} ${prof.lastName || ''}`.trim();
      if (full.length > 0) return full;
    }
    if (assignment.patientFirstName && assignment.patientLastName) {
      return `${assignment.patientFirstName} ${assignment.patientLastName}`;
    }
    if (assignment.patientFirstName) {
      return assignment.patientFirstName;
    }
    if (this.patientIdsMissingProfile.has(assignment.patientId)) {
      const id = assignment.patientId;
      const short = id.length > 10 ? `${id.slice(0, 8)}…` : id;
      return `Not in patient directory (${short})`;
    }
    return `Patient #${assignment.patientId}`;
  }

  /** Avatar letter when we have a real first name */
  getPatientAvatarLetter(assignment: DoctorAssignment): string {
    const prof = this.patientProfilesByUserId[assignment.patientId];
    if (prof?.firstName?.length) return prof.firstName.charAt(0).toUpperCase();
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

  getAge(dateOfBirth: Date): number {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  }

  getPatientName(patientId: string): string {
    const patient = this.patients.find(p => p.id === patientId);
    return patient ? patient.name : 'Unknown';
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
          this.loadDoctorPatients();
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
