import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, SlicePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Subject, of, forkJoin } from 'rxjs';
import { takeUntil, catchError, switchMap, map } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth.service';
import { DataService } from '../../../core/services/data.service';
import { MedicalFollowupService } from '../../../core/services/medical-followup.service';
import { SafetyAlertService } from '../../../core/services/safety-alert.service';
import { PatientService, PatientProfileResponse } from '../../../core/services/patient.service';
import { CareTeamService } from '../../../core/services/care-team.service';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { StatCardComponent } from '../../../shared/components/stat-card.component';
import { AlertCardComponent } from '../../../shared/components/alert-card.component';
import { AppointmentRequestCardComponent } from '../../../shared/components/appointment-request-card.component';
import { BehaviorLogFormComponent } from '../../../shared/components/behavior-log-form.component';
import { NotificationBellComponent } from '../../../shared/components/notification-bell/notification-bell.component';
import { RoleTheme } from '../../../shared/components/navbar.component';
import { CareTask } from '../../../core/models/user.model';
import { Appointment } from '../../../core/models/medical-followup.model';
import { BehaviorLogResponse, BehaviorSeverity } from '../../../core/models/safety-alert.model';
import { CaregiverAssignment, CaregiverRole, AssignmentStatus } from '../../../core/models/care-team.model';

@Component({
  selector: 'app-caregiver-dashboard',
  standalone: true,
  imports: [CommonModule, SlicePipe, RouterLink, StatCardComponent, AlertCardComponent, AppointmentRequestCardComponent, BehaviorLogFormComponent, NotificationBellComponent],
  templateUrl: './caregiver-dashboard.component.html',
  styleUrls: ['./caregiver-dashboard.component.scss']
})
export class CaregiverDashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
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

  // Enums for template
  CaregiverRole = CaregiverRole;

  // Role badge colors
  roleColors: Record<CaregiverRole, string> = {
    [CaregiverRole.PRIMARY]: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    [CaregiverRole.FAMILY]: 'bg-blue-100 text-blue-800 border-blue-200',
    [CaregiverRole.EMERGENCY]: 'bg-rose-100 text-rose-800 border-rose-200'
  };

  constructor(
    private authService: AuthService, 
    private dataService: DataService,
    private medicalService: MedicalFollowupService,
    private safetyAlertService: SafetyAlertService,
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
      
      // Get tasks assigned to this caregiver (still from mock for now)
      this.allTasks = this.dataService.getTasksForCaregiver(currentUser.id);
      
      // Load real patients from backend
      this.loadRealPatients();
      
      // Load caregiver assignments (My Patients section)
      this.loadCaregiverAssignments();
    }
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadRealPatients(): void {
    // First load caregiver assignments, then fetch only assigned patients
    this.careTeamService.getCaregiverAssignments(this.caregiverId)
      .pipe(
        takeUntil(this.destroy$),
        switchMap(assignments => {
          // Filter only ACTIVE assignments
          const activeAssignments = assignments.filter(a => a.status === AssignmentStatus.ACTIVE);
          this.caregiverAssignments = activeAssignments;
          
          // Get unique patient IDs from assignments
          const patientIds = [...new Set(activeAssignments.map(a => a.patientId))];
          
          if (patientIds.length === 0) {
            return of([]);
          }
          
          // Fetch all patients and filter by assigned patient IDs
          return this.patientService.getPatients().pipe(
            map(allPatients => allPatients.filter(p => patientIds.includes(p.userId || p.id)))
          );
        }),
        catchError(error => {
          console.error('Failed to load assigned patients:', error);
          this.toastService.error('Failed to load your assigned patients');
          return of([]);
        })
      )
      .subscribe(patients => {
        this.patients = patients;
        this.loadPatientAppointments();
        // Load behaviors after patients are loaded
        this.loadRecentBehaviors();
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
          this.loadCaregiverAssignments(); // Refresh the lists
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

  getAssignmentPatientName(assignment: CaregiverAssignment): string {
    const fullName = `${assignment.patientFirstName || ''} ${assignment.patientLastName || ''}`.trim();
    if (fullName) {
      return fullName;
    }

    const patient = this.patients.find(p => (p.userId || p.id) === assignment.patientId);
    if (patient) {
      return `${patient.firstName} ${patient.lastName}`.trim();
    }

    return 'Patient';
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
    const patient = this.patients.find(p => p.id === patientId);
    return patient ? `${patient.firstName} ${patient.lastName}` : 'Unknown';
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
}
