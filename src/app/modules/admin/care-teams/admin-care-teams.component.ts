import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject, forkJoin, of } from 'rxjs';
import { takeUntil, catchError } from 'rxjs/operators';

import { CareTeamService } from '../../../core/services/care-team.service';
import { UserManagementService } from '../../../core/services/user-management.service';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../shared/components/toast/toast.service';
import {
  CaregiverAssignment,
  DoctorAssignment,
  ChecklistItem,
  CaregiverRole,
  AssignmentStatus,
  DoctorAssignmentStatus,
  ChecklistStatus,
  ChecklistPriority,
  ChecklistCategory,
  GenerateCaregiverInviteRequest,
  AssignDoctorRequest,
  ChecklistFilter
} from '../../../core/models/care-team.model';
import { ManagedUser } from '../../../core/models/user-management.model';

@Component({
  selector: 'app-admin-care-teams',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule],
  templateUrl: './admin-care-teams.component.html',
  styleUrls: ['./admin-care-teams.component.scss']
})
export class AdminCareTeamsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Tab management
  activeTab: 'caregivers' | 'doctors' | 'checklists' = 'caregivers';

  // Data
  caregiverAssignments: CaregiverAssignment[] = [];
  doctorAssignments: DoctorAssignment[] = [];
  checklistItems: ChecklistItem[] = [];

  // Loading states
  loading = false;
  loadingAction = false;

  // Error handling
  error: string | null = null;

  // Enums for template
  CaregiverRole = CaregiverRole;
  AssignmentStatus = AssignmentStatus;
  DoctorAssignmentStatus = DoctorAssignmentStatus;
  ChecklistStatus = ChecklistStatus;
  ChecklistPriority = ChecklistPriority;
  ChecklistCategory = ChecklistCategory;

  // Caregiver role options
  caregiverRoleOptions = [
    { value: CaregiverRole.PRIMARY, label: 'Primary', color: 'violet' },
    { value: CaregiverRole.FAMILY, label: 'Family', color: 'blue' },
    { value: CaregiverRole.EMERGENCY, label: 'Emergency', color: 'amber' }
  ];

  // Checklist filters
  checklistFilter: ChecklistFilter = {};
  filterDate: string = '';
  filterPatientId: string | '' = '';
  filterStatus: ChecklistStatus | '' = '';

  // Users for dropdowns
  patients: ManagedUser[] = [];
  caregivers: ManagedUser[] = [];
  doctors: ManagedUser[] = [];
  loadingUsers = false;

  // Name caches for resolving IDs to names
  private patientNameCache = new Map<string, string>();
  private caregiverNameCache = new Map<string, string>();
  private doctorNameCache = new Map<string, string>();
  private loadingNames = new Set<string>(); // Track IDs being fetched

  // Modal states
  showInviteModal = false;
  showAssignDoctorModal = false;
  showRevokeConfirmModal = false;
  showDeactivateConfirmModal = false;
  selectedAssignment: CaregiverAssignment | null = null;
  selectedDoctorAssignment: DoctorAssignment | null = null;

  // Forms
  inviteForm: FormGroup;
  assignDoctorForm: FormGroup;

  constructor(
    private careTeamService: CareTeamService,
    private userManagementService: UserManagementService,
    private apiService: ApiService,
    private toastService: ToastService,
    private fb: FormBuilder
  ) {
    this.inviteForm = this.fb.group({
      patientId: ['', [Validators.required]],
      caregiverId: ['', [Validators.required]],
      role: [CaregiverRole.FAMILY, [Validators.required]]
    });

    this.assignDoctorForm = this.fb.group({
      doctorId: ['', [Validators.required]],
      patientId: ['', [Validators.required]],
      notes: ['']
    });
  }

  ngOnInit(): void {
    this.loadCaregiverAssignments();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ==================== TAB MANAGEMENT ====================

  setActiveTab(tab: 'caregivers' | 'doctors' | 'checklists'): void {
    this.activeTab = tab;
    this.error = null;

    switch (tab) {
      case 'caregivers':
        this.loadCaregiverAssignments();
        break;
      case 'doctors':
        this.loadDoctorAssignments();
        break;
      case 'checklists':
        this.loadUsers();
        this.loadChecklistItems();
        break;
    }
  }

  // ==================== DATA LOADING ====================

  loadCaregiverAssignments(): void {
    this.loading = true;
    this.error = null;

    this.careTeamService.getAllCaregiverAssignments()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (assignments) => {
          this.caregiverAssignments = assignments;
          this.loading = false;
        },
        error: (err) => {
          console.error('Failed to load caregiver assignments:', err);
          this.error = 'Failed to load caregiver assignments. Please try again.';
          this.loading = false;
          this.toastService.error('Failed to load caregiver assignments');
        }
      });
  }

  loadDoctorAssignments(): void {
    this.loading = true;
    this.error = null;

    this.careTeamService.getAllDoctorAssignments()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (assignments) => {
          this.doctorAssignments = assignments;
          this.loading = false;
        },
        error: (err) => {
          console.error('Failed to load doctor assignments:', err);
          this.error = 'Failed to load doctor assignments. Please try again.';
          this.loading = false;
          this.toastService.error('Failed to load doctor assignments');
        }
      });
  }

  loadChecklistItems(): void {
    this.loading = true;
    this.error = null;

    const filter: ChecklistFilter = {
      patientId: this.filterPatientId || undefined,
      date: this.filterDate || undefined,
      status: this.filterStatus || undefined
    };

    this.careTeamService.getChecklistItems(filter)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (items) => {
          this.checklistItems = items;
          this.loading = false;
        },
        error: (err) => {
          console.error('Failed to load checklist items:', err);
          this.error = 'Failed to load checklist items. Please try again.';
          this.loading = false;
          this.toastService.error('Failed to load checklist items');
        }
      });
  }

  // ==================== USER LOADING FOR DROPDOWNS ====================

  loadUsers(): void {
    this.loadingUsers = true;

    // Load patients, caregivers, and doctors in parallel
    forkJoin({
      patients: this.userManagementService.getUsers({ role: 'PATIENT' }, 0, 100).pipe(
        catchError(err => {
          console.error('Failed to load patients:', err);
          return of({ content: [], totalElements: 0 });
        })
      ),
      caregivers: this.userManagementService.getUsers({ role: 'CAREGIVER' }, 0, 100).pipe(
        catchError(err => {
          console.error('Failed to load caregivers:', err);
          return of({ content: [], totalElements: 0 });
        })
      ),
      doctors: this.userManagementService.getUsers({ role: 'DOCTOR' }, 0, 100).pipe(
        catchError(err => {
          console.error('Failed to load doctors:', err);
          return of({ content: [], totalElements: 0 });
        })
      )
    })
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (results) => {
        this.patients = results.patients.content;
        this.caregivers = results.caregivers.content;
        this.doctors = results.doctors.content;
        this.loadingUsers = false;
      },
      error: (err) => {
        console.error('Failed to load users:', err);
        this.toastService.error('Failed to load users for dropdowns');
        this.loadingUsers = false;
      }
    });
  }

  // ==================== CAREGIVER ACTIONS ====================

  openInviteModal(): void {
    this.inviteForm.reset({
      role: CaregiverRole.FAMILY
    });
    this.loadUsers();
    this.showInviteModal = true;
  }

  closeInviteModal(): void {
    this.showInviteModal = false;
    this.inviteForm.reset();
  }

  generateInvite(): void {
    if (this.inviteForm.invalid) {
      this.toastService.warning('Please select a patient and caregiver');
      return;
    }

    const patientId = this.inviteForm.value.patientId;
    const caregiverId = this.inviteForm.value.caregiverId;
    
    // Validation for UUID strings
    if (!patientId || !caregiverId) {
      this.toastService.warning('Please select a valid patient and caregiver');
      return;
    }

    // Check for existing active or pending assignment
    const existingAssignment = this.caregiverAssignments.find(
      a => a.patientId === patientId && 
           a.caregiverId === caregiverId && 
           (a.status === AssignmentStatus.ACTIVE || a.status === AssignmentStatus.PENDING)
    );

    if (existingAssignment) {
      const statusText = existingAssignment.status === AssignmentStatus.ACTIVE ? 'active' : 'pending';
      this.toastService.warning(
        `This caregiver already has a ${statusText} assignment to this patient`,
        'Duplicate Assignment'
      );
      return;
    }

    this.loadingAction = true;
    const request: GenerateCaregiverInviteRequest = {
      patientId: patientId,
      caregiverId: caregiverId,
      role: this.inviteForm.value.role
    };

    this.careTeamService.generateCaregiverInvite(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.toastService.success('Caregiver invite generated successfully');
          this.closeInviteModal();
          this.loadCaregiverAssignments();
          this.loadingAction = false;
        },
        error: (err) => {
          console.error('Failed to generate invite:', err);
          this.toastService.error(err.error?.detail || 'Failed to generate invite');
          this.loadingAction = false;
        }
      });
  }

  changeCaregiverRole(assignment: CaregiverAssignment, newRole: CaregiverRole): void {
    if (assignment.role === newRole) return;

    this.loadingAction = true;
    this.careTeamService.changeCaregiverRole(assignment.id, { role: newRole })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updated) => {
          const index = this.caregiverAssignments.findIndex(a => a.id === updated.id);
          if (index !== -1) {
            this.caregiverAssignments[index] = updated;
          }
          this.toastService.success(`Caregiver role changed to ${newRole}`);
          this.loadingAction = false;
        },
        error: (err) => {
          console.error('Failed to change role:', err);
          this.toastService.error(err.error?.detail || 'Failed to change role');
          this.loadingAction = false;
        }
      });
  }

  openRevokeConfirmModal(assignment: CaregiverAssignment): void {
    this.selectedAssignment = assignment;
    this.showRevokeConfirmModal = true;
  }

  closeRevokeConfirmModal(): void {
    this.showRevokeConfirmModal = false;
    this.selectedAssignment = null;
  }

  revokeAccess(): void {
    if (!this.selectedAssignment) return;

    this.loadingAction = true;
    this.careTeamService.revokeCaregiverAccess(this.selectedAssignment.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          const index = this.caregiverAssignments.findIndex(a => a.id === this.selectedAssignment!.id);
          if (index !== -1) {
            this.caregiverAssignments[index].status = AssignmentStatus.REVOKED;
          }
          this.toastService.success('Caregiver access revoked successfully');
          this.closeRevokeConfirmModal();
          this.loadingAction = false;
        },
        error: (err) => {
          console.error('Failed to revoke access:', err);
          this.toastService.error(err.error?.detail || 'Failed to revoke access');
          this.loadingAction = false;
        }
      });
  }

  // ==================== DOCTOR ACTIONS ====================

  openAssignDoctorModal(): void {
    this.assignDoctorForm.reset();
    this.loadUsers();
    this.showAssignDoctorModal = true;
  }

  closeAssignDoctorModal(): void {
    this.showAssignDoctorModal = false;
    this.assignDoctorForm.reset();
  }

  assignDoctor(): void {
    if (this.assignDoctorForm.invalid) {
      this.toastService.warning('Please select a doctor and patient');
      return;
    }

    const doctorId = this.assignDoctorForm.value.doctorId;
    const patientId = this.assignDoctorForm.value.patientId;
    
    // Validation for UUID strings
    if (!doctorId || !patientId) {
      this.toastService.warning('Please select a valid doctor and patient');
      return;
    }

    // Check for existing active assignment
    const existingAssignment = this.doctorAssignments.find(
      a => a.patientId === patientId && 
           a.doctorId === doctorId && 
           a.status === DoctorAssignmentStatus.ACTIVE
    );

    if (existingAssignment) {
      this.toastService.warning(
        'This doctor is already actively assigned to this patient',
        'Duplicate Assignment'
      );
      return;
    }

    this.loadingAction = true;
    const request: AssignDoctorRequest = {
      patientId: patientId,
      notes: this.assignDoctorForm.value.notes
    };

    this.careTeamService.assignDoctorToPatient(doctorId, request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toastService.success('Doctor assigned to patient successfully');
          this.closeAssignDoctorModal();
          this.loadDoctorAssignments();
          this.loadingAction = false;
        },
        error: (err) => {
          console.error('Failed to assign doctor:', err);
          this.toastService.error(err.error?.detail || 'Failed to assign doctor');
          this.loadingAction = false;
        }
      });
  }

  openDeactivateConfirmModal(assignment: DoctorAssignment): void {
    this.selectedDoctorAssignment = assignment;
    this.showDeactivateConfirmModal = true;
  }

  closeDeactivateConfirmModal(): void {
    this.showDeactivateConfirmModal = false;
    this.selectedDoctorAssignment = null;
  }

  deactivateAssignment(): void {
    if (!this.selectedDoctorAssignment) return;

    this.loadingAction = true;
    this.careTeamService.deactivateDoctorAssignment(this.selectedDoctorAssignment.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updated) => {
          const index = this.doctorAssignments.findIndex(a => a.id === updated.id);
          if (index !== -1) {
            this.doctorAssignments[index] = updated;
          }
          this.toastService.success('Doctor assignment deactivated successfully');
          this.closeDeactivateConfirmModal();
          this.loadingAction = false;
        },
        error: (err) => {
          console.error('Failed to deactivate assignment:', err);
          this.toastService.error(err.error?.detail || 'Failed to deactivate assignment');
          this.loadingAction = false;
        }
      });
  }

  // ==================== CHECKLIST FILTER ACTIONS ====================

  applyChecklistFilters(): void {
    this.loadChecklistItems();
  }

  clearChecklistFilters(): void {
    this.filterDate = '';
    this.filterPatientId = '';
    this.filterStatus = '';
    this.loadChecklistItems();
  }

  // ==================== UTILITY METHODS ====================

  getCaregiverRoleClass(role: CaregiverRole): string {
    const classes: Record<string, string> = {
      [CaregiverRole.PRIMARY]: 'bg-violet-100 text-violet-700 border-violet-200',
      [CaregiverRole.FAMILY]: 'bg-blue-100 text-blue-700 border-blue-200',
      [CaregiverRole.EMERGENCY]: 'bg-amber-100 text-amber-700 border-amber-200'
    };
    return classes[role] || 'bg-gray-100 text-gray-700 border-gray-200';
  }

  getAssignmentStatusClass(status: AssignmentStatus): string {
    const classes: Record<string, string> = {
      [AssignmentStatus.ACTIVE]: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      [AssignmentStatus.PENDING]: 'bg-amber-100 text-amber-700 border-amber-200',
      [AssignmentStatus.REVOKED]: 'bg-red-100 text-red-700 border-red-200'
    };
    return classes[status] || 'bg-gray-100 text-gray-700 border-gray-200';
  }

  getDoctorStatusClass(status: DoctorAssignmentStatus): string {
    const classes: Record<string, string> = {
      [DoctorAssignmentStatus.ACTIVE]: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      [DoctorAssignmentStatus.INACTIVE]: 'bg-gray-100 text-gray-600 border-gray-200'
    };
    return classes[status] || 'bg-gray-100 text-gray-700 border-gray-200';
  }

  getChecklistStatusClass(status: ChecklistStatus): string {
    const classes: Record<string, string> = {
      [ChecklistStatus.PENDING]: 'bg-gray-100 text-gray-600 border-gray-200',
      [ChecklistStatus.ASSIGNED]: 'bg-blue-100 text-blue-700 border-blue-200',
      [ChecklistStatus.COMPLETED]: 'bg-emerald-100 text-emerald-700 border-emerald-200'
    };
    return classes[status] || 'bg-gray-100 text-gray-700 border-gray-200';
  }

  getPriorityClass(priority: ChecklistPriority): string {
    const classes: Record<string, string> = {
      [ChecklistPriority.LOW]: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      [ChecklistPriority.MEDIUM]: 'bg-amber-100 text-amber-700 border-amber-200',
      [ChecklistPriority.HIGH]: 'bg-red-100 text-red-700 border-red-200'
    };
    return classes[priority] || 'bg-gray-100 text-gray-700 border-gray-200';
  }

  formatDate(dateString?: string): string {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  formatDateTime(dateString?: string): string {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getFullName(firstName?: string, lastName?: string): string {
    if (!firstName && !lastName) return 'Unknown';
    return `${firstName || ''} ${lastName || ''}`.trim();
  }

  // ==================== NAME RESOLUTION WITH CACHE ====================

  getPatientName(patientId?: string | null): string {
    if (!patientId) return 'Unknown';
    
    // Check cache first
    if (this.patientNameCache.has(patientId)) {
      return this.patientNameCache.get(patientId)!;
    }
    
    // Check user list
    const patient = this.patients.find(p => p.id === patientId);
    if (patient) {
      const name = this.getFullName(patient.firstName, patient.lastName);
      this.patientNameCache.set(patientId, name);
      return name;
    }
    
    // Fetch from API if not in cache and not already loading
    if (!this.loadingNames.has('patient:' + patientId)) {
      this.loadingNames.add('patient:' + patientId);
      this.apiService.getPatientByKeycloakId(patientId).pipe(
        takeUntil(this.destroy$),
        catchError(() => of(null))
      ).subscribe(patient => {
        if (patient) {
          const name = this.getFullName(patient.firstName, patient.lastName);
          this.patientNameCache.set(patientId, name);
        } else {
          this.patientNameCache.set(patientId, 'Unknown');
        }
        this.loadingNames.delete('patient:' + patientId);
      });
    }
    
    return 'Loading...';
  }

  getPatientInitial(patientId?: string | null): string {
    const name = this.getPatientName(patientId);
    if (name === 'Loading...' || name === 'Unknown') return '?';
    return name.charAt(0);
  }

  getDoctorName(doctorId?: string | null): string {
    if (!doctorId) return 'Unknown';
    
    // Check cache first
    if (this.doctorNameCache.has(doctorId)) {
      return this.doctorNameCache.get(doctorId)!;
    }
    
    // Check user list
    const doctor = this.doctors.find(d => d.id === doctorId);
    if (doctor) {
      const name = 'Dr. ' + this.getFullName(doctor.firstName, doctor.lastName);
      this.doctorNameCache.set(doctorId, name);
      return name;
    }
    
    // Fetch from API if not in cache and not already loading
    if (!this.loadingNames.has('doctor:' + doctorId)) {
      this.loadingNames.add('doctor:' + doctorId);
      this.apiService.getDoctorByUserId(doctorId).pipe(
        takeUntil(this.destroy$),
        catchError(() => of(null))
      ).subscribe(doctor => {
        if (doctor) {
          const name = 'Dr. ' + this.getFullName(doctor.firstName, doctor.lastName);
          this.doctorNameCache.set(doctorId, name);
        } else {
          this.doctorNameCache.set(doctorId, 'Unknown Doctor');
        }
        this.loadingNames.delete('doctor:' + doctorId);
      });
    }
    
    return 'Loading...';
  }

  getDoctorInitial(doctorId?: string | null): string {
    const name = this.getDoctorName(doctorId);
    if (name === 'Loading...' || name === 'Unknown Doctor') return '?';
    // Skip "Dr. " prefix to get actual name initial
    return name.replace('Dr. ', '').charAt(0);
  }

  getCaregiverName(caregiverId?: string | null): string {
    if (!caregiverId) return 'Unknown';
    
    // Check cache first
    if (this.caregiverNameCache.has(caregiverId)) {
      return this.caregiverNameCache.get(caregiverId)!;
    }
    
    // Check user list
    const caregiver = this.caregivers.find(c => c.id === caregiverId);
    if (caregiver) {
      const name = this.getFullName(caregiver.firstName, caregiver.lastName);
      this.caregiverNameCache.set(caregiverId, name);
      return name;
    }
    
    // Fetch from API if not in cache and not already loading
    if (!this.loadingNames.has('caregiver:' + caregiverId)) {
      this.loadingNames.add('caregiver:' + caregiverId);
      this.apiService.getCaregiverByUserId(caregiverId).pipe(
        takeUntil(this.destroy$),
        catchError(() => of(null))
      ).subscribe(caregiver => {
        if (caregiver) {
          const name = this.getFullName(caregiver.firstName, caregiver.lastName);
          this.caregiverNameCache.set(caregiverId, name);
        } else {
          this.caregiverNameCache.set(caregiverId, 'Unknown');
        }
        this.loadingNames.delete('caregiver:' + caregiverId);
      });
    }
    
    return 'Loading...';
  }

  getCaregiverInitial(caregiverId?: string | null): string {
    const name = this.getCaregiverName(caregiverId);
    if (name === 'Loading...' || name === 'Unknown') return '?';
    return name.charAt(0);
  }
}
