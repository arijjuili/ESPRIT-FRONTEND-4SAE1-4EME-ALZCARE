import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MedicalFollowupService } from '../../../core/services/medical-followup.service';
import { UserManagementService } from '../../../core/services/user-management.service';
import {
  MedicationPlan,
  MedicationPlanCreateRequest,
  MedicationItem,
  MedicationItemCreateRequest,
  MedicationAutonomyLevel,
  FrequencyType
} from '../../../core/models/medical-followup.model';
import { ManagedUser } from '../../../core/models/user-management.model';

/**
 * Doctor Prescriptions Management - Redesigned
 * 
 * Clean, modern interface for managing patient medication plans.
 * Features:
 * - Left panel: Searchable prescription list (showing 7 recent by default)
 * - Right panel: Detailed prescription view and management
 * - Modal-based prescription creation with patient search
 */
@Component({
  selector: 'app-doctor-prescriptions',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './doctor-prescriptions.component.html',
  styleUrls: ['./doctor-prescriptions.component.scss']
})
export class DoctorPrescriptionsComponent implements OnInit {
  // Data
  allPrescriptions: MedicationPlan[] = [];
  filteredPrescriptions: MedicationPlan[] = [];
  selectedPlan: MedicationPlan | null = null;
  loading = false;
  error: string | null = null;

  // Doctor ID (should come from auth)
  doctorId = '1';

  // View Mode
  viewMode: 'recent' | 'all' = 'recent';
  readonly RECENT_LIMIT = 7;

  // Search
  searchQuery = '';
  isSearching = false;

  // Patients for search
  patients: ManagedUser[] = [];
  filteredPatients: ManagedUser[] = [];
  patientSearchQuery = '';

  // Enums for templates
  autonomyLevels = Object.values(MedicationAutonomyLevel);
  frequencyTypes = Object.values(FrequencyType);

  // Modal: New Prescription
  showNewPrescriptionModal = false;
  newPlan: MedicationPlanCreateRequest = {
    patientId: '',
    doctorId: this.doctorId,
    title: '',
    notes: '',
    startDate: '',
    endDate: '',
    autonomyLevel: MedicationAutonomyLevel.ASSISTED,
    status: 'ACTIVE' as any,
    version: 1
  };
  selectedPatient: ManagedUser | null = null;
  showPatientDropdown = false;

  // Modal: New Medication
  showAddMedicationModal = false;
  newItem: MedicationItemCreateRequest = {
    name: '',
    dosage: '',
    frequency: FrequencyType.DAILY,
    timesOfDay: 'MORNING',
    isHighRisk: false,
    stockQuantity: 30,
    lowThreshold: 5
  };

  // Modal: Edit Prescription
  showEditPrescriptionModal = false;
  editingPlan: MedicationPlan | null = null;
  editPlanData: Partial<MedicationPlanCreateRequest> = {};

  // Modal: Edit Medication
  showEditMedicationModal = false;
  editingItem: MedicationItem | null = null;
  editItemData: Partial<MedicationItemCreateRequest> = {};

  constructor(
    private medicalService: MedicalFollowupService,
    private userService: UserManagementService
  ) {}

  ngOnInit(): void {
    this.initializeDates();
    this.loadPatients();
    this.loadRecentPrescriptions();
  }

  // ==================== INITIALIZATION ====================

  initializeDates(): void {
    const today = new Date();
    this.newPlan.startDate = today.toISOString().split('T')[0];
  }

  loadPatients(): void {
    this.userService.getActivePatients().subscribe({
      next: (patients) => {
        this.patients = patients;
        this.filteredPatients = patients;
      },
      error: (err) => {
        console.error('Error loading patients:', err);
        this.patients = [];
        this.filteredPatients = [];
      }
    });
  }

  /**
   * Get display name for patient (full name only)
   */
  getPatientDisplayName(patient: ManagedUser): string {
    return patient.fullName || 
      (patient.firstName && patient.lastName ? `${patient.firstName} ${patient.lastName}` : null) ||
      patient.username || 
      patient.email ||
      'Unknown';
  }

  // ==================== DATA LOADING ====================

  loadRecentPrescriptions(): void {
    this.loading = true;
    this.error = null;
    
    // Get all prescriptions and sort by updatedAt
    // Note: In a real scenario, backend would provide a /recent endpoint
    this.medicalService.getAllMedicationPlans().subscribe({
      next: (plans) => {
        this.allPrescriptions = this.sortByLastUpdated(plans);
        this.updateDisplayedPrescriptions();
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading prescriptions:', err);
        this.allPrescriptions = [];
        this.filteredPrescriptions = [];
        this.loading = false;
      }
    });
  }

  updateDisplayedPrescriptions(): void {
    if (this.viewMode === 'recent') {
      this.filteredPrescriptions = this.allPrescriptions.slice(0, this.RECENT_LIMIT);
    } else {
      this.filteredPrescriptions = [...this.allPrescriptions];
    }
  }

  sortByLastUpdated(plans: MedicationPlan[]): MedicationPlan[] {
    return plans.sort((a, b) => {
      const dateA = new Date(a.updatedAt || a.createdAt).getTime();
      const dateB = new Date(b.updatedAt || b.createdAt).getTime();
      return dateB - dateA;
    });
  }

  // ==================== VIEW TOGGLE ====================

  toggleViewMode(): void {
    this.viewMode = this.viewMode === 'recent' ? 'all' : 'recent';
    this.updateDisplayedPrescriptions();
  }

  setViewMode(mode: 'recent' | 'all'): void {
    this.viewMode = mode;
    this.updateDisplayedPrescriptions();
  }

  // ==================== SEARCH ====================

  onSearchInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchQuery = input.value;
    this.executeSearch();
  }

  onSearchKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      this.executeSearch();
    }
  }

  executeSearch(): void {
    if (!this.searchQuery.trim()) {
      this.clearSearch();
      return;
    }

    this.isSearching = true;
    const query = this.searchQuery.toLowerCase().trim();

    // Client-side filtering only (backend search not reliable)
    this.filteredPrescriptions = this.allPrescriptions.filter(plan => {
      const matchesTitle = plan.title?.toLowerCase().includes(query);
      const matchesNotes = plan.notes?.toLowerCase().includes(query);
      const matchesMedication = plan.items?.some(item => 
        item.name.toLowerCase().includes(query)
      );
      return matchesTitle || matchesNotes || matchesMedication;
    });
    
    this.isSearching = false;
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.isSearching = false;
    this.updateDisplayedPrescriptions();
  }

  // ==================== SELECTION ====================

  selectPlan(plan: MedicationPlan): void {
    this.selectedPlan = plan;
  }

  // ==================== PATIENT SEARCH ====================

  /**
   * Search/filter patients based on query
   * Same principle as appointments component
   */
  onPatientSearchInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const query = input.value;
    this.patientSearchQuery = query;
    this.showPatientDropdown = true;
    
    // Reset selection if user modifies search
    this.selectedPatient = null;
    this.newPlan.patientId = '';

    if (!query.trim()) {
      this.filteredPatients = this.patients;
      return;
    }

    const lowerQuery = query.toLowerCase();
    this.filteredPatients = this.patients.filter(patient => 
      (patient.fullName && patient.fullName.toLowerCase().includes(lowerQuery)) ||
      (patient.firstName && patient.firstName.toLowerCase().includes(lowerQuery)) ||
      (patient.lastName && patient.lastName.toLowerCase().includes(lowerQuery)) ||
      (patient.email && patient.email.toLowerCase().includes(lowerQuery)) ||
      (patient.username && patient.username.toLowerCase().includes(lowerQuery))
    );
  }

  /**
   * Select a patient from the dropdown
   */
  selectPatient(patient: ManagedUser): void {
    this.selectedPatient = patient;
    this.newPlan.patientId = patient.id;
    this.patientSearchQuery = this.getPatientDisplayName(patient);
    this.showPatientDropdown = false;
  }

  /**
   * Hide dropdown when clicking outside
   */
  hidePatientDropdown(): void {
    setTimeout(() => {
      this.showPatientDropdown = false;
    }, 200);
  }

  /**
   * Clear patient selection
   */
  clearPatientSelection(): void {
    this.selectedPatient = null;
    this.newPlan.patientId = '';
    this.patientSearchQuery = '';
    this.filteredPatients = this.patients;
  }

  // ==================== PRESCRIPTION CRUD ====================

  openNewPrescriptionModal(): void {
    this.resetPlanForm();
    this.showNewPrescriptionModal = true;
  }

  closeNewPrescriptionModal(): void {
    this.showNewPrescriptionModal = false;
    this.resetPlanForm();
  }

  createPrescription(): void {
    if (!this.validatePlan()) {
      return;
    }

    this.loading = true;
    this.medicalService.createMedicationPlan(this.newPlan).subscribe({
      next: (plan) => {
        this.allPrescriptions.unshift(plan);
        this.updateDisplayedPrescriptions();
        this.selectedPlan = plan;
        this.closeNewPrescriptionModal();
        this.loading = false;
        
        // Open add medication modal immediately
        this.openAddMedicationModal();
      },
      error: (err) => {
        this.error = 'Error creating prescription';
        this.loading = false;
        console.error('Error creating plan:', err);
      }
    });
  }

  openEditPrescriptionModal(): void {
    if (!this.selectedPlan) return;
    
    this.editingPlan = this.selectedPlan;
    this.editPlanData = {
      title: this.selectedPlan.title,
      notes: this.selectedPlan.notes,
      startDate: this.selectedPlan.startDate,
      endDate: this.selectedPlan.endDate,
      autonomyLevel: this.selectedPlan.autonomyLevel,
      status: this.selectedPlan.status
    };
    this.showEditPrescriptionModal = true;
  }

  closeEditPrescriptionModal(): void {
    this.showEditPrescriptionModal = false;
    this.editingPlan = null;
    this.editPlanData = {};
  }

  updatePrescription(): void {
    if (!this.editingPlan) return;

    this.loading = true;
    this.medicalService.updateMedicationPlan(this.editingPlan.id, this.editPlanData).subscribe({
      next: (updated) => {
        const index = this.allPrescriptions.findIndex(p => p.id === updated.id);
        if (index !== -1) {
          this.allPrescriptions[index] = { ...this.allPrescriptions[index], ...updated };
        }
        this.selectedPlan = updated;
        this.updateDisplayedPrescriptions();
        this.closeEditPrescriptionModal();
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Error updating prescription';
        this.loading = false;
        console.error('Error updating plan:', err);
      }
    });
  }

  deletePlan(): void {
    if (!this.selectedPlan) return;
    
    if (!confirm('Are you sure you want to delete this prescription plan?')) {
      return;
    }

    this.loading = true;
    this.medicalService.deleteMedicationPlan(this.selectedPlan.id).subscribe({
      next: () => {
        this.allPrescriptions = this.allPrescriptions.filter(p => p.id !== this.selectedPlan!.id);
        this.selectedPlan = null;
        this.updateDisplayedPrescriptions();
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Error deleting prescription';
        this.loading = false;
        console.error('Error deleting plan:', err);
      }
    });
  }

  // ==================== MEDICATION CRUD ====================

  openAddMedicationModal(): void {
    this.resetItemForm();
    this.showAddMedicationModal = true;
  }

  closeAddMedicationModal(): void {
    this.showAddMedicationModal = false;
    this.resetItemForm();
  }

  addMedication(): void {
    if (!this.selectedPlan || !this.validateItem()) {
      return;
    }

    this.loading = true;
    this.medicalService.addMedicationItem(this.selectedPlan.id, this.newItem).subscribe({
      next: (item) => {
        if (!this.selectedPlan!.items) {
          this.selectedPlan!.items = [];
        }
        this.selectedPlan!.items.push(item);
        this.closeAddMedicationModal();
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Error adding medication';
        this.loading = false;
        console.error('Error adding medication:', err);
      }
    });
  }

  openEditMedicationModal(item: MedicationItem): void {
    this.editingItem = item;
    this.editItemData = {
      name: item.name,
      dosage: item.dosage,
      frequency: item.frequency,
      timesOfDay: item.timesOfDay,
      isHighRisk: item.isHighRisk,
      stockQuantity: item.stockQuantity,
      lowThreshold: item.lowThreshold
    };
    this.showEditMedicationModal = true;
  }

  closeEditMedicationModal(): void {
    this.showEditMedicationModal = false;
    this.editingItem = null;
    this.editItemData = {};
  }

  updateMedication(): void {
    if (!this.editingItem) return;

    this.loading = true;
    this.medicalService.updateMedicationItem(this.editingItem.id, this.editItemData).subscribe({
      next: (updated) => {
        if (this.selectedPlan?.items) {
          const index = this.selectedPlan.items.findIndex(i => i.id === updated.id);
          if (index !== -1) {
            this.selectedPlan.items[index] = { ...this.selectedPlan.items[index], ...updated };
          }
        }
        this.closeEditMedicationModal();
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Error updating medication';
        this.loading = false;
        console.error('Error updating item:', err);
      }
    });
  }

  deleteItem(itemId: number): void {
    if (!confirm('Are you sure you want to delete this medication?')) {
      return;
    }

    this.loading = true;
    this.medicalService.deleteMedicationItem(itemId).subscribe({
      next: () => {
        if (this.selectedPlan?.items) {
          this.selectedPlan.items = this.selectedPlan.items.filter(i => i.id !== itemId);
        }
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Error deleting medication';
        this.loading = false;
        console.error('Error deleting item:', err);
      }
    });
  }

  // ==================== VALIDATION ====================

  validatePlan(): boolean {
    if (!this.newPlan.patientId) {
      alert('Please select a patient');
      return false;
    }
    if (!this.newPlan.title.trim()) {
      alert('Please enter a plan title');
      return false;
    }
    if (!this.newPlan.startDate) {
      alert('Please select a start date');
      return false;
    }
    return true;
  }

  validateItem(): boolean {
    if (!this.newItem.name.trim()) {
      alert('Please enter medication name');
      return false;
    }
    if (!this.newItem.dosage.trim()) {
      alert('Please enter dosage');
      return false;
    }
    if (!this.newItem.timesOfDay.trim()) {
      alert('Please specify intake times');
      return false;
    }
    return true;
  }

  // ==================== FORM RESET ====================

  resetPlanForm(): void {
    const today = new Date();
    this.newPlan = {
      patientId: '',
      doctorId: this.doctorId,
      title: '',
      notes: '',
      startDate: today.toISOString().split('T')[0],
      endDate: '',
      autonomyLevel: MedicationAutonomyLevel.ASSISTED,
      status: 'ACTIVE' as any,
      version: 1
    };
    this.selectedPatient = null;
    this.patientSearchQuery = '';
    this.showPatientDropdown = false;
    this.filteredPatients = this.patients;
  }

  resetItemForm(): void {
    this.newItem = {
      name: '',
      dosage: '',
      frequency: FrequencyType.DAILY,
      timesOfDay: 'MORNING',
      isHighRisk: false,
      stockQuantity: 30,
      lowThreshold: 5
    };
  }

  // ==================== FORMATTERS ====================

  formatDate(dateString: string | undefined): string {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  formatShortDate(dateString: string | undefined): string {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  }

  formatDateRange(startDate: string, endDate: string | undefined): string {
    const start = this.formatShortDate(startDate);
    const end = endDate ? this.formatShortDate(endDate) : 'Ongoing';
    return `${start} – ${end}`;
  }

  formatRelativeDate(dateString: string | undefined): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return this.formatDate(dateString);
  }

  getMedicationCountLabel(plan: MedicationPlan): string {
    const count = plan.items?.length || 0;
    return count === 1 ? '1 Medication' : `${count} Medications`;
  }

  getInitials(patientId: string): string {
    // Extract first 2 characters for avatar
    return patientId.substring(0, 2).toUpperCase();
  }

  getAvatarColor(patientId: string): string {
    const colors = [
      'bg-blue-500',
      'bg-green-500',
      'bg-purple-500',
      'bg-orange-500',
      'bg-teal-500',
      'bg-indigo-500',
      'bg-pink-500',
      'bg-cyan-500'
    ];
    let hash = 0;
    for (let i = 0; i < patientId.length; i++) {
      hash = patientId.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  }

  // ==================== COMPACT DISPLAY HELPERS ====================

  /**
   * Get shortened patient ID for display
   */
  getShortPatientId(patientId: string): string {
    if (!patientId) return 'Unknown';
    // Show first 8 chars + last 4 if long, otherwise full
    if (patientId.length > 12) {
      return patientId.substring(0, 8) + '...' + patientId.substring(patientId.length - 4);
    }
    return patientId;
  }

  /**
   * Format date range in compact style (e.g., "Feb 19 – Feb 27, 2026")
   */
  formatDateRangeCompact(startDate: string, endDate: string | undefined): string {
    if (!startDate) return 'No dates set';
    
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : null;
    
    const startMonth = start.toLocaleDateString('en-US', { month: 'short' });
    const startDay = start.getDate();
    const startYear = start.getFullYear();
    
    if (!end) {
      return `${startMonth} ${startDay}, ${startYear} – Ongoing`;
    }
    
    const endMonth = end.toLocaleDateString('en-US', { month: 'short' });
    const endDay = end.getDate();
    const endYear = end.getFullYear();
    
    // Same year
    if (startYear === endYear) {
      // Same month
      if (startMonth === endMonth) {
        return `${startMonth} ${startDay} – ${endDay}, ${startYear}`;
      }
      return `${startMonth} ${startDay} – ${endMonth} ${endDay}, ${startYear}`;
    }
    
    return `${startMonth} ${startDay}, ${startYear} – ${endMonth} ${endDay}, ${endYear}`;
  }

  /**
   * Format relative date in ultra-compact style
   */
  formatRelativeDateCompact(dateString: string | undefined): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffSecs < 60) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
}
