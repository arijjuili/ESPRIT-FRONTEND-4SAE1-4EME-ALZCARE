import { Component, OnInit, OnDestroy, ViewContainerRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, forkJoin, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil, catchError } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth.service';
import { MedicalFollowupService } from '../../../core/services/medical-followup.service';
import { DoctorPatientContextService } from '../../../core/services/doctor-patient-context.service';
import { PatientProfileResponse } from '../../../core/services/patient.service';
import { 
  PrescriptionHelperService,
  PrescriptionAction
} from '../../../core/services/prescription-helper.service';
import { 
  MedicationPlan, 
  MedicationAutonomyLevel, 
  RiskLevel,
  Appointment
} from '../../../core/models/medical-followup.model';
import { ActivePlanModalComponent, ModalResult } from '../../../shared/components/active-plan-modal';
import { AdjustPlanComponent } from '../../../shared/components/adjust-plan';
import { AdjustPlanResult } from '../../../core/services/adjust-plan.service';
import { Router } from '@angular/router';

/**
 * Patient List Item - Extended patient data for the list view
 */
interface PatientListItem {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  username: string;
  status: string;
  autonomyLevel: MedicationAutonomyLevel | null;
  riskLevel: RiskLevel | null;
  nextAppointment: Date | null;
  medicationPlan: MedicationPlan | null;
}

/**
 * Sort configuration
 */
interface SortConfig {
  column: keyof PatientListItem | null;
  direction: 'asc' | 'desc';
}

/**
 * Doctor Patients List Component
 * 
 * Displays a paginated, sortable, and filterable list of patients
 * with quick actions for medical management.
 * 
 * SECURITY: Only shows patients assigned to this doctor via care-team service.
 */
@Component({
  selector: 'app-doctor-patients',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, ActivePlanModalComponent, AdjustPlanComponent],
  templateUrl: './doctor-patients.component.html',
  styleUrls: ['./doctor-patients.component.scss']
})
export class DoctorPatientsComponent implements OnInit, OnDestroy {
  doctorId = '';
  
  // Service injection for prescription management
  private prescriptionHelper = inject(PrescriptionHelperService);
  private viewContainerRef = inject(ViewContainerRef);
  
  // Raw data - now only assigned patients
  assignedPatients: PatientProfileResponse[] = [];
  medicationPlans: MedicationPlan[] = [];
  appointments: Appointment[] = [];
  
  // Processed patient list
  patientListItems: PatientListItem[] = [];
  filteredPatients: PatientListItem[] = [];
  
  // Filters
  searchQuery = '';
  autonomyFilter: MedicationAutonomyLevel | 'ALL' = 'ALL';
  riskFilter: RiskLevel | 'ALL' = 'ALL';
  
  // Sorting
  sortConfig: SortConfig = { column: 'fullName', direction: 'asc' };
  
  // Pagination
  currentPage = 1;
  pageSize = 10;
  pageSizeOptions = [5, 10, 25, 50];
  
  // Loading state
  loading = true;
  error: string | null = null;
  
  // Enums for template
  autonomyLevels = MedicationAutonomyLevel;
  riskLevels = RiskLevel;
  
  // Debounce subject for search
  private searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();

  // Modal state
  showActivePlanModal = false;
  activePlanForModal: MedicationPlan | null = null;
  activePlanPatientId: string | null = null;
  private modalResolve: ((value: PrescriptionAction) => void) | null = null;

  // Adjust Plan state
  showAdjustPlanModal = false;
  planToAdjust: MedicationPlan | null = null;

  constructor(
    private router: Router,
    private authService: AuthService,
    private medicalService: MedicalFollowupService,
    private doctorPatientContext: DoctorPatientContextService
  ) {}

  ngOnInit(): void {
    const currentUser = this.authService.getCurrentUser();
    
    if (currentUser) {
      this.doctorId = currentUser.id;
      this.loadData();
    } else {
      this.error = 'You must be logged in to view this page';
      this.loading = false;
    }
    
    // Setup debounced search
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.applyFilters();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load all necessary data - only for assigned patients
   */
  loadData(): void {
    this.loading = true;
    this.error = null;

    // Get date range for appointments (next 3 months)
    const today = new Date();
    const threeMonthsLater = new Date();
    threeMonthsLater.setMonth(today.getMonth() + 3);

    // Load assigned patients from context service (NOT all patients)
    this.doctorPatientContext.getAssignedPatients().pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (patients) => {
        this.assignedPatients = patients;
        
        // Now load medication plans and appointments for these patients
        this.loadMedicalData(today, threeMonthsLater);
      },
      error: (err) => {
        console.error('Error loading assigned patients:', err);
        this.error = 'Failed to load your assigned patients';
        this.loading = false;
      }
    });
  }

  /**
   * Load medication plans and appointments after patients are loaded
   */
  private loadMedicalData(today: Date, threeMonthsLater: Date): void {
    forkJoin({
      medicationPlans: this.medicalService.getAllMedicationPlans().pipe(catchError(() => of([]))),
      appointments: this.medicalService.getDoctorAppointments(
        this.doctorId, 
        today.toISOString(), 
        threeMonthsLater.toISOString()
      ).pipe(catchError(() => of([])))
    }).subscribe({
      next: (data) => {
        this.medicationPlans = data.medicationPlans;
        this.appointments = data.appointments;
        this.processPatientData();
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading medical data:', err);
        this.error = 'Failed to load medical data';
        this.loading = false;
      }
    });
  }

  /**
   * Process raw data into patient list items
   * Only includes assigned patients
   */
  processPatientData(): void {
    this.patientListItems = this.assignedPatients.map(patient => {
      const keycloakId = patient.userId || patient.id;

      // Find medication plan for this patient
      const plan = this.medicationPlans.find(p => p.patientId === keycloakId) || null;

      // Find upcoming appointments for this patient
      const patientAppointments = this.appointments
        .filter(a => a.patientId === keycloakId)
        .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());

      const nextAppointment = patientAppointments.length > 0
        ? new Date(patientAppointments[0].startAt)
        : null;

      return {
        id: patient.id,
        userId: keycloakId,
        fullName: `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || 'Unknown Patient',
        email: (patient as any).email || '',
        username: (patient as any).username || '',
        status: 'ACTIVE',
        autonomyLevel: plan?.autonomyLevel || null,
        riskLevel: plan?.lastRiskLevel || null,
        nextAppointment,
        medicationPlan: plan
      };
    });

    this.applyFilters();
  }

  /**
   * Handle search input
   */
  onSearchInput(value: string): void {
    this.searchQuery = value || '';
    this.searchSubject.next(this.searchQuery);
  }

  /**
   * Apply all filters to the patient list
   */
  applyFilters(): void {
    let filtered = [...this.patientListItems];
    
    // Search by name
    if (this.searchQuery && this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase().trim();
      filtered = filtered.filter(p => {
        const fullNameMatch = (p.fullName?.toLowerCase() || '').includes(query);
        const usernameMatch = (p.username?.toLowerCase() || '').includes(query);
        const emailMatch = (p.email?.toLowerCase() || '').includes(query);
        return fullNameMatch || usernameMatch || emailMatch;
      });
    }
    
    // Filter by autonomy level
    if (this.autonomyFilter !== 'ALL') {
      filtered = filtered.filter(p => p.autonomyLevel === this.autonomyFilter);
    }
    
    // Filter by risk level
    if (this.riskFilter !== 'ALL') {
      filtered = filtered.filter(p => p.riskLevel === this.riskFilter);
    }
    
    // Apply sorting
    filtered = this.sortPatients(filtered);
    
    this.filteredPatients = filtered;
    this.currentPage = 1; // Reset to first page when filters change
  }

  /**
   * Sort patients based on current sort configuration
   */
  sortPatients(patients: PatientListItem[]): PatientListItem[] {
    if (!this.sortConfig.column) return patients;
    
    const { column, direction } = this.sortConfig;
    const multiplier = direction === 'asc' ? 1 : -1;
    
    return [...patients].sort((a, b) => {
      let valueA = a[column];
      let valueB = b[column];
      
      // Handle null values
      if (valueA === null && valueB === null) return 0;
      if (valueA === null) return 1;
      if (valueB === null) return -1;
      
      // Compare based on type
      if (valueA instanceof Date && valueB instanceof Date) {
        return (valueA.getTime() - valueB.getTime()) * multiplier;
      }
      
      // String comparison
      const strA = String(valueA).toLowerCase();
      const strB = String(valueB).toLowerCase();
      
      if (strA < strB) return -1 * multiplier;
      if (strA > strB) return 1 * multiplier;
      return 0;
    });
  }

  /**
   * Toggle sort for a column
   */
  toggleSort(column: keyof PatientListItem): void {
    if (this.sortConfig.column === column) {
      // Toggle direction
      this.sortConfig.direction = this.sortConfig.direction === 'asc' ? 'desc' : 'asc';
    } else {
      // New column, default to ascending
      this.sortConfig.column = column;
      this.sortConfig.direction = 'asc';
    }
    this.applyFilters();
  }

  /**
   * Get sort icon class
   */
  getSortIcon(column: keyof PatientListItem): string {
    if (this.sortConfig.column !== column) {
      return '↕️';
    }
    return this.sortConfig.direction === 'asc' ? '↑' : '↓';
  }

  /**
   * Get paginated patients
   */
  getPaginatedPatients(): PatientListItem[] {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    return this.filteredPatients.slice(startIndex, startIndex + this.pageSize);
  }

  /**
   * Get total pages
   */
  getTotalPages(): number {
    return Math.ceil(this.filteredPatients.length / this.pageSize);
  }

  /**
   * Get page numbers for pagination
   */
  getPageNumbers(): number[] {
    const totalPages = this.getTotalPages();
    const pages: number[] = [];
    
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i);
    }
    
    return pages;
  }

  /**
   * Go to specific page
   */
  goToPage(page: number): void {
    if (page >= 1 && page <= this.getTotalPages()) {
      this.currentPage = page;
    }
  }

  /**
   * Change page size
   */
  onPageSizeChange(size: number): void {
    this.pageSize = size;
    this.currentPage = 1;
  }

  /**
   * Get risk level badge color class
   */
  getRiskBadgeClass(riskLevel: RiskLevel | null): string {
    switch (riskLevel) {
      case RiskLevel.LOW:
        return 'badge-success';
      case RiskLevel.MEDIUM:
        return 'badge-warning';
      case RiskLevel.HIGH:
        return 'badge-danger';
      default:
        return 'badge-default';
    }
  }

  /**
   * Get autonomy level badge color class
   */
  getAutonomyBadgeClass(autonomyLevel: MedicationAutonomyLevel | null): string {
    switch (autonomyLevel) {
      case MedicationAutonomyLevel.INDEPENDENT:
        return 'badge-success';
      case MedicationAutonomyLevel.ASSISTED:
        return 'badge-info';
      case MedicationAutonomyLevel.DEPENDENT:
        return 'badge-warning';
      default:
        return 'badge-default';
    }
  }

  /**
   * Get autonomy level display text
   */
  getAutonomyLabel(autonomyLevel: MedicationAutonomyLevel | null): string {
    switch (autonomyLevel) {
      case MedicationAutonomyLevel.INDEPENDENT:
        return 'Independent';
      case MedicationAutonomyLevel.ASSISTED:
        return 'Assisted';
      case MedicationAutonomyLevel.DEPENDENT:
        return 'Dependent';
      default:
        return 'Not defined';
    }
  }

  /**
   * Get risk level display text
   */
  getRiskLabel(riskLevel: RiskLevel | null): string {
    switch (riskLevel) {
      case RiskLevel.LOW:
        return 'Low';
      case RiskLevel.MEDIUM:
        return 'Medium';
      case RiskLevel.HIGH:
        return 'High';
      default:
        return 'Not assessed';
    }
  }

  /**
   * Format date for display
   */
  formatDate(date: Date | null): string {
    if (!date) return '—';
    
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    // Format the date
    const formatted = date.toLocaleString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    // Add relative time indicator for upcoming appointments
    if (diffMs > 0) {
      if (diffDays === 0) return `${formatted} (Aujourd'hui)`;
      if (diffDays === 1) return `${formatted} (Demain)`;
      if (diffDays < 7) return `${formatted} (Dans ${diffDays} jours)`;
    }
    
    return formatted;
  }

  /**
   * Refresh data
   */
  refresh(): void {
    // Invalidate cache and reload
    this.doctorPatientContext.invalidate();
    this.loadData();
  }

  /**
   * Track by patient ID for ngFor
   */
  trackByPatientId(index: number, patient: PatientListItem): string {
    return patient.id;
  }

  /**
   * Reset all filters
   */
  resetFilters(): void {
    this.searchQuery = '';
    this.autonomyFilter = 'ALL';
    this.riskFilter = 'ALL';
    this.applyFilters();
  }

  /**
   * Get initials from full name
   */
  getInitials(fullName: string): string {
    if (!fullName) return '?';
    const parts = fullName.split(' ');
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }

  /**
   * Math reference for template
   */
  protected readonly Math = Math;

  // ========================================
  // PRESCRIPTION FLOW - Active Plan Handling
  // ========================================

  /**
   * Handles the "Prescribe" button click
   * Checks if an active plan exists before navigating
   * 
   * @param patient - The selected patient
   */
  onPrescribeClick(patient: PatientListItem): void {
    const keycloakPatientId = patient.userId;

    if (!keycloakPatientId) {
      console.error('[Prescribe] patient.userId (Keycloak UUID) is missing!', patient);
      return;
    }

    this.medicalService.getPatientMedicationPlans(keycloakPatientId).subscribe({
      next: (plans) => {
        const activePlan = (plans || []).find(p => p.status === 'ACTIVE');

        if (activePlan) {
          // Open the modal
          this.activePlanForModal = activePlan;
          this.activePlanPatientId = keycloakPatientId;
          this.showActivePlanModal = true;
          return;
        }

        // No active plan → go to create prescription
        this.router.navigate(['/doctor/patients', patient.id, 'prescriptions']);
      },
      error: (err) => {
        console.error('[Prescribe] failed to load plans', err);
        // fallback: navigate
        this.router.navigate(['/doctor/patients', patient.id, 'prescriptions']);
      }
    });
  }

  /**
   * Opens the active plan modal and returns a Promise with the chosen action
   * 
   * @param plan - The active plan
   * @param patientId - Patient ID
   * @returns Promise with the chosen action
   */
  private openActivePlanModal(plan: MedicationPlan, patientId: string): Promise<PrescriptionAction> {
    return new Promise((resolve) => {
      this.activePlanForModal = plan;
      this.activePlanPatientId = patientId;
      this.modalResolve = resolve;
      this.showActivePlanModal = true;
    });
  }

  /**
   * Called when an action is selected in the modal
   */
  onModalActionSelected(result: { action: any; plan?: MedicationPlan }): void {
    const plan = result.plan;
    const keycloakPatientId = this.activePlanPatientId;

    if (!plan || !keycloakPatientId) {
      this.onModalClosed();
      return;
    }

    // Close main modal
    this.showActivePlanModal = false;

    // 3 possible actions
    if (result.action === 'ADJUST_CURRENT') {
      this.planToAdjust = plan;
      this.showAdjustPlanModal = true;
      return;
    }

    if (result.action === 'ADD_MEDICATION') {
      // Open prescriptions with action add-medication
      const patientItem = this.patientListItems.find(p => p.userId === keycloakPatientId);
      const profileId = patientItem?.id || keycloakPatientId;
      this.router.navigate(
        ['/doctor/patients', profileId, 'prescriptions'],
        { queryParams: { action: 'add-medication', planId: plan.id } }
      );
      this.onModalClosed();
      return;
    }

    if (result.action === 'REPLACE_TREATMENT') {
      // Open prescriptions with replace=true
      const patientItem = this.patientListItems.find(p => p.userId === keycloakPatientId);
      const profileId = patientItem?.id || keycloakPatientId;
      this.router.navigate(
        ['/doctor/patients', profileId, 'prescriptions'],
        { queryParams: { action: 'replace' } }
      );
      this.onModalClosed();
      return;
    }

    this.onModalClosed();
  }

  /**
   * Called when the modal is closed without action
   */
  onModalClosed(): void {
    this.showActivePlanModal = false;
    
    if (this.modalResolve) {
      this.modalResolve('CANCEL');
      this.modalResolve = null;
    }
    
    // Reset state
    this.activePlanForModal = null;
    this.activePlanPatientId = null;
  }

  // ========================================
  // ADJUST PLAN MODAL HANDLERS
  // ========================================

  /**
   * Called when adjustment is confirmed
   */
  onAdjustConfirmed(result: AdjustPlanResult): void {
    this.showAdjustPlanModal = false;
    this.planToAdjust = null;
    
    // Refresh the patient data to reflect changes
    this.refresh();
  }

  /**
   * Called when adjustment is cancelled
   */
  onAdjustCancelled(): void {
    this.showAdjustPlanModal = false;
    this.planToAdjust = null;
  }
}
