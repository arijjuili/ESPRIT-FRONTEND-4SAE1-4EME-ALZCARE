import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError, distinctUntilChanged, map, switchMap } from 'rxjs/operators';
import { CareTeamService } from '../../../core/services/care-team.service';
import { PatientService, PatientProfileResponse } from '../../../core/services/patient.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { NotificationBellComponent } from '../../../shared/components/notification-bell/notification-bell.component';
import { RoleTheme } from '../../../shared/components/navbar.component';
import {
  AssignmentStatus,
  CaregiverAssignment,
  ChecklistItem,
  ChecklistPriority,
  ChecklistCategory,
  ChecklistStatus,
  DoctorAssignment,
  ChecklistGroupDto,
  CreateChecklistItemRequest,
  AssignChecklistItemRequest
} from '../../../core/models/care-team.model';

@Component({
  selector: 'app-doctor-checklist',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink, NotificationBellComponent],
  templateUrl: './doctor-checklist.component.html',
  styleUrls: ['./doctor-checklist.component.scss']
})
export class DoctorChecklistComponent implements OnInit {
  doctorId: string | null = null;
  selectedPatientId: string | null = null;
  doctorAssignments: DoctorAssignment[] = [];
  /** Keycloak userId -> name from identity (care-team rarely sends patientFirstName/LastName) */
  patientProfilesByUserId: Record<string, { firstName: string; lastName: string }> = {};
  checklistItems: ChecklistItem[] = [];
  filteredChecklist: ChecklistItem[] = [];
  /** list | grouped — module 3.2 */
  viewMode: 'list' | 'grouped' = 'list';
  groupedChecklists: ChecklistGroupDto[] = [];
  loadingGrouped = false;

  loading = false;
  loadingChecklist = false;
  loadingPatients = false;
  generatingDaily = false;
  /** Active caregivers for the patient selected in the create-task form */
  patientCaregiversForForm: CaregiverAssignment[] = [];
  loadingCaregiversForForm = false;

  /** Generate daily checklist (patient + date) */
  generatePatientId: string | null = null;
  generateChecklistDate = this.getTodayDate();
  
  // Filters
  filterStatus: string = 'ALL';
  filterPriority: string = 'ALL';
  filterPatient: string = 'ALL';
  
  // Create form
  checklistForm: FormGroup;
  showCreateForm = false;

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

  // Enums for template
  priorities = Object.values(ChecklistPriority);
  categories = Object.values(ChecklistCategory);
  statuses = Object.values(ChecklistStatus);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private careTeamService: CareTeamService,
    private patientService: PatientService,
    private authService: AuthService,
    private toastService: ToastService,
    private fb: FormBuilder
  ) {
    this.checklistForm = this.fb.group({
      patientId: [null, Validators.required],
      description: ['', [Validators.required, Validators.minLength(5)]],
      priority: [ChecklistPriority.MEDIUM, Validators.required],
      category: [ChecklistCategory.GENERAL, Validators.required],
      date: [this.getTodayDate(), Validators.required],
      assignedCaregiverId: [null]
    });
  }

  ngOnInit(): void {
    // Check for patientId in query params
    this.route.queryParams.subscribe((params) => {
      const patientId = params['patientId'];
      if (patientId) {
        this.selectedPatientId = patientId;
        this.checklistForm.patchValue({ patientId: this.selectedPatientId });
        this.showCreateForm = true;
        this.loadCaregiversForPatient(patientId);
      }
    });

    this.checklistForm
      .get('patientId')
      ?.valueChanges.pipe(distinctUntilChanged())
      .subscribe((pid) => this.loadCaregiversForPatient(pid));

    // Load doctor's patients and checklist
    this.loadDoctorData();
  }

  /**
   * Optional “Assign to”: caregivers on this patient’s care team (care-team API).
   */
  private loadCaregiversForPatient(patientId: string | null): void {
    this.patientCaregiversForForm = [];
    this.checklistForm.get('assignedCaregiverId')?.setValue(null, { emitEvent: false });
    if (!patientId) {
      this.loadingCaregiversForForm = false;
      return;
    }
    this.loadingCaregiversForForm = true;
    this.careTeamService.getPatientCaregivers(patientId).subscribe({
      next: (list) => {
        this.patientCaregiversForForm = list.filter((a) => a.status === AssignmentStatus.ACTIVE);
        this.loadingCaregiversForForm = false;
      },
      error: () => {
        this.patientCaregiversForForm = [];
        this.loadingCaregiversForForm = false;
      }
    });
  }

  getCaregiverOptionLabel(c: CaregiverAssignment): string {
    const name =
      c.caregiverFirstName || c.caregiverLastName
        ? `${c.caregiverFirstName || ''} ${c.caregiverLastName || ''}`.trim()
        : c.caregiverId
          ? `Caregiver ${c.caregiverId.slice(0, 8)}…`
          : 'Pending invite';
    return `${name} (${c.role})`;
  }

  loadDoctorData(): void {
    this.loadDoctorPatients();
  }

  loadDoctorPatients(): void {
    this.loadingPatients = true;
    const uid = this.authService.getCurrentUserId();
    if (!uid) {
      this.toastService.error('Not signed in as a doctor', 'Error');
      this.loadingPatients = false;
      return;
    }
    this.doctorId = uid;
    this.patientProfilesByUserId = {};

    this.careTeamService
      .getDoctorPatients(this.doctorId)
      .pipe(
        switchMap((assignments) => {
          const active = assignments.filter((a) => a.status === 'ACTIVE');
          const ids = [...new Set(active.map((a) => a.patientId))];
          if (ids.length === 0) {
            return of({ active, rows: [] as { id: string; profile: PatientProfileResponse | null }[] });
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
          this.doctorAssignments = active.filter((a) => hasDirectoryProfile(a.patientId));
          if (!this.generatePatientId && this.doctorAssignments.length > 0) {
            this.generatePatientId = this.doctorAssignments[0].patientId;
          }
          this.loadingPatients = false;
          this.loadAllChecklistItems();
          if (this.viewMode === 'grouped') {
            this.loadGroupedChecklists();
          }
        },
        error: (error) => {
          console.error('Error loading doctor patients:', error);
          this.toastService.error('Failed to load patients', 'Error');
          this.doctorAssignments = [];
          this.loadingPatients = false;
        }
      });
  }

  loadAllChecklistItems(): void {
    this.loadingChecklist = true;
    if (!this.doctorId) {
      this.loadingChecklist = false;
      return;
    }
    this.careTeamService.getChecklistItems({ doctorId: this.doctorId }).subscribe({
      next: (items) => {
        const validPatientIds = new Set(Object.keys(this.patientProfilesByUserId));
        const visible =
          validPatientIds.size === 0
            ? []
            : items.filter((i) => validPatientIds.has(String(i.patientId)));
        this.checklistItems = visible.sort((a, b) => {
          const dateCompare = new Date(b.date).getTime() - new Date(a.date).getTime();
          if (dateCompare !== 0) return dateCompare;
          const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        });
        this.applyFilters();
        this.loadingChecklist = false;
      },
      error: (error) => {
        console.error('Error loading checklist items:', error);
        this.toastService.error('Failed to load checklist items', 'Error');
        this.loadingChecklist = false;
      }
    });
  }

  applyFilters(): void {
    this.filteredChecklist = this.checklistItems.filter(item => {
      const statusMatch = this.filterStatus === 'ALL' || item.status === this.filterStatus;
      const priorityMatch = this.filterPriority === 'ALL' || item.priority === this.filterPriority;
      const patientMatch = this.filterPatient === 'ALL' || item.patientId.toString() === this.filterPatient;
      return statusMatch && priorityMatch && patientMatch;
    });
  }

  onFilterChange(): void {
    this.applyFilters();
  }

  setViewMode(mode: 'list' | 'grouped'): void {
    this.viewMode = mode;
    if (mode === 'grouped') {
      this.loadGroupedChecklists();
    }
  }

  loadGroupedChecklists(): void {
    if (!this.doctorId) return;
    this.loadingGrouped = true;
    this.careTeamService.getDoctorChecklistsGrouped(this.doctorId).subscribe({
      next: (groups) => {
        const validPatientIds = new Set(Object.keys(this.patientProfilesByUserId));
        this.groupedChecklists =
          validPatientIds.size === 0
            ? []
            : groups.filter((g) => validPatientIds.has(String(g.patientId)));
        this.loadingGrouped = false;
      },
      error: (err) => {
        console.error(err);
        this.toastService.error('Could not load grouped checklists');
        this.loadingGrouped = false;
      }
    });
  }

  runGenerateDailyChecklist(): void {
    if (!this.doctorId || !this.generatePatientId) {
      this.toastService.warning('Select a patient first');
      return;
    }
    this.generatingDaily = true;
    this.careTeamService
      .generateDailyChecklist({
        doctorId: this.doctorId,
        patientId: this.generatePatientId,
        date: this.generateChecklistDate
      })
      .subscribe({
        next: () => {
          this.toastService.success('Daily checklist generated');
          this.loadAllChecklistItems();
          if (this.viewMode === 'grouped') {
            this.loadGroupedChecklists();
          }
          this.generatingDaily = false;
        },
        error: (err) => {
          this.toastService.error(err.error?.message || 'Generate failed');
          this.generatingDaily = false;
        }
      });
  }

  getTodayDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  getPatientFullName(patientId: string): string {
    const prof = this.patientProfilesByUserId[patientId];
    if (prof) {
      const full = `${prof.firstName || ''} ${prof.lastName || ''}`.trim();
      if (full.length > 0) return full;
    }
    const assignment = this.doctorAssignments.find((a) => a.patientId === patientId);
    if (assignment?.patientFirstName && assignment?.patientLastName) {
      return `${assignment.patientFirstName} ${assignment.patientLastName}`;
    }
    if (assignment?.patientFirstName) {
      return assignment.patientFirstName;
    }
    return `Patient #${patientId}`;
  }

  getPriorityClass(priority: ChecklistPriority): string {
    switch (priority) {
      case ChecklistPriority.HIGH:
        return 'bg-red-100 text-red-800 border-red-200';
      case ChecklistPriority.MEDIUM:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case ChecklistPriority.LOW:
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  }

  getStatusClass(status: ChecklistStatus): string {
    switch (status) {
      case ChecklistStatus.COMPLETED:
        return 'bg-green-100 text-green-800';
      case ChecklistStatus.ASSIGNED:
        return 'bg-blue-100 text-blue-800';
      case ChecklistStatus.PENDING:
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  getCategoryClass(category: ChecklistCategory): string {
    switch (category) {
      case ChecklistCategory.MEDICATION:
        return 'bg-purple-100 text-purple-800';
      case ChecklistCategory.INCIDENT:
        return 'bg-red-100 text-red-800';
      case ChecklistCategory.COGNITIVE_TEST:
        return 'bg-blue-100 text-blue-800';
      case ChecklistCategory.GENERAL:
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  getCategoryIcon(category: ChecklistCategory): string {
    switch (category) {
      case ChecklistCategory.MEDICATION:
        return '💊';
      case ChecklistCategory.INCIDENT:
        return '⚠️';
      case ChecklistCategory.COGNITIVE_TEST:
        return '🧠';
      case ChecklistCategory.GENERAL:
        return '📝';
      default:
        return '📝';
    }
  }

  toggleCreateForm(): void {
    this.showCreateForm = !this.showCreateForm;
    if (!this.showCreateForm) {
      this.checklistForm.reset({
        priority: ChecklistPriority.MEDIUM,
        category: ChecklistCategory.GENERAL,
        date: this.getTodayDate(),
        assignedCaregiverId: null
      });
      // Restore selected patient if from query param
      if (this.selectedPatientId) {
        this.checklistForm.patchValue({ patientId: this.selectedPatientId });
      }
      this.patientCaregiversForForm = [];
    } else {
      const pid = this.checklistForm.get('patientId')?.value;
      if (pid) {
        this.loadCaregiversForPatient(pid);
      }
    }
  }

  createChecklistItem(): void {
    if (this.checklistForm.invalid) {
      this.toastService.warning('Please fill in all required fields', 'Validation Error');
      return;
    }

    const formValue = this.checklistForm.value;
    const request: CreateChecklistItemRequest = {
      doctorId: this.doctorId || '',
      patientId: formValue.patientId,
      description: formValue.description,
      priority: formValue.priority,
      category: formValue.category,
      date: formValue.date,
      itemOrder: this.checklistItems.length + 1
    };

    this.careTeamService.createChecklistItem(request).subscribe({
      next: (item) => {
        // If caregiver is selected, assign the item
        if (formValue.assignedCaregiverId) {
          const assignRequest: AssignChecklistItemRequest = {
            caregiverId: formValue.assignedCaregiverId
          };
          this.careTeamService.assignChecklistItem(item.id, assignRequest).subscribe({
            next: (assignedItem) => {
              this.checklistItems.unshift(assignedItem);
              this.applyFilters();
              this.toastService.success('Task created and assigned successfully', 'Success');
            },
            error: (error) => {
              console.error('Error assigning checklist item:', error);
              this.checklistItems.unshift(item);
              this.applyFilters();
              this.toastService.warning('Task created but assignment failed', 'Partial Success');
            }
          });
        } else {
          this.checklistItems.unshift(item);
          this.applyFilters();
          this.toastService.success('Task created successfully', 'Success');
        }
        this.toggleCreateForm();
        
        // Clear query params if they existed
        if (this.selectedPatientId) {
          this.router.navigate(['/doctor/checklist'], { replaceUrl: true });
          this.selectedPatientId = null;
        }
      },
      error: (error) => {
        console.error('Error creating checklist item:', error);
        this.toastService.error('Failed to create task', 'Error');
      }
    });
  }

  assignChecklistItem(itemId: string, caregiverId: string): void {
    if (!caregiverId) {
      this.toastService.warning('Please select a caregiver', 'Validation Error');
      return;
    }

    const request: AssignChecklistItemRequest = { caregiverId };
    this.careTeamService.assignChecklistItem(itemId, request).subscribe({
      next: (updatedItem) => {
        const index = this.checklistItems.findIndex(item => item.id === itemId);
        if (index !== -1) {
          this.checklistItems[index] = updatedItem;
          this.applyFilters();
        }
        this.toastService.success('Task assigned successfully', 'Success');
      },
      error: (error) => {
        console.error('Error assigning checklist item:', error);
        this.toastService.error('Failed to assign task', 'Error');
      }
    });
  }

  deleteChecklistItem(itemId: string): void {
    if (!confirm('Are you sure you want to delete this task?')) {
      return;
    }

    this.careTeamService.deleteChecklistItem(itemId).subscribe({
      next: () => {
        this.checklistItems = this.checklistItems.filter(item => item.id !== itemId);
        this.applyFilters();
        this.toastService.success('Task deleted successfully', 'Success');
      },
      error: (error) => {
        console.error('Error deleting checklist item:', error);
        this.toastService.error('Failed to delete task', 'Error');
      }
    });
  }

  getTaskStats(): { total: number; pending: number; assigned: number; completed: number } {
    return {
      total: this.checklistItems.length,
      pending: this.checklistItems.filter(i => i.status === ChecklistStatus.PENDING).length,
      assigned: this.checklistItems.filter(i => i.status === ChecklistStatus.ASSIGNED).length,
      completed: this.checklistItems.filter(i => i.status === ChecklistStatus.COMPLETED).length
    };
  }
}
