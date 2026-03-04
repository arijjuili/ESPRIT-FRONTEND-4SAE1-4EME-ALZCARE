import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { CareTeamService } from '../../../core/services/care-team.service';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { NotificationBellComponent } from '../../../shared/components/notification-bell/notification-bell.component';
import { RoleTheme } from '../../../shared/components/navbar.component';
import {
  ChecklistItem,
  ChecklistPriority,
  ChecklistCategory,
  ChecklistStatus,
  DoctorAssignment,
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
  checklistItems: ChecklistItem[] = [];
  filteredChecklist: ChecklistItem[] = [];
  
  loading = false;
  loadingChecklist = false;
  loadingPatients = false;
  
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
    this.route.queryParams.subscribe(params => {
      const patientId = params['patientId'];
      if (patientId) {
        this.selectedPatientId = patientId;
        this.checklistForm.patchValue({ patientId: this.selectedPatientId });
        this.showCreateForm = true;
      }
    });

    // Load doctor's patients and checklist
    this.loadDoctorData();
  }

  loadDoctorData(): void {
    // In real implementation, get doctorId from auth service
    // For now, we'll load all checklist items without filtering by doctor
    this.loadDoctorPatients();
    this.loadAllChecklistItems();
  }

  loadDoctorPatients(): void {
    this.loadingPatients = true;
    // Get current user from auth service would go here
    // For now, we'll use a placeholder
    const currentUser = { id: '1' }; // Placeholder
    this.doctorId = currentUser.id;
    
    this.careTeamService.getDoctorPatients(this.doctorId).subscribe({
      next: (assignments) => {
        this.doctorAssignments = assignments.filter(a => a.status === 'ACTIVE');
        this.loadingPatients = false;
      },
      error: (error) => {
        console.error('Error loading doctor patients:', error);
        this.toastService.error('Failed to load patients', 'Error');
        this.loadingPatients = false;
      }
    });
  }

  loadAllChecklistItems(): void {
    this.loadingChecklist = true;
    this.careTeamService.getChecklistItems().subscribe({
      next: (items) => {
        this.checklistItems = items.sort((a, b) => {
          // Sort by date descending, then by priority
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

  getTodayDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  getPatientFullName(patientId: string): string {
    const assignment = this.doctorAssignments.find(a => a.patientId === patientId);
    if (assignment?.patientFirstName && assignment?.patientLastName) {
      return `${assignment.patientFirstName} ${assignment.patientLastName}`;
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
