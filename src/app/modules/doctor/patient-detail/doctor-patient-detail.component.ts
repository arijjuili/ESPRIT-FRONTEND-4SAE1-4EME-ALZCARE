import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CareTeamService } from '../../../core/services/care-team.service';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { NotificationBellComponent } from '../../../shared/components/notification-bell/notification-bell.component';
import { RoleTheme } from '../../../shared/components/navbar.component';
import {
  CaregiverAssignment,
  ChecklistItem,
  ChecklistPriority,
  ChecklistCategory,
  ChecklistStatus,
  CreateChecklistItemRequest,
  AssignChecklistItemRequest
} from '../../../core/models/care-team.model';

@Component({
  selector: 'app-doctor-patient-detail',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, NotificationBellComponent],
  templateUrl: './doctor-patient-detail.component.html',
  styleUrls: ['./doctor-patient-detail.component.scss']
})
export class DoctorPatientDetailComponent implements OnInit {
  patientId!: string;
  patient: any = null;
  caregivers: CaregiverAssignment[] = [];
  checklistItems: ChecklistItem[] = [];
  loading = false;
  loadingCaregivers = false;
  loadingChecklist = false;
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

  // Create form
  checklistForm: FormGroup;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private careTeamService: CareTeamService,
    private toastService: ToastService,
    private fb: FormBuilder
  ) {
    this.checklistForm = this.fb.group({
      description: ['', [Validators.required, Validators.minLength(5)]],
      priority: [ChecklistPriority.MEDIUM, Validators.required],
      category: [ChecklistCategory.GENERAL, Validators.required],
      date: [this.getTodayDate(), Validators.required],
      assignedCaregiverId: [null]
    });
  }

  ngOnInit(): void {
    this.patientId = this.route.snapshot.paramMap.get('patientId') || '';
    if (this.patientId) {
      this.loadPatientData();
    } else {
      this.toastService.error('Invalid patient ID', 'Error');
      this.router.navigate(['/doctor/dashboard']);
    }
  }

  loadPatientData(): void {
    this.loading = true;
    // In a real implementation, you would load patient details from a patient service
    // For now, we'll create a placeholder patient object
    this.patient = {
      id: this.patientId,
      firstName: 'Patient',
      lastName: `#${this.patientId}`,
      email: '',
      phone: ''
    };

    this.loadCaregivers();
    this.loadChecklist();
    this.loading = false;
  }

  loadCaregivers(): void {
    this.loadingCaregivers = true;
    this.careTeamService.getPatientCaregivers(this.patientId).subscribe({
      next: (caregivers) => {
        this.caregivers = caregivers.filter(c => c.status === 'ACTIVE');
        this.loadingCaregivers = false;
      },
      error: (error) => {
        console.error('Error loading caregivers:', error);
        this.toastService.error('Failed to load caregivers', 'Error');
        this.loadingCaregivers = false;
      }
    });
  }

  loadChecklist(): void {
    this.loadingChecklist = true;
    const today = this.getTodayDate();
    this.careTeamService.getPatientChecklist(this.patientId, today).subscribe({
      next: (items) => {
        this.checklistItems = items;
        this.loadingChecklist = false;
      },
      error: (error) => {
        console.error('Error loading checklist:', error);
        this.toastService.error('Failed to load checklist', 'Error');
        this.loadingChecklist = false;
      }
    });
  }

  getTodayDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  getPatientFullName(): string {
    if (this.patient?.firstName && this.patient?.lastName) {
      return `${this.patient.firstName} ${this.patient.lastName}`;
    }
    return `Patient #${this.patientId}`;
  }

  getCaregiverFullName(caregiver: CaregiverAssignment): string {
    if (caregiver.caregiverFirstName && caregiver.caregiverLastName) {
      return `${caregiver.caregiverFirstName} ${caregiver.caregiverLastName}`;
    }
    return `Caregiver #${caregiver.caregiverId}`;
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
        return 'text-purple-600';
      case ChecklistCategory.INCIDENT:
        return 'text-red-600';
      case ChecklistCategory.COGNITIVE_TEST:
        return 'text-blue-600';
      case ChecklistCategory.GENERAL:
        return 'text-gray-600';
      default:
        return 'text-gray-600';
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
    }
  }

  createChecklistItem(): void {
    if (this.checklistForm.invalid) {
      this.toastService.warning('Please fill in all required fields', 'Validation Error');
      return;
    }

    const formValue = this.checklistForm.value;
    const request: CreateChecklistItemRequest = {
      doctorId: '', // Will be set by backend based on authenticated user
      patientId: this.patientId,
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
              this.toastService.success('Task created and assigned successfully', 'Success');
            },
            error: (error) => {
              console.error('Error assigning checklist item:', error);
              this.checklistItems.unshift(item);
              this.toastService.warning('Task created but assignment failed', 'Partial Success');
            }
          });
        } else {
          this.checklistItems.unshift(item);
          this.toastService.success('Task created successfully', 'Success');
        }
        this.toggleCreateForm();
      },
      error: (error) => {
        console.error('Error creating checklist item:', error);
        this.toastService.error('Failed to create task', 'Error');
      }
    });
  }

  onAssignSelectChange(itemId: string, event: Event): void {
    const select = event.target as HTMLSelectElement;
    const caregiverId = select.value || null;
    this.assignChecklistItem(itemId, caregiverId);
  }

  assignChecklistItem(itemId: string, caregiverId: string | null): void {
    if (!caregiverId) {
      this.toastService.warning('Please select a caregiver', 'Validation Error');
      return;
    }

    const request: AssignChecklistItemRequest = { caregiverId: caregiverId! };
    this.careTeamService.assignChecklistItem(itemId, request).subscribe({
      next: (updatedItem) => {
        const index = this.checklistItems.findIndex(item => item.id === itemId);
        if (index !== -1) {
          this.checklistItems[index] = updatedItem;
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
        this.toastService.success('Task deleted successfully', 'Success');
      },
      error: (error) => {
        console.error('Error deleting checklist item:', error);
        this.toastService.error('Failed to delete task', 'Error');
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/doctor/dashboard']);
  }
}
