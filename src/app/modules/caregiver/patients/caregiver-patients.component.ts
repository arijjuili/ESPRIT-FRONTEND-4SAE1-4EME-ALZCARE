import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Subject, forkJoin, of } from 'rxjs';
import { takeUntil, catchError, map } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth.service';
import { PatientService, PatientProfileResponse } from '../../../core/services/patient.service';
import { CareTeamService } from '../../../core/services/care-team.service';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { NotificationBellComponent } from '../../../shared/components/notification-bell/notification-bell.component';
import { RoleTheme } from '../../../shared/components/navbar.component';
import { CaregiverAssignment, CaregiverRole, AssignmentStatus } from '../../../core/models/care-team.model';

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
  imports: [CommonModule, RouterLink, NotificationBellComponent],
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
    private router: Router
  ) {}

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
    const patientRequests = assignments.map(assignment => 
      this.patientService.getPatientById(assignment.patientId).pipe(
        map(patient => ({ patient, assignment })),
        catchError(error => {
          console.error(`Failed to load patient ${assignment.patientId}:`, error);
          // Return patient with basic info from assignment if profile fetch fails
          return of({
            patient: {
              id: assignment.patientId,
              userId: assignment.patientId,
              firstName: assignment.patientFirstName || 'Unknown',
              lastName: assignment.patientLastName || 'Patient'
            } as PatientProfileResponse,
            assignment
          });
        })
      )
    );

    forkJoin(patientRequests)
      .pipe(takeUntil(this.destroy$))
      .subscribe(results => {
        this.patients = results.map(({ patient, assignment }) => ({
          ...patient,
          assignment,
          age: this.calculateAge(patient.dateOfBirth),
          photoUrl: undefined // Will be populated when photo service is available
        })).sort((a, b) => 
          // Sort by role priority: PRIMARY first, then FAMILY, then EMERGENCY
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
}
