import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Subject, forkJoin, of } from 'rxjs';
import { takeUntil, catchError, map } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth.service';
import { CareTeamService } from '../../../core/services/care-team.service';
import { PatientService, PatientProfileResponse } from '../../../core/services/patient.service';
import { ToastService } from '../../../shared/components/toast/toast.service';
import {
  CaregiverAssignment,
  ChecklistItem,
  CaregiverRole,
  ChecklistPriority,
  ChecklistStatus,
  AssignmentStatus
} from '../../../core/models/care-team.model';

@Component({
  selector: 'app-caregiver-tasks',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './caregiver-tasks.component.html',
  styleUrls: ['./caregiver-tasks.component.scss']
})
export class CaregiverTasksComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  caregiverId!: string;
  assignments: CaregiverAssignment[] = [];
  /** Keycloak userId -> display name from identity */
  patientProfilesByUserId: Record<string, { firstName: string; lastName: string }> = {};
  allTasks: ChecklistItem[] = [];
  filteredTasks: ChecklistItem[] = [];
  completedTasks: ChecklistItem[] = [];
  pendingTasks: ChecklistItem[] = [];

  loading = false;
  completingTaskId: string | null = null;

  filterForm: FormGroup;

  // Enums for template
  CaregiverRole = CaregiverRole;
  ChecklistPriority = ChecklistPriority;
  ChecklistStatus = ChecklistStatus;

  // Role badge colors
  roleColors: Record<CaregiverRole, string> = {
    [CaregiverRole.PRIMARY]: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    [CaregiverRole.FAMILY]: 'bg-blue-100 text-blue-800 border-blue-200',
    [CaregiverRole.EMERGENCY]: 'bg-rose-100 text-rose-800 border-rose-200'
  };

  // Priority badge colors
  priorityColors: Record<ChecklistPriority, string> = {
    [ChecklistPriority.LOW]: 'bg-green-100 text-green-800 border-green-200',
    [ChecklistPriority.MEDIUM]: 'bg-amber-100 text-amber-800 border-amber-200',
    [ChecklistPriority.HIGH]: 'bg-rose-100 text-rose-800 border-rose-200'
  };

  // Priority icons
  priorityIcons: Record<ChecklistPriority, string> = {
    [ChecklistPriority.LOW]: '🔽',
    [ChecklistPriority.MEDIUM]: '🔼',
    [ChecklistPriority.HIGH]: '🔴'
  };

  constructor(
    private authService: AuthService,
    private careTeamService: CareTeamService,
    private patientService: PatientService,
    private toastService: ToastService,
    private fb: FormBuilder
  ) {
    this.filterForm = this.fb.group({
      patientId: [''],
      status: [''],
      date: [this.getTodayDate()]
    });
  }

  ngOnInit(): void {
    const currentUser = this.authService.getCurrentUser();
    if (currentUser) {
      this.caregiverId = currentUser.id;
      this.loadAssignments();
    }

    // Subscribe to filter changes
    this.filterForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.applyFilters());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  getTodayDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  loadAssignments(): void {
    this.loading = true;
    this.careTeamService.getCaregiverAssignments(this.caregiverId)
      .pipe(
        takeUntil(this.destroy$),
        catchError(error => {
          console.error('Failed to load assignments:', error);
          this.toastService.error('Failed to load your patient assignments');
          return of([]);
        })
      )
      .subscribe((assignments) => {
        this.assignments = assignments.filter((a) => a.status === AssignmentStatus.ACTIVE);
        if (this.assignments.length === 0) {
          this.patientProfilesByUserId = {};
          this.allTasks = [];
          this.applyFilters();
          this.loading = false;
          return;
        }
        this.loadPatientProfilesThenTasks();
      });
  }

  /** Resolve patient names for tasks and filter dropdown (care-team rarely sends patient names). */
  private loadPatientProfilesThenTasks(): void {
    const ids = [...new Set(this.assignments.map((a) => a.patientId))];
    forkJoin(
      ids.map((id) =>
        this.patientService.getPatientById(id).pipe(
          map((profile) => ({ id, profile })),
          catchError(() => of({ id, profile: null as PatientProfileResponse | null }))
        )
      )
    )
      .pipe(takeUntil(this.destroy$))
      .subscribe((rows) => {
        this.patientProfilesByUserId = {};
        for (const row of rows) {
          if (row.profile?.firstName != null || row.profile?.lastName != null) {
            this.patientProfilesByUserId[row.id] = {
              firstName: row.profile.firstName || '',
              lastName: row.profile.lastName || ''
            };
          }
        }
        const hasDirectoryProfile = (patientId: string): boolean => {
          const p = this.patientProfilesByUserId[patientId];
          return !!(p && (p.firstName?.trim() || p.lastName?.trim()));
        };
        this.assignments = this.assignments.filter((a) => hasDirectoryProfile(a.patientId));
        this.loadTasksForAllPatients();
      });
  }

  loadTasksForAllPatients(): void {
    if (this.assignments.length === 0) {
      this.loading = false;
      return;
    }

    const date = this.filterForm.get('date')?.value || this.getTodayDate();

    // Load checklist items for each assigned patient
    const taskObservables = this.assignments.map(assignment =>
      this.careTeamService.getPatientChecklist(assignment.patientId, date).pipe(
        catchError(error => {
          console.error(`Failed to load tasks for patient ${assignment.patientId}:`, error);
          return of([]);
        })
      )
    );

    forkJoin(taskObservables)
      .pipe(takeUntil(this.destroy$))
      .subscribe(results => {
        // Flatten all tasks and filter for this caregiver
        const allItems = results.flat();
        this.allTasks = allItems.filter(task =>
          task.assignedCaregiverId === this.caregiverId ||
          task.status === ChecklistStatus.PENDING
        );
        this.applyFilters();
        this.loading = false;
      });
  }

  applyFilters(): void {
    const { patientId, status } = this.filterForm.value;

    let filtered = [...this.allTasks];

    // Filter by patient
    if (patientId) {
      filtered = filtered.filter(task => task.patientId === patientId);
    }

    // Filter by status
    if (status) {
      filtered = filtered.filter(task => task.status === status);
    }

    // Sort by priority (HIGH first) then by date
    const priorityOrder = { [ChecklistPriority.HIGH]: 0, [ChecklistPriority.MEDIUM]: 1, [ChecklistPriority.LOW]: 2 };
    filtered.sort((a, b) => {
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });

    this.filteredTasks = filtered;
    this.completedTasks = filtered.filter(t => t.status === ChecklistStatus.COMPLETED);
    this.pendingTasks = filtered.filter(t => t.status !== ChecklistStatus.COMPLETED);
  }

  markComplete(itemId: string): void {
    this.completingTaskId = itemId;

    this.careTeamService.completeChecklistItem(itemId, { completedBy: this.caregiverId })
      .pipe(
        takeUntil(this.destroy$),
        catchError(error => {
          console.error('Failed to complete task:', error);
          this.toastService.error('Failed to mark task as complete');
          this.completingTaskId = null;
          return of(null);
        })
      )
      .subscribe(result => {
        if (result) {
          this.toastService.success('Task marked as complete!');
          // Update the task in the list
          const taskIndex = this.allTasks.findIndex(t => t.id === itemId);
          if (taskIndex !== -1) {
            this.allTasks[taskIndex] = result;
            this.applyFilters();
          }
        }
        this.completingTaskId = null;
      });
  }

  getPatientName(patientId: string): string {
    const prof = this.patientProfilesByUserId[patientId];
    if (prof) {
      const full = `${prof.firstName || ''} ${prof.lastName || ''}`.trim();
      if (full.length > 0) return full;
    }
    const assignment = this.assignments.find((a) => a.patientId === patientId);
    if (assignment?.patientFirstName) {
      return `${assignment.patientFirstName} ${assignment.patientLastName || ''}`.trim();
    }
    const task = this.allTasks.find((t) => t.patientId === patientId);
    if (task?.patientFirstName) {
      return `${task.patientFirstName} ${task.patientLastName || ''}`.trim();
    }
    return `Patient ${patientId.slice(0, 8)}…`;
  }

  getRoleForPatient(patientId: string): CaregiverRole | null {
    const assignment = this.assignments.find(a => a.patientId === patientId);
    return assignment?.role || null;
  }

  getRoleBadgeClass(role: CaregiverRole | null): string {
    if (!role) return 'bg-gray-100 text-gray-800';
    return this.roleColors[role];
  }

  getRoleLabel(role: CaregiverRole | null): string {
    if (!role) return 'Unknown';
    const labels: Record<CaregiverRole, string> = {
      [CaregiverRole.PRIMARY]: 'Primary',
      [CaregiverRole.FAMILY]: 'Family',
      [CaregiverRole.EMERGENCY]: 'Emergency'
    };
    return labels[role];
  }

  getPriorityBadgeClass(priority: ChecklistPriority): string {
    return this.priorityColors[priority];
  }

  getPriorityIcon(priority: ChecklistPriority): string {
    return this.priorityIcons[priority];
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  refreshTasks(): void {
    this.loadAssignments();
  }

  getHighPriorityPendingCount(): number {
    return this.filteredTasks.filter(t => t.priority === ChecklistPriority.HIGH && t.status !== ChecklistStatus.COMPLETED).length;
  }

  clearFilters(): void {
    this.filterForm.patchValue({
      patientId: '',
      status: '',
      date: this.getTodayDate()
    });
  }
}
