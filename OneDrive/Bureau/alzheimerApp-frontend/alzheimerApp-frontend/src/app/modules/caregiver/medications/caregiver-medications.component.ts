import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, forkJoin, of } from 'rxjs';
import { takeUntil, catchError } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth.service';
import { MedicalFollowupService } from '../../../core/services/medical-followup.service';
import { UserManagementService } from '../../../core/services/user-management.service';
import { 
  ManagedUser 
} from '../../../core/models/user-management.model';
import { 
  MedicationPlan, 
  MedicationItem,
  MedicationIntake,
  MedicationAutonomyLevel, 
  RiskLevel,
  PlanStatus,
  IntakeStatus,
  ValidatorRole
} from '../../../core/models/medical-followup.model';

/**
 * Patient List Item - Simplified patient data for dropdown
 */
interface PatientListItem {
  id: string;
  userId: string;  // Keycloak UUID
  fullName: string;
  email: string;
  autonomyLevel: MedicationAutonomyLevel | null;
}

/**
 * Stats for the selected patient
 */
interface PatientStats {
  totalPlans: number;
  activePlans: number;
  totalItems?: number;
  highRiskItems?: number;
  adherenceRate?: number;
  pendingIntakes?: number;
  pendingIntakesToday?: number;
  takenIntakes?: number;
  missedIntakes?: number;
}

/**
 * Caregiver Medications Component
 * 
 * Allows caregivers to:
 * - View medication intakes for their patients
 * - Validate medication intake for patients with ASSISTED or DEPENDENT autonomy
 * - Mark intakes as missed
 * - View adherence statistics
 */
@Component({
  selector: 'app-caregiver-medications',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './caregiver-medications.component.html',
  styleUrls: ['./caregiver-medications.component.scss']
})
export class CaregiverMedicationsComponent implements OnInit, OnDestroy {
  caregiverId = '';
  
  // Data
  patients: PatientListItem[] = [];
  medicationPlans: MedicationPlan[] = [];
  allIntakes: MedicationIntake[] = [];
  intakesByItem: Map<number, MedicationIntake[]> = new Map(); // intakes keyed by itemId
  
  // Selected patient
  selectedPatientId = '';
  selectedPatient: PatientListItem | null = null;
  
  // Stats
  stats: PatientStats = {
    totalPlans: 0,
    activePlans: 0,
    adherenceRate: 0,
    pendingIntakesToday: 0
  };
  
  // Filters
  intakeFilter: 'ALL' | 'PENDING' | 'TAKEN' | 'MISSED' | 'DELAYED' = 'ALL';
  
  // Loading state
  loading = false;
  error: string | null = null;
  
  // Modal state
  showValidationModal = false;
  intakeToValidate: MedicationIntake | null = null;
  validationNotes = '';
  
  showMissedModal = false;
  intakeToMarkMissed: MedicationIntake | null = null;
  missedReason = '';
  
  // Enums for template
  autonomyLevels = MedicationAutonomyLevel;
  intakeStatuses = IntakeStatus;
  
  private destroy$ = new Subject<void>();

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private authService: AuthService,
    private medicalService: MedicalFollowupService,
    private userService: UserManagementService
  ) {}

  ngOnInit(): void {
    const currentUser = this.authService.getCurrentUser();
    
    if (currentUser) {
      this.caregiverId = currentUser.id;
      this.loadPatients();
      
      // Check for patientId in query params
      this.route.queryParams.pipe(
        takeUntil(this.destroy$)
      ).subscribe(params => {
        if (params['patientId']) {
          this.selectedPatientId = params['patientId'];
          this.onPatientChange();
        }
      });
    } else {
      console.error('No current user found');
      this.error = 'You must be logged in to view this page';
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load patients assigned to this caregiver
   */
  loadPatients(): void {
    this.userService.getPatientsForCaregiver(this.caregiverId).pipe(
      catchError(() => {
        // Fallback: get all active patients
        return this.userService.getActivePatients().pipe(
          catchError(() => of([]))
        );
      })
    ).subscribe({
      next: (patients) => {
        this.patients = patients.map(patient => {
          const keycloakId = (patient as any).userId || (patient as any).keycloakId || patient.id;
          return {
            id: patient.id,
            userId: keycloakId,
            fullName: patient.fullName ||
              (patient.firstName && patient.lastName ? `${patient.firstName} ${patient.lastName}` : patient.username),
            email: patient.email,
            autonomyLevel: null // Will be set when loading medication data
          };
        });
      },
      error: (err) => {
        console.error('Error loading patients:', err);
        this.error = 'Failed to load patients';
      }
    });
  }

  /**
   * Load data when patient selection changes
   */
  onPatientChange(): void {
    if (!this.selectedPatientId) {
      this.selectedPatient = null;
      this.medicationPlans = [];
      this.allIntakes = [];
      return;
    }

    this.selectedPatient = this.patients.find(p => p.userId === this.selectedPatientId) || null;
    this.loadData();
  }

  /**
   * Load medication data for selected patient
   */
  loadData(): void {
    if (!this.selectedPatientId) return;

    this.loading = true;
    this.error = null;
    this.intakesByItem.clear(); // Clear previous intakes

    // Load medication plans and stats
    forkJoin({
      plans: this.medicalService.getPatientMedicationPlans(this.selectedPatientId).pipe(
        catchError(() => of([]))
      ),
      stats: this.medicalService.getPatientMedicationStats(this.selectedPatientId).pipe(
        catchError(() => of({
          totalPlans: 0,
          activePlans: 0,
          adherenceRate: 0,
          pendingIntakesToday: 0
        }))
      ),
      intakes: this.medicalService.getPatientMedicationIntakes(this.selectedPatientId).pipe(
        catchError(() => of([]))
      )
    }).subscribe({
      next: (results) => {
        console.log('[CaregiverMedications] Loaded data:', results);
        this.medicationPlans = results.plans;
        this.stats = results.stats;
        this.allIntakes = results.intakes;
        
        // DEBUG: Log detailed structure
        console.log('[CaregiverMedications] Plans count:', this.medicationPlans.length);
        this.medicationPlans.forEach((plan, i) => {
          console.log(`[CaregiverMedications] Plan ${i}:`, {
            id: plan.id,
            title: plan.title,
            itemsCount: plan.items?.length || 0,
            items: plan.items?.map(item => ({ id: item.id, name: item.name }))
          });
        });
        
        // Log intakes for debugging
        if (results.intakes.length > 0) {
          console.log('[CaregiverMedications] Sample intake:', results.intakes[0]);
        }
        
        // Update patient's autonomy level from first active plan
        if (this.selectedPatient && this.medicationPlans.length > 0) {
          const activePlan = this.medicationPlans.find(p => p.status === PlanStatus.ACTIVE);
          if (activePlan) {
            this.selectedPatient.autonomyLevel = activePlan.autonomyLevel;
          }
        }
        
        // Load intakes for each item individually
        this.loadIntakesForItems();
      },
      error: (err) => {
        console.error('Error loading medication data:', err);
        this.error = 'Failed to load medication data';
        this.loading = false;
      }
    });
  }

  /**
   * Load intakes for each medication item individually
   * This is needed because the backend doesn't return itemId in the patient intakes response
   */
  private loadIntakesForItems(): void {
    const allItems = this.medicationPlans.flatMap(p => p.items || []);
    
    console.log('[CaregiverMedications] loadIntakesForItems - items found:', allItems.length);
    console.log('[CaregiverMedications] Items with IDs:', allItems.map(i => ({ id: i.id, name: i.name })));
    
    if (allItems.length === 0) {
      console.log('[CaregiverMedications] No items found, stopping loading');
      this.loading = false;
      return;
    }

    // Load intakes for each item
    const intakeRequests = allItems.map(item => {
      if (!item.id) return of([]);
      return this.medicalService.getMedicationIntakes(item.id).pipe(
        catchError(() => of([]))
      );
    });

    forkJoin(intakeRequests).subscribe({
      next: (results) => {
        console.log('[CaregiverMedications] Intakes loaded for items:', results.length);
        allItems.forEach((item, index) => {
          if (item.id && results[index]) {
            console.log(`[CaregiverMedications] Item ${item.id} (${item.name}): ${results[index].length} intakes`);
            this.intakesByItem.set(item.id, results[index]);
          }
        });
        console.log('[CaregiverMedications] intakesByItem Map:', Array.from(this.intakesByItem.entries()));
        this.loading = false;
      },
      error: (err) => {
        console.error('[CaregiverMedications] Error loading intakes:', err);
        this.loading = false;
      }
    });
  }

  /**
   * Get intakes for a specific medication item
   * Uses the intakes loaded per item from the backend
   */
  getIntakesForItem(itemId: number | undefined): MedicationIntake[] {
    if (!itemId) {
      console.log('[getIntakesForItem] No itemId provided');
      return [];
    }
    // Use the Map that was populated by loadIntakesForItems()
    const intakes = this.intakesByItem.get(itemId) || [];
    
    // Debug logging
    console.log(`[getIntakesForItem] itemId=${itemId}, found=${intakes.length}, Map size=${this.intakesByItem.size}`);
    
    return intakes;
  }

  /**
   * Get filtered intakes for a medication item
   */
  getFilteredIntakesForItem(itemId: number | undefined): MedicationIntake[] {
    let intakes = this.getIntakesForItem(itemId);
    
    if (this.intakeFilter === 'PENDING') {
      intakes = intakes.filter(i => i.status === IntakeStatus.PENDING);
    } else if (this.intakeFilter === 'TAKEN') {
      intakes = intakes.filter(i => i.status === IntakeStatus.TAKEN);
    } else if (this.intakeFilter === 'MISSED') {
      intakes = intakes.filter(i => i.status === IntakeStatus.MISSED);
    } else if (this.intakeFilter === 'DELAYED') {
      intakes = intakes.filter(i => i.status === IntakeStatus.DELAYED);
    }
    
    // Sort by scheduled time (newest first)
    return intakes.sort((a, b) => 
      new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime()
    );
  }

  /**
   * Apply intake filter
   */
  applyIntakeFilter(): void {
    // Trigger change detection by creating new reference
    this.allIntakes = [...this.allIntakes];
  }

  /**
   * Check if caregiver can validate an intake
   * - Patient autonomy level must be ASSISTED or DEPENDENT
   * - Intake must be pending or delayed
   */
  canValidateIntake(intake: MedicationIntake): boolean {
    if (!this.selectedPatient) return false;
    if (intake.status !== IntakeStatus.PENDING && intake.status !== IntakeStatus.DELAYED) return false;
    
    // Can validate for ASSISTED or DEPENDENT patients
    return this.selectedPatient.autonomyLevel === MedicationAutonomyLevel.ASSISTED ||
           this.selectedPatient.autonomyLevel === MedicationAutonomyLevel.DEPENDENT;
  }

  /**
   * Check if caregiver can mark an intake as missed
   */
  canMarkAsMissed(intake: MedicationIntake): boolean {
    if (!this.selectedPatient) return false;
    if (intake.status !== IntakeStatus.PENDING && intake.status !== IntakeStatus.DELAYED) return false;
    return true;
  }

  /**
   * Open validation modal
   */
  validateIntake(intake: MedicationIntake): void {
    this.intakeToValidate = intake;
    this.validationNotes = '';
    this.showValidationModal = true;
  }

  /**
   * Confirm validation
   */
  confirmValidation(): void {
    if (!this.intakeToValidate?.id) return;

    this.medicalService.confirmMedicationIntakeByCaregiver(
      this.intakeToValidate.id,
      this.caregiverId,
      this.validationNotes
    ).subscribe({
      next: (updatedIntake) => {
        // Update the intake in the list
        const index = this.allIntakes.findIndex(i => i.id === updatedIntake.id);
        if (index !== -1) {
          this.allIntakes[index] = updatedIntake;
          this.allIntakes = [...this.allIntakes]; // Trigger change detection
        }
        this.showValidationModal = false;
        this.intakeToValidate = null;
        
        // Refresh stats
        this.loadData();
      },
      error: (err) => {
        console.error('Error validating intake:', err);
        alert('Failed to validate intake. Please try again.');
      }
    });
  }

  /**
   * Cancel validation
   */
  cancelValidation(): void {
    this.showValidationModal = false;
    this.intakeToValidate = null;
    this.validationNotes = '';
  }

  /**
   * Open mark as missed modal
   */
  markAsMissed(intake: MedicationIntake): void {
    this.intakeToMarkMissed = intake;
    this.missedReason = '';
    this.showMissedModal = true;
  }

  /**
   * Confirm mark as missed
   */
  confirmMarkAsMissed(): void {
    if (!this.intakeToMarkMissed?.id) return;

    this.medicalService.markMedicationIntakeAsMissed(
      this.intakeToMarkMissed.id,
      this.caregiverId,
      ValidatorRole.CAREGIVER,
      this.missedReason
    ).subscribe({
      next: (updatedIntake) => {
        // Update the intake in the list
        const index = this.allIntakes.findIndex(i => i.id === updatedIntake.id);
        if (index !== -1) {
          this.allIntakes[index] = updatedIntake;
          this.allIntakes = [...this.allIntakes]; // Trigger change detection
        }
        this.showMissedModal = false;
        this.intakeToMarkMissed = null;
        
        // Refresh stats
        this.loadData();
      },
      error: (err) => {
        console.error('Error marking intake as missed:', err);
        alert('Failed to mark intake as missed. Please try again.');
      }
    });
  }

  /**
   * Cancel mark as missed
   */
  cancelMarkAsMissed(): void {
    this.showMissedModal = false;
    this.intakeToMarkMissed = null;
    this.missedReason = '';
  }

  /**
   * Navigate back to patients list
   */
  goBack(): void {
    this.router.navigate(['/caregiver/patients']);
  }

  /**
   * Check if stock is low
   */
  isLowStock(item: MedicationItem): boolean {
    return item.stockQuantity <= item.lowThreshold;
  }

  /**
   * Check if intake is overdue
   */
  isOverdue(intake: MedicationIntake): boolean {
    if (intake.status !== IntakeStatus.PENDING) return false;
    return new Date(intake.scheduledAt) < new Date();
  }

  /**
   * Check if date is today
   */
  isToday(dateString: string): boolean {
    const date = new Date(dateString);
    const today = new Date();
    return date.toDateString() === today.toDateString();
  }

  /**
   * Format date and time
   */
  formatDateTime(dateString: string): string {
    return new Date(dateString).toLocaleString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Get CSS class for plan status
   */
  getPlanStatusClass(status: PlanStatus): string {
    const classes: Record<PlanStatus, string> = {
      [PlanStatus.ACTIVE]: 'bg-green-100 text-green-800',
      [PlanStatus.SUSPENDED]: 'bg-yellow-100 text-yellow-800',
      [PlanStatus.STOPPED]: 'bg-red-100 text-red-800',
      [PlanStatus.COMPLETED]: 'bg-emerald-100 text-emerald-800'
    };
    return classes[status];
  }

  /**
   * Get CSS class for autonomy level badge
   */
  getAutonomyBadgeClass(autonomyLevel: MedicationAutonomyLevel | null): string {
    switch (autonomyLevel) {
      case MedicationAutonomyLevel.INDEPENDENT:
        return 'bg-green-100 text-green-800';
      case MedicationAutonomyLevel.ASSISTED:
        return 'bg-blue-100 text-blue-800';
      case MedicationAutonomyLevel.DEPENDENT:
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  /**
   * Get CSS class for intake status
   */
  getIntakeStatusClass(status: IntakeStatus): string {
    const classes: Record<IntakeStatus, string> = {
      [IntakeStatus.PENDING]: 'bg-gray-100 text-gray-600',
      [IntakeStatus.TAKEN]: 'bg-green-100 text-green-700',
      [IntakeStatus.DELAYED]: 'bg-yellow-100 text-yellow-700',
      [IntakeStatus.MISSED]: 'bg-red-100 text-red-700',
      [IntakeStatus.REFUSED]: 'bg-orange-100 text-orange-700'
    };
    return classes[status];
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
}
