import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, forkJoin, of } from 'rxjs';
import { takeUntil, catchError, map } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth.service';
import { PatientService, PatientProfileResponse } from '../../../core/services/patient.service';
import { CareTeamService } from '../../../core/services/care-team.service';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { NotificationBellComponent } from '../../../shared/components/notification-bell/notification-bell.component';
import { RoleTheme } from '../../../shared/components/navbar.component';
import {
  CaregiverAssignment,
  CaregiverRole,
  AssignmentStatus,
  CaregiverPermissionsDto,
  CaregiverAvailabilitySlotDto
} from '../../../core/models/care-team.model';

/**
 * Extended patient interface with assignment and computed fields
 */
interface PatientWithAssignment extends PatientProfileResponse {
  assignment: CaregiverAssignment;
  age?: number;
  photoUrl?: string;
}

@Component({
  selector: 'app-caregiver-patients',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, ReactiveFormsModule, NotificationBellComponent],
  templateUrl: './caregiver-patients.component.html',
  styleUrls: ['./caregiver-patients.component.scss']
})
export class CaregiverPatientsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  caregiverName = '';
  caregiverId = '';
  
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
  
  // Patients data
  patients: PatientWithAssignment[] = [];
  loading = false;
  error: string | null = null;

  /** Coordination modal (permissions, availability, mark unavailable) */
  showCoordinationModal = false;
  coordinationPatient: PatientWithAssignment | null = null;
  coordinationPermissions: CaregiverPermissionsDto | null = null;
  coordinationSlots: CaregiverAvailabilitySlotDto[] = [];
  loadingCoordination = false;
  showUnavailableForm = false;
  unavailableForm: FormGroup;
  savingUnavailable = false;

  /** PDF: primary caregiver invites family / emergency */
  showInviteModal = false;
  invitePatient: PatientWithAssignment | null = null;
  inviteRole: CaregiverRole = CaregiverRole.FAMILY;
  generatingInvite = false;
  lastInviteUrl: string | null = null;
  
  // Enums for template access
  CaregiverRole = CaregiverRole;
  
  // Role badge colors
  roleColors: Record<CaregiverRole, string> = {
    [CaregiverRole.PRIMARY]: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    [CaregiverRole.FAMILY]: 'bg-blue-100 text-blue-800 border-blue-200',
    [CaregiverRole.EMERGENCY]: 'bg-rose-100 text-rose-800 border-rose-200'
  };

  constructor(
    private authService: AuthService,
    private patientService: PatientService,
    private careTeamService: CareTeamService,
    private toastService: ToastService,
    private router: Router,
    private fb: FormBuilder
  ) {
    this.unavailableForm = this.fb.group({
      from: ['', Validators.required],
      to: ['', Validators.required],
      reason: ['']
    });
  }

  ngOnInit(): void {
    const currentUser = this.authService.getCurrentUser();
    
    if (currentUser) {
      this.caregiverName = currentUser.name;
      this.caregiverId = currentUser.id;
      this.loadPatients();
    } else {
      this.error = 'User not authenticated';
      this.toastService.error('Please log in to view your patients', 'Authentication Error');
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load caregiver assignments and then fetch patient profiles
   */
  loadPatients(): void {
    if (!this.caregiverId) {
      this.error = 'Caregiver ID not found';
      return;
    }

    this.loading = true;
    this.error = null;

    this.careTeamService.getCaregiverAssignments(this.caregiverId)
      .pipe(
        takeUntil(this.destroy$),
        catchError(error => {
          console.error('Failed to load caregiver assignments:', error);
          this.error = 'Failed to load your patient assignments';
          this.toastService.error('Failed to load your patients', 'Error');
          return of([]);
        })
      )
      .subscribe(assignments => {
        // Filter only active assignments
        const activeAssignments = assignments.filter(
          a => a.status === AssignmentStatus.ACTIVE
        );
        
        if (activeAssignments.length === 0) {
          this.patients = [];
          this.loading = false;
          return;
        }

        // Load patient profiles for each assignment
        this.loadPatientProfiles(activeAssignments);
      });
  }

  /**
   * Load patient profiles from IDs in assignments
   */
  private loadPatientProfiles(assignments: CaregiverAssignment[]): void {
    const patientRequests = assignments.map((assignment) =>
      this.patientService.getPatientById(assignment.patientId).pipe(
        map((patient) => ({ patient, assignment })),
        catchError(() => {
          // No Keycloak/identity user — hide stale care-team assignment (same as doctor dashboard)
          return of(null);
        })
      )
    );

    forkJoin(patientRequests)
      .pipe(takeUntil(this.destroy$))
      .subscribe((results) => {
        const rows = results.filter(
          (r): r is { patient: PatientProfileResponse; assignment: CaregiverAssignment } => r !== null
        );
        this.patients = rows
          .map(({ patient, assignment }) => ({
            ...patient,
            assignment,
            age: this.calculateAge(patient.dateOfBirth),
            photoUrl: undefined
          }))
          .sort(
            (a, b) =>
              this.getRolePriority(a.assignment.role) - this.getRolePriority(b.assignment.role)
          );

        this.loading = false;
      });
  }

  /**
   * Calculate age from date of birth
   */
  private calculateAge(dateOfBirth?: string): number | undefined {
    if (!dateOfBirth) return undefined;
    
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  }

  /**
   * Get priority number for role sorting (lower = higher priority)
   */
  private getRolePriority(role: CaregiverRole): number {
    switch (role) {
      case CaregiverRole.PRIMARY: return 1;
      case CaregiverRole.FAMILY: return 2;
      case CaregiverRole.EMERGENCY: return 3;
      default: return 4;
    }
  }

  /**
   * Get CSS classes for role badge
   */
  getRoleBadgeClass(role: CaregiverRole): string {
    return this.roleColors[role] || 'bg-gray-100 text-gray-800 border-gray-200';
  }

  /**
   * Get display label for role
   */
  getRoleLabel(role: CaregiverRole): string {
    const labels: Record<CaregiverRole, string> = {
      [CaregiverRole.PRIMARY]: 'PRIMARY CAREGIVER',
      [CaregiverRole.FAMILY]: 'FAMILY MEMBER',
      [CaregiverRole.EMERGENCY]: 'EMERGENCY CONTACT'
    };
    return labels[role] || role;
  }

  /**
   * Get initials for avatar placeholder
   */
  getPatientInitials(patient: PatientWithAssignment): string {
    const first = patient.firstName?.charAt(0) || '';
    const last = patient.lastName?.charAt(0) || '';
    return (first + last).toUpperCase() || '?';
  }

  /**
   * Get full display name for patient
   */
  getPatientFullName(patient: PatientWithAssignment): string {
    return `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || 'Unknown Patient';
  }

  /**
   * Get gender display with icon
   */
  getGenderDisplay(gender?: string): string {
    if (!gender) return '';
    const displayMap: Record<string, string> = {
      'MALE': '👨 Male',
      'FEMALE': '👩 Female',
      'OTHER': '⚧ Other',
      'PREFER_NOT_TO_SAY': 'Not specified'
    };
    return displayMap[gender.toUpperCase()] || gender;
  }

  /**
   * View patient details
   */
  viewPatientDetails(patientId: string): void {
    // Navigate to patient detail view when available
    // For now, navigate to tasks with patient filter
    this.router.navigate(['/caregiver/tasks'], { queryParams: { patientId } });
  }

  /**
   * Navigate to behavior log form for patient
   */
  logBehavior(patientId: string): void {
    this.router.navigate(['/caregiver/behaviors', patientId]);
  }

  /**
   * Refresh patients list
   */
  refresh(): void {
    this.loadPatients();
    this.toastService.info('Refreshing patient list...', 'Refresh');
  }

  /**
   * Get border color class based on role
   */
  getCardBorderClass(role: CaregiverRole): string {
    switch (role) {
      case CaregiverRole.PRIMARY: return 'border-emerald-300';
      case CaregiverRole.FAMILY: return 'border-blue-300';
      case CaregiverRole.EMERGENCY: return 'border-rose-300';
      default: return 'border-gray-200';
    }
  }

  /**
   * Get background tint class based on role
   */
  getCardBgClass(role: CaregiverRole): string {
    switch (role) {
      case CaregiverRole.PRIMARY: return 'bg-emerald-50/50';
      case CaregiverRole.FAMILY: return 'bg-blue-50/50';
      case CaregiverRole.EMERGENCY: return 'bg-rose-50/50';
      default: return 'bg-white';
    }
  }

  /**
   * Get count of patients for a specific role
   */
  getRoleCount(role: CaregiverRole): number {
    return this.patients.filter(p => p.assignment.role === role).length;
  }

  /**
   * Get count of unique roles assigned
   */
  getUniqueRoleCount(): number {
    const roles = new Set(this.patients.map(p => p.assignment.role));
    return roles.size;
  }

  openCoordination(patient: PatientWithAssignment): void {
    this.coordinationPatient = patient;
    this.coordinationPermissions = null;
    this.coordinationSlots = [];
    this.showUnavailableForm = false;
    this.unavailableForm.reset();
    this.showCoordinationModal = true;
    this.loadCoordinationData(patient);
  }

  closeCoordination(): void {
    this.showCoordinationModal = false;
    this.coordinationPatient = null;
    this.showUnavailableForm = false;
  }

  private loadCoordinationData(patient: PatientWithAssignment): void {
    this.loadingCoordination = true;
    const pid = patient.assignment.patientId;
    forkJoin({
      permissions: this.careTeamService.getCaregiverPermissions(this.caregiverId, pid).pipe(
        catchError(() => of(null))
      ),
      availability: this.careTeamService.getCaregiverAvailability(this.caregiverId).pipe(
        catchError(() => of([] as CaregiverAvailabilitySlotDto[]))
      )
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ permissions, availability }) => {
          this.coordinationPermissions = permissions;
          this.coordinationSlots = availability.filter((s) => s.patientId === pid);
          this.loadingCoordination = false;
        },
        error: () => {
          this.loadingCoordination = false;
        }
      });
  }

  toggleUnavailableForm(): void {
    this.showUnavailableForm = !this.showUnavailableForm;
    if (!this.showUnavailableForm) {
      this.unavailableForm.reset();
    }
  }

  private toLocalDateTimeIso(raw: string): string {
    if (!raw) return raw;
    return raw.length === 16 ? `${raw}:00` : raw;
  }

  submitUnavailable(): void {
    if (!this.coordinationPatient || this.unavailableForm.invalid) {
      this.toastService.warning('Fill in start and end time');
      return;
    }
    const v = this.unavailableForm.value;
    const from = this.toLocalDateTimeIso(v.from);
    const to = this.toLocalDateTimeIso(v.to);
    this.savingUnavailable = true;
    this.careTeamService
      .markCaregiverUnavailable(this.coordinationPatient.assignment.id, {
        from,
        to,
        reason: v.reason || ''
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toastService.success('Unavailability saved');
          this.savingUnavailable = false;
          this.showUnavailableForm = false;
          this.unavailableForm.reset();
          this.loadCoordinationData(this.coordinationPatient!);
          this.loadPatients();
        },
        error: (err) => {
          this.toastService.error(err.error?.message || 'Could not save');
          this.savingUnavailable = false;
        }
      });
  }

  permissionEntries(): { key: string; value: boolean }[] {
    const p = this.coordinationPermissions?.permissions;
    if (!p) return [];
    return Object.keys(p).map((key) => ({ key, value: !!p[key] }));
  }

  isPrimaryCaregiver(patient: PatientWithAssignment): boolean {
    return patient.assignment.role === CaregiverRole.PRIMARY;
  }

  openInviteModal(patient: PatientWithAssignment): void {
    if (!this.isPrimaryCaregiver(patient)) return;
    this.invitePatient = patient;
    this.inviteRole = CaregiverRole.FAMILY;
    this.lastInviteUrl = null;
    this.showInviteModal = true;
  }

  closeInviteModal(): void {
    this.showInviteModal = false;
    this.invitePatient = null;
    this.generatingInvite = false;
    this.lastInviteUrl = null;
  }

  submitGenerateInvite(): void {
    if (!this.invitePatient) return;
    const pid = this.invitePatient.assignment.patientId;
    this.generatingInvite = true;
    this.lastInviteUrl = null;
    this.careTeamService
      .generateCaregiverInvite({ patientId: pid, role: this.inviteRole })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.lastInviteUrl = res.inviteUrl;
          this.toastService.success('Invite link created — share it with the new caregiver');
          this.generatingInvite = false;
        },
        error: (err) => {
          const msg =
            err.error?.message ||
            err.error?.detail ||
            (typeof err.error === 'string' ? err.error : null) ||
            'Could not create invite';
          this.toastService.error(msg);
          this.generatingInvite = false;
        }
      });
  }

  copyInviteUrl(): void {
    if (!this.lastInviteUrl) return;
    void navigator.clipboard.writeText(this.lastInviteUrl).then(
      () => this.toastService.success('Link copied'),
      () => this.toastService.warning('Copy failed — select the link manually')
    );
  }
}
