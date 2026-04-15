import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, SlicePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, of, forkJoin } from 'rxjs';
import { takeUntil, catchError, switchMap, map } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth.service';
import { DataService } from '../../../core/services/data.service';
import { SafetyAlertService } from '../../../core/services/safety-alert.service';
import { DailyCareService } from '../../../core/services/daily-care.service';
import { PatientService, PatientProfileResponse } from '../../../core/services/patient.service';
import { CareTeamService } from '../../../core/services/care-team.service';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { StatCardComponent } from '../../../shared/components/stat-card.component';
import { AlertCardComponent } from '../../../shared/components/alert-card.component';
import { BehaviorLogFormComponent } from '../../../shared/components/behavior-log-form.component';
import { NotificationBellComponent } from '../../../shared/components/notification-bell/notification-bell.component';
import { RoleTheme } from '../../../shared/components/navbar.component';
import { CareTask } from '../../../core/models/user.model';
import { BehaviorLogResponse, BehaviorSeverity } from '../../../core/models/safety-alert.model';
import { CaregiverAssignment, CaregiverRole, AssignmentStatus } from '../../../core/models/care-team.model';
import { AutonomySuggestion } from '../../../core/models/daily-care.model';

type AutonomyPatientOption = {
  id: string;
  label: string;
};

@Component({
  selector: 'app-caregiver-dashboard',
  standalone: true,
  imports: [CommonModule, SlicePipe, RouterLink, FormsModule, StatCardComponent, AlertCardComponent, BehaviorLogFormComponent, NotificationBellComponent],
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
  allPatientsDirectory: PatientProfileResponse[] = [];
  allTasks: CareTask[] = [];
  
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

  constructor(
    private authService: AuthService, 
    private dataService: DataService,
    private safetyAlertService: SafetyAlertService,
    private dailyCareService: DailyCareService,
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
    // First load caregiver assignments, then fetch assigned patients for main dashboard cards
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
        this.buildAutonomyPatientOptions();
        // Load behaviors after patients are loaded
        this.loadRecentBehaviors();
      });

    // Load all patients directory for AI autonomy combo (not limited to assignments)
    this.patientService.getPatients()
      .pipe(
        takeUntil(this.destroy$),
        catchError(error => {
          console.error('Failed to load all patients directory:', error);
          return of([]);
        })
      )
      .subscribe((allPatients) => {
        this.allPatientsDirectory = allPatients || [];
        this.buildAutonomyPatientOptions();
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
        this.buildAutonomyPatientOptions();
        this.loadingAssignments = false;
      });
  }

  generateAutonomySuggestion(): void {
    if (!this.selectedAutonomyPatientId || this.autonomyLoading) {
      return;
    }
    this.autonomyLoading = true;
    this.dailyCareService.generateAutonomySuggestion(this.selectedAutonomyPatientId, this.autonomyNotes).subscribe({
      next: (suggestion) => {
        this.latestAutonomySuggestion = suggestion;
        this.autonomyLoading = false;
        this.toastService.success('AI autonomy suggestion generated');
      },
      error: (err) => {
        console.error('Failed to generate autonomy suggestion:', err);
        this.autonomyLoading = false;
        this.toastService.error('Failed to generate AI autonomy suggestion');
      }
    });
  }

  submitAutonomySuggestion(): void {
    if (!this.latestAutonomySuggestion || this.autonomyLoading) {
      return;
    }
    this.autonomyLoading = true;
    this.dailyCareService.submitAutonomySuggestion(this.latestAutonomySuggestion.id).subscribe({
      next: (suggestion) => {
        this.latestAutonomySuggestion = suggestion;
        this.autonomyLoading = false;
        this.toastService.success('Suggestion submitted to doctor');
      },
      error: (err) => {
        console.error('Failed to submit autonomy suggestion:', err);
        this.autonomyLoading = false;
        this.toastService.error('Failed to submit suggestion');
      }
    });
  }

  private buildAutonomyPatientOptions(): void {
    const options: AutonomyPatientOption[] = [];
    const seen = new Set<string>();

    for (const assignment of this.caregiverAssignments) {
      const id = String(assignment.patientId || '').trim();
      if (!id || seen.has(id)) {
        continue;
      }
      seen.add(id);
      options.push({
        id,
        label: `${assignment.patientFirstName || 'Patient'} ${assignment.patientLastName || ''}`.trim()
      });
    }

    for (const patient of this.patients) {
      const id = String(patient.userId || patient.id || '').trim();
      if (!id || seen.has(id)) {
        continue;
      }
      seen.add(id);
      options.push({
        id,
        label: `${patient.firstName || 'Patient'} ${patient.lastName || ''}`.trim()
      });
    }

    for (const patient of this.allPatientsDirectory) {
      const id = String(patient.userId || patient.id || '').trim();
      if (!id || seen.has(id)) {
        continue;
      }
      seen.add(id);
      options.push({
        id,
        label: `${patient.firstName || 'Patient'} ${patient.lastName || ''}`.trim()
      });
    }

    this.autonomyPatientOptions = options;
    if (!this.selectedAutonomyPatientId && options.length > 0) {
      this.selectedAutonomyPatientId = options[0].id;
    }
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
