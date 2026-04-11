import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, forkJoin, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil, catchError } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth.service';
import { MedicalFollowupService } from '../../../core/services/medical-followup.service';
import { UserManagementService } from '../../../core/services/user-management.service';
import { 
  ManagedUser 
} from '../../../core/models/user-management.model';
import { 
  MedicationPlan, 
  MedicationAutonomyLevel, 
  RiskLevel,
  MedicationDashboardStats
} from '../../../core/models/medical-followup.model';

/**
 * Patient List Item - Extended patient data for caregiver view
 */
interface PatientListItem {
  id: string;
  userId: string;  // Keycloak UUID
  fullName: string;
  email: string;
  username: string;
  status: string;
  autonomyLevel: MedicationAutonomyLevel | null;
  riskLevel: RiskLevel | null;
  medicationPlan: MedicationPlan | null;
  adherenceRate: number;
  pendingIntakes: number;
}

/**
 * Caregiver Patients Component
 * 
 * Displays a list of patients assigned to the caregiver
 * with their medication status and quick actions.
 */
@Component({
  selector: 'app-caregiver-patients',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './caregiver-patients.component.html',
  styleUrls: ['./caregiver-patients.component.scss']
})
export class CaregiverPatientsComponent implements OnInit, OnDestroy {
  caregiverId = '';
  
  // Data
  patients: ManagedUser[] = [];
  medicationPlans: MedicationPlan[] = [];
  patientStats: Map<string, MedicationDashboardStats> = new Map();
  
  // Processed patient list
  patientListItems: PatientListItem[] = [];
  filteredPatients: PatientListItem[] = [];
  
  // Filters
  searchQuery = '';
  autonomyFilter: MedicationAutonomyLevel | 'ALL' = 'ALL';
  
  // Loading state
  loading = true;
  error: string | null = null;
  
  // Selected patient for details modal
  selectedPatient: PatientListItem | null = null;
  
  // Enums for template
  autonomyLevels = MedicationAutonomyLevel;
  riskLevels = RiskLevel;
  
  // Debounce subject for search
  private searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();

  constructor(
    private router: Router,
    private authService: AuthService,
    private medicalService: MedicalFollowupService,
    private userService: UserManagementService
  ) {}

  ngOnInit(): void {
    const currentUser = this.authService.getCurrentUser();
    
    if (currentUser) {
      this.caregiverId = currentUser.id;
      this.loadData();
    } else {
      console.error('No current user found');
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
   * Load all necessary data
   */
  loadData(): void {
    this.loading = true;
    this.error = null;

    // Get patients assigned to this caregiver
    this.userService.getPatientsForCaregiver(this.caregiverId).pipe(
      catchError(() => {
        // Fallback: get all active patients if endpoint doesn't exist
        return this.userService.getActivePatients().pipe(
          catchError(() => of([]))
        );
      })
    ).subscribe({
      next: (patients) => {
        this.patients = patients;
        this.loadMedicationData();
      },
      error: (err) => {
        console.error('Error loading patients:', err);
        this.error = 'Failed to load patients data';
        this.loading = false;
      }
    });
  }

  /**
   * Load medication plans and stats for all patients
   */
  loadMedicationData(): void {
    if (this.patients.length === 0) {
      this.processPatientData();
      this.loading = false;
      return;
    }

    // Load medication plans for each patient
    const planRequests = this.patients.map(patient => {
      const keycloakId = (patient as any).userId || (patient as any).keycloakId || patient.id;
      return this.medicalService.getPatientMedicationPlans(keycloakId).pipe(
        catchError(() => of([]))
      );
    });

    // Load stats for each patient
    const statsRequests = this.patients.map(patient => {
      const keycloakId = (patient as any).userId || (patient as any).keycloakId || patient.id;
      return this.medicalService.getPatientMedicationStats(keycloakId).pipe(
        catchError(() => of({
          totalPlans: 0,
          activePlans: 0,
          adherenceRate: 0,
          pendingIntakesToday: 0
        }))
      );
    });

    forkJoin({
      plans: forkJoin(planRequests).pipe(catchError(() => of([]))),
      stats: forkJoin(statsRequests).pipe(catchError(() => of([])))
    }).subscribe({
      next: (results: any) => {
        // Flatten plans array
        this.medicationPlans = (results.plans as MedicationPlan[][]).flat();
        
        // Store stats
        this.patients.forEach((patient, index) => {
          const keycloakId = (patient as any).userId || (patient as any).keycloakId || patient.id;
          if (results.stats && results.stats[index]) {
            this.patientStats.set(keycloakId, results.stats[index]);
          }
        });

        this.processPatientData();
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading medication data:', err);
        // Continue with empty data
        this.processPatientData();
        this.loading = false;
      }
    });
  }

  /**
   * Process raw data into patient list items
   */
  processPatientData(): void {
    this.patientListItems = this.patients.map(patient => {
      const keycloakId = (patient as any).userId || (patient as any).keycloakId || patient.id;
      
      // Find medication plan for this patient
      const plan = this.medicationPlans.find(p => p.patientId === keycloakId) || null;
      
      // Get stats
      const stats = this.patientStats.get(keycloakId);
      
      return {
        id: patient.id,
        userId: keycloakId,
        fullName: patient.fullName ||
          (patient.firstName && patient.lastName ? `${patient.firstName} ${patient.lastName}` : patient.username),
        email: patient.email,
        username: patient.username,
        status: patient.status,
        autonomyLevel: plan?.autonomyLevel || null,
        riskLevel: plan?.lastRiskLevel || null,
        medicationPlan: plan,
        adherenceRate: stats?.adherenceRate || 0,
        pendingIntakes: stats?.pendingIntakesToday || stats?.pendingIntakes || 0
      };
    });

    this.applyFilters();
  }

  /**
   * Handle search input
   */
  onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
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
    
    this.filteredPatients = filtered;
  }

  /**
   * Navigate to medications page for a patient
   */
  viewMedications(patient: PatientListItem): void {
    this.router.navigate(['/caregiver/medications'], { 
      queryParams: { patientId: patient.userId }
    });
  }

  /**
   * View patient details in modal
   */
  viewPatientDetails(patient: PatientListItem): void {
    this.selectedPatient = patient;
  }

  /**
   * Close patient details modal
   */
  closePatientDetails(): void {
    this.selectedPatient = null;
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
   * Get initials from full name
   */
  getInitials(fullName: string): string {
    if (!fullName) return '?';
    const parts = fullName.split(' ');
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }
}
