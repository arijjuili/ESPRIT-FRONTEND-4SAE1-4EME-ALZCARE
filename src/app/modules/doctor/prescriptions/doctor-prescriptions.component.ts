import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged, filter, switchMap, catchError, takeUntil } from 'rxjs/operators';
import { of } from 'rxjs';
import { MedicalFollowupService } from '../../../core/services/medical-followup.service';
import { DoctorPatientContextService } from '../../../core/services/doctor-patient-context.service';
import { PatientProfileResponse } from '../../../core/services/patient.service';
import { OpenFdaDrugService } from '../../../core/services/open-fda-drug.service';
import { DrugSuggestionDTO } from '../../../core/models/drug-catalog.model';
import {
  MedicationPlan,
  MedicationPlanCreateRequest,
  MedicationItem,
  MedicationItemCreateRequest,
  MedicationAutonomyLevel,
  FrequencyType,
  RiskLevel
} from '../../../core/models/medical-followup.model';

/**
 * Doctor Prescriptions Management - Redesigned
 * 
 * Clean, modern interface for managing patient medication plans.
 * Features:
 * - Left panel: Searchable prescription list (showing 7 recent by default)
 * - Right panel: Detailed prescription view and management
 * - Modal-based prescription creation with patient search
 * 
 * SECURITY: Only shows patients assigned to this doctor via care-team service.
 */
@Component({
  selector: 'app-doctor-prescriptions',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './doctor-prescriptions.component.html',
  styleUrls: ['./doctor-prescriptions.component.scss']
})
export class DoctorPrescriptionsComponent implements OnInit, OnDestroy {
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

  // Patients for search - ONLY assigned patients
  assignedPatients: PatientProfileResponse[] = [];
  filteredPatients: PatientProfileResponse[] = [];
  patientSearchQuery = '';

  // Enums for templates
  autonomyLevels = Object.values(MedicationAutonomyLevel);
  frequencyTypes = Object.values(FrequencyType);
  riskLevels = Object.values(RiskLevel);

  // Available intake times for buttons
  availableTimes = [
    { value: '08:00', label: 'Morning' },
    { value: '12:00', label: 'Noon' },
    { value: '14:00', label: 'Afternoon' },
    { value: '18:00', label: 'Evening' },
    { value: '22:00', label: 'Night' },
    { value: '23:00', label: 'Bedtime' }
  ];

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
    version: 1,
    lastRiskLevel: RiskLevel.LOW
  };
  selectedPatient: PatientProfileResponse | null = null;
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

  // Drug Autocomplete
  drugSearchControl = new FormControl('');
  drugSuggestions: DrugSuggestionDTO[] = [];
  selectedDrug: DrugSuggestionDTO | null = null;
  isSearchingDrugs = false;
  drugSearchError: string | null = null;
  showDrugDropdown = false;
  private drugSearchSubscription?: Subscription;
  private destroy$ = new Subject<void>();

  // Modal: Edit Prescription
  showEditPrescriptionModal = false;
  editingPlan: MedicationPlan | null = null;
  editPlanData: Partial<MedicationPlanCreateRequest> = {};

  // Modal: Edit Medication
  showEditMedicationModal = false;
  editingItem: MedicationItem | null = null;
  editItemData: Partial<MedicationItemCreateRequest> = {};

  // Route parameter for pre-selected patient
  routePatientId: string | null = null;
  
  // Replace mode: when true, creating a plan will stop the current active plan
  isReplaceMode = false;

  currentAction: 'none' | 'add-medication' | 'edit' | 'replace' = 'none';

  constructor(
    private medicalService: MedicalFollowupService,
    private doctorPatientContext: DoctorPatientContextService,
    private openFdaDrugService: OpenFdaDrugService,
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.initializeDates();
    this.loadAssignedPatients();
    this.loadRecentPrescriptions();
    
    // Check for patient ID and query params in route
    this.route.params.subscribe(params => {
      this.routePatientId = params['id'] || null;
      if (this.routePatientId) {
        // Check query params for action
        this.handleRouteQueryParams();
      }
    });
    
    // Fallback: Check for replace=true query param directly
    this.route.queryParams.subscribe(queryParams => {
      if (queryParams['replace'] === 'true') {
        this.isReplaceMode = true;
      }
    });
  }

  /**
   * Handles query params for prescription actions
   * (edit, add-medication, replace)
   */
  private handleRouteQueryParams(): void {
    this.route.queryParams.subscribe(queryParams => {
      const action = queryParams['action'];
      this.currentAction = (action as any) || 'none';
      const planId = queryParams['planId'];
      
      if (!action || !this.routePatientId) {
        // No specific action, default behavior
        this.preselectPatientFromRoute();
        return;
      }

      // Wait for patients and plans to be loaded
      setTimeout(() => {
        switch (action) {
          case 'edit':
            this.handleEditAction(planId);
            break;
          case 'add-medication':
            this.handleAddMedicationAction(planId);
            break;
          case 'replace':
            this.handleReplaceAction();
            break;
          default:
            this.preselectPatientFromRoute();
        }
        
        // Clean query params after processing
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: {},
          replaceUrl: true
        });
      }, 500); // Small delay to ensure data is loaded
    });
  }

  /**
   * Action: Edit the current plan
   */
  private handleEditAction(planId: string): void {
    // Find the plan in the list
    const plan = this.allPrescriptions.find(p => p.id === Number(planId));
    if (plan) {
      this.selectedPlan = plan;
      this.openEditPrescriptionModal();
    } else {
      // If plan is not yet loaded, just open creation
      this.preselectPatientFromRoute();
    }
  }

  /**
   * Action: Add a medication to the current plan
   */
  private handleAddMedicationAction(planId: string): void {
    const plan = this.allPrescriptions.find(p => p.id === Number(planId));
    if (plan) {
      this.selectedPlan = plan;

      // Ensure "New Prescription" modal is not open
      this.showNewPrescriptionModal = false;

      this.openAddMedicationModal();
    } else {
      this.preselectPatientFromRoute();
    }
  }

  /**
   * Action: Replace the treatment (new plan)
   */
  private handleReplaceAction(): void {
    // Enable replace mode - when creating, this will stop the old plan
    this.isReplaceMode = true;
    // Open the creation modal with replacement indication
    this.preselectPatientFromRoute();
  }

  /**
   * Pre-select patient when coming from patient list
   */
  preselectPatientFromRoute(): void {
    if (!this.routePatientId || this.assignedPatients.length === 0) {
      return;
    }
    
    const patient = this.assignedPatients.find(p => p.id === this.routePatientId || p.userId === this.routePatientId);
    if (patient) {

      // Open "New Prescription" only if we are not in add-medication
      if (this.currentAction !== 'add-medication') {
        this.openNewPrescriptionModalInternal();
      } else {
        this.showNewPrescriptionModal = false; // just in case
      }
      
      // Then set the patient data after modal is rendered
      setTimeout(() => {
        this.selectedPatient = patient;
        const keycloakId = patient.userId || patient.id;
        this.newPlan.patientId = keycloakId;
        this.patientSearchQuery = this.getPatientDisplayName(patient);
        
        // Force change detection to update the view
        this.cdr.detectChanges();
      }, 0);
    } else {
    }
  }

  /**
   * Internal method to open modal WITHOUT resetting isReplaceMode
   */
  private openNewPrescriptionModalInternal(): void {
    this.resetPlanFormInternal();
    this.showNewPrescriptionModal = true;
  }

  /**
   * Reset form without touching isReplaceMode
   */
  private resetPlanFormInternal(): void {
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
      version: 1,
      lastRiskLevel: RiskLevel.LOW
    };
    this.selectedPatient = null;
    this.patientSearchQuery = '';
    this.showPatientDropdown = false;
    this.filteredPatients = this.assignedPatients;
  }

  // ==================== INITIALIZATION ====================

  initializeDates(): void {
    const today = new Date();
    this.newPlan.startDate = today.toISOString().split('T')[0];
  }

  /**
   * Load assigned patients for dropdown (NOT all patients)
   */
  loadAssignedPatients(): void {
    this.doctorPatientContext.getAssignedPatients().pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (patients) => {
        this.assignedPatients = patients;
        this.filteredPatients = patients;
        // If we have a route patient ID, try to pre-select now
        if (this.routePatientId) {
          this.preselectPatientFromRoute();
        }
      },
      error: (err) => {
        this.assignedPatients = [];
        this.filteredPatients = [];
      }
    });
  }

  /**
   * Get display name for patient
   */
  getPatientDisplayName(patient: PatientProfileResponse): string {
    if (!patient) return 'Unknown';
    
    const fullName = `${patient.firstName || ''} ${patient.lastName || ''}`.trim();
    return fullName || patient.userId || patient.id || 'Unknown';
  }

  // ==================== DATA LOADING ====================

  loadRecentPrescriptions(): void {
    this.loading = true;
    this.error = null;
    
    // Get all prescriptions and sort by updatedAt
    this.medicalService.getAllMedicationPlans().subscribe({
      next: (plans) => {
        // Filter plans to only include assigned patients
        const assignedPatientIds = new Set(this.assignedPatients.map(p => p.userId || p.id));
        this.allPrescriptions = this.sortByLastUpdated(plans.filter(plan => 
          assignedPatientIds.has(plan.patientId)
        ));
        this.updateDisplayedPrescriptions();
        this.loading = false;
      },
      error: (err) => {
        this.allPrescriptions = [];
        this.filteredPrescriptions = [];
        this.loading = false;
      }
    });
  }

  /**
   * Refresh prescriptions after patients are loaded
   */
  refreshPrescriptions(): void {
    if (this.assignedPatients.length === 0) {
      // Wait for patients to load then refresh
      this.doctorPatientContext.getAssignedPatients().pipe(
        takeUntil(this.destroy$)
      ).subscribe({
        next: (patients) => {
          this.assignedPatients = patients;
          this.filteredPatients = patients;
          this.loadRecentPrescriptions();
        },
        error: () => {
          this.loading = false;
        }
      });
    } else {
      this.loadRecentPrescriptions();
    }
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
      this.filteredPatients = this.assignedPatients;
      return;
    }

    const lowerQuery = query.toLowerCase();
    this.filteredPatients = this.assignedPatients.filter(patient => {
      const fullName = `${patient.firstName || ''} ${patient.lastName || ''}`.toLowerCase();
      return fullName.includes(lowerQuery) ||
        patient.id.toLowerCase().includes(lowerQuery) ||
        patient.userId.toLowerCase().includes(lowerQuery);
    });
  }

  /**
   * Select a patient from the dropdown
   */
  selectPatient(patient: PatientProfileResponse): void {

    this.selectedPatient = patient;

    const keycloakId = patient.userId || patient.id;
    this.newPlan.patientId = keycloakId;

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
    this.filteredPatients = this.assignedPatients;
  }

  // ==================== PRESCRIPTION CRUD ====================

  openNewPrescriptionModal(): void {
    this.isReplaceMode = false; // Reset replace mode for normal creation
    this.resetPlanForm();
    this.showNewPrescriptionModal = true;
  }

  closeNewPrescriptionModal(): void {
    this.showNewPrescriptionModal = false;
    this.isReplaceMode = false; // Reset replace mode when closing modal
    this.resetPlanForm();
  }

  createPrescription(): void {
    
    if (!this.validatePlan()) {
      return;
    }

    this.loading = true;
    
    // Use replace endpoint if in replace mode, otherwise use normal create
    let request$: Observable<MedicationPlan>;
    if (this.isReplaceMode) {
      request$ = this.medicalService.replaceMedicationPlan(this.newPlan.patientId, this.newPlan);
    } else {
      request$ = this.medicalService.createMedicationPlan(this.newPlan);
    }
    
    request$.subscribe({
      next: (plan: MedicationPlan) => {
        this.allPrescriptions.unshift(plan);
        this.updateDisplayedPrescriptions();
        this.selectedPlan = plan;
        this.closeNewPrescriptionModal();
        this.loading = false;
        
        // If in replace mode, refresh the plans list to get updated statuses
        if (this.isReplaceMode) {
          const patientKeycloakId = this.newPlan.patientId;
          this.isReplaceMode = false;

          // 1) re-fetch uniquement les plans de CE patient
          this.medicalService.getPatientMedicationPlans(patientKeycloakId).subscribe({
            next: (plans) => {
              const active = (plans || []).find(p => p.status === 'ACTIVE');

              if (active) {
                this.selectedPlan = { ...active }; // nouvelle référence
              }

              // 2) refresh la liste globale
              this.reloadPlans();
            },
            error: () => {
              this.reloadPlans();
            }
          });

          // garder ton nettoyage URL si tu veux
          this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { replace: null },
            queryParamsHandling: 'merge'
          });
        }
        
        // Open add medication modal immediately
        this.openAddMedicationModal();
      },
      error: (err: any) => {
        this.error = this.isReplaceMode 
          ? 'Error replacing prescription' 
          : 'Error creating prescription';
        this.loading = false;
      }
    });
  }

  /**
   * Reload all plans and recompute active plan.
   * Called after replace treatment to ensure old plan shows as STOPPED.
   */
  reloadPlans(): void {
    this.loading = true;
    
    // Get all plans but filter to assigned patients
    const assignedPatientIds = new Set(this.assignedPatients.map(p => p.userId || p.id));
    
    this.medicalService.getAllMedicationPlans().subscribe({
      next: (plans) => {
        this.allPrescriptions = this.sortByLastUpdated(plans.filter(plan => 
          assignedPatientIds.has(plan.patientId)
        ));
        this.updateDisplayedPrescriptions();
        
        // Recompute active plan from refreshed data
        const patientId = this.newPlan?.patientId || this.selectedPlan?.patientId;
        if (patientId) {
          const newActivePlan = this.allPrescriptions.find(p => 
            p.patientId === patientId && p.status === 'ACTIVE'
          );
          if (newActivePlan) {
            this.selectedPlan = newActivePlan;
          } else {
          }
        }
        
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
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
      status: this.selectedPlan.status,
      lastRiskLevel: this.selectedPlan.lastRiskLevel
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
      }
    });
  }

  // ==================== MEDICATION CRUD ====================

  openAddMedicationModal(): void {
    this.resetItemForm();
    this.showAddMedicationModal = true;
    // Setup autocomplete after modal is rendered
    setTimeout(() => {
      this.setupDrugAutocomplete();
    }, 0);
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
      version: 1,
      lastRiskLevel: RiskLevel.LOW
    };
    this.selectedPatient = null;
    this.patientSearchQuery = '';
    this.showPatientDropdown = false;
    this.filteredPatients = this.assignedPatients;
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
    // Reset drug autocomplete state
    this.selectedDrug = null;
    this.drugSuggestions = [];
    this.showDrugDropdown = false;
    this.drugSearchError = null;
    this.drugSearchControl.setValue('', { emitEvent: false });
  }

  // ==================== FORMATTERS ====================

  formatDate(dateString: string | undefined): string {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  formatShortDate(dateString: string | undefined): string {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('fr-FR', {
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
      'bg-emerald-500',
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

  // ==================== TIME SELECTION HELPERS ====================

  getNewItemTimesArray(): string[] {
    return this.parseTimesOfDay(this.newItem.timesOfDay);
  }

  getEditItemTimesArray(): string[] {
    return this.parseTimesOfDay(this.editItemData.timesOfDay || '');
  }

  toggleNewItemTime(time: string): void {
    const currentTimes = this.getNewItemTimesArray();
    const index = currentTimes.indexOf(time);
    
    if (index === -1) {
      currentTimes.push(time);
      currentTimes.sort();
    } else if (currentTimes.length > 1) {
      currentTimes.splice(index, 1);
    }
    
    this.newItem.timesOfDay = currentTimes.join(',');
  }

  toggleEditItemTime(time: string): void {
    const currentTimes = this.getEditItemTimesArray();
    const index = currentTimes.indexOf(time);
    
    if (index === -1) {
      currentTimes.push(time);
      currentTimes.sort();
    } else if (currentTimes.length > 1) {
      currentTimes.splice(index, 1);
    }
    
    this.editItemData.timesOfDay = currentTimes.join(',');
  }

  isNewItemTimeSelected(time: string): boolean {
    return this.getNewItemTimesArray().includes(time);
  }

  isEditItemTimeSelected(time: string): boolean {
    return this.getEditItemTimesArray().includes(time);
  }

  private parseTimesOfDay(timesOfDay: string): string[] {
    if (!timesOfDay) return ['08:00'];
    
    // If already in HH:mm format
    if (timesOfDay.includes(':')) {
      return timesOfDay.split(',').map(t => t.trim());
    }
    
    // Convert named times to HH:mm
    const timeMap: { [key: string]: string } = {
      'MORNING': '08:00',
      'NOON': '12:00',
      'AFTERNOON': '14:00',
      'EVENING': '18:00',
      'NIGHT': '22:00',
      'BEDTIME': '23:00'
    };
    
    return timesOfDay.split(',').map(t => timeMap[t.trim()] || '08:00');
  }

  getTimeLabel(timeValue: string): string {
    const time = this.availableTimes.find(t => t.value === timeValue);
    return time ? time.label : timeValue;
  }

  getNewItemTimesDisplay(): string {
    const times = this.getNewItemTimesArray();
    return times.map(t => this.getTimeLabel(t)).join(', ');
  }

  getEditItemTimesDisplay(): string {
    const times = this.getEditItemTimesArray();
    return times.map(t => this.getTimeLabel(t)).join(', ');
  }

  // ==================== COMPACT DISPLAY HELPERS ====================

  getShortPatientId(patientId: string): string {
    if (!patientId) return 'Unknown';
    // Show first 8 chars + last 4 if long, otherwise full
    if (patientId.length > 12) {
      return patientId.substring(0, 8) + '...' + patientId.substring(patientId.length - 4);
    }
    return patientId;
  }

  formatDateRangeCompact(startDate: string, endDate: string | undefined): string {
    if (!startDate) return 'No dates set';
    
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : null;
    
    const startMonth = start.toLocaleDateString('fr-FR', { month: 'short' });
    const startDay = start.getDate();
    const startYear = start.getFullYear();
    
    if (!end) {
      return `${startMonth} ${startDay}, ${startYear} – Ongoing`;
    }
    
    const endMonth = end.toLocaleDateString('fr-FR', { month: 'short' });
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
    
    return date.toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' });
  }

  // ==================== DRUG AUTOCOMPLETE ====================

  setupDrugAutocomplete(): void {
    // Reset any existing subscription
    this.drugSearchSubscription?.unsubscribe();
    
    // Reset state
    this.drugSuggestions = [];
    this.selectedDrug = null;
    this.drugSearchError = null;
    this.showDrugDropdown = false;
    
    // Initialize form control with current name value
    this.drugSearchControl.setValue(this.newItem.name || '', { emitEvent: false });
    
    // Setup the search stream
    this.drugSearchSubscription = this.drugSearchControl.valueChanges.pipe(
      takeUntil(this.destroy$),
      debounceTime(300),
      distinctUntilChanged(),
      filter((q): q is string => q !== null && q.length >= 3),
      switchMap(q => {
        this.isSearchingDrugs = true;
        this.drugSearchError = null;
        this.showDrugDropdown = true;
        this.cdr.detectChanges();
        
        return this.openFdaDrugService.search(q, 20).pipe(
          catchError(error => {
            // Handle CORS, 403, network errors
            this.drugSearchError = 'Catalogue indisponible, saisie manuelle possible';
            return of([]);
          })
        );
      })
    ).subscribe({
      next: (suggestions) => {
        this.drugSuggestions = suggestions;
        this.isSearchingDrugs = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.isSearchingDrugs = false;
        this.drugSuggestions = [];
        this.cdr.detectChanges();
      }
    });
    
    // Handle short queries (< 3 chars) - clear suggestions
    this.drugSearchControl.valueChanges.pipe(
      takeUntil(this.destroy$),
      filter((q): q is string => q !== null && q.length < 3 && q.length > 0)
    ).subscribe(() => {
      this.drugSuggestions = [];
      this.showDrugDropdown = false;
      this.cdr.detectChanges();
    });
    
    // Handle empty query - clear everything
    this.drugSearchControl.valueChanges.pipe(
      takeUntil(this.destroy$),
      filter(q => !q || q.length === 0)
    ).subscribe(() => {
      this.drugSuggestions = [];
      this.selectedDrug = null;
      this.showDrugDropdown = false;
      this.newItem.name = '';
      this.cdr.detectChanges();
    });
  }

  selectDrug(suggestion: DrugSuggestionDTO): void {
    this.selectedDrug = suggestion;
    this.newItem.name = suggestion.displayName;
    this.drugSearchControl.setValue(suggestion.displayName, { emitEvent: false });
    this.drugSuggestions = [];
    this.showDrugDropdown = false;
    this.drugSearchError = null;
    this.cdr.detectChanges();
  }

  clearDrugSelection(): void {
    this.selectedDrug = null;
    this.newItem.name = '';
    this.drugSearchControl.setValue('');
    this.drugSuggestions = [];
    this.showDrugDropdown = false;
  }

  hideDrugDropdown(): void {
    setTimeout(() => {
      this.showDrugDropdown = false;
      this.cdr.detectChanges();
    }, 200);
  }

  showDrugDropdownIfNeeded(): void {
    if (this.drugSuggestions.length > 0) {
      this.showDrugDropdown = true;
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.drugSearchSubscription?.unsubscribe();
  }
}
