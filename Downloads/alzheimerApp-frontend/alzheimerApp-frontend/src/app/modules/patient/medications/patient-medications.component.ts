import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MedicalFollowupService } from '../../../core/services/medical-followup.service';
import { AuthService } from '../../../core/services/auth.service';
import {
  MedicationPlan,
  MedicationItem,
  MedicationIntake,
  IntakeStatus,
  PlanStatus
} from '../../../core/models/medical-followup.model';

/**
 * Patient Medications - Connected Use Case
 * 
 * Displays real medication plans from the backend:
 * - List of active medication plans
 * - Medications with dosages
 * - Upcoming and history intakes
 * - Low stock notifications
 */
@Component({
  selector: 'app-patient-medications',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './patient-medications.component.html',
  styleUrls: ['./patient-medications.component.scss']
})
export class PatientMedicationsComponent implements OnInit {
  // Backend data
  medicationPlans: MedicationPlan[] = [];
  loading = false;
  error: string | null = null;

  // Fallback mock data (if backend is not available)
  medications: any[] = [];
  useMockData = false;

  // Patient ID (to be retrieved from auth)
  patientId = 'dfdbff82-1dea-4c1e-bd2d-d3d2bfd0fbc4'; // UUID format

  // Stats
  totalPlans = 0;
  activePlans = 0;
  highRiskItems = 0;
  adherenceRate = 94;

  // Enums for template
  planStatuses = PlanStatus;
  intakeStatuses = IntakeStatus;

  constructor(
    private medicalService: MedicalFollowupService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadMedicationPlans();
  }

  /**
   * Load medication plans from backend
   */
  loadMedicationPlans(): void {
    this.loading = true;
    this.error = null;

    this.medicalService.getPatientMedicationPlans(this.patientId).subscribe({
      next: (plans) => {
        this.medicationPlans = plans;
        this.calculateStats();
        this.loading = false;
        this.useMockData = false;
      },
      error: (err) => {
        console.error('Error loading medication plans:', err);
        this.error = 'Unable to load medications from server';
        this.loading = false;
        // Fallback to mock data
        this.loadMockData();
      }
    });
  }

  /**
   * Fallback: Load mock data (legacy behavior)
   */
  loadMockData(): void {
    this.useMockData = true;
    // Simulate existing mock data
    this.medications = [
      {
        name: 'Donepezil',
        prescribedBy: 'Michael',
        dosage: '10mg',
        frequency: 'Daily',
        stockStatus: 'Refill in 10 days'
      },
      {
        name: 'Memantine',
        prescribedBy: 'Michael',
        dosage: '20mg',
        frequency: 'Daily',
        stockStatus: 'Just Refilled'
      }
    ];
  }

  /**
   * Calculate statistics
   */
  calculateStats(): void {
    this.totalPlans = this.medicationPlans.length;
    this.activePlans = this.medicationPlans.filter(p => p.status === PlanStatus.ACTIVE).length;
    
    // Count high risk medications
    this.highRiskItems = this.medicationPlans.reduce((count, plan) => {
      return count + (plan.items?.filter(item => item.isHighRisk).length || 0);
    }, 0);
  }

  /**
   * Return all medication items (for display)
   */
  get allMedicationItems(): MedicationItem[] {
    const items: MedicationItem[] = [];
    this.medicationPlans.forEach(plan => {
      if (plan.items) {
        items.push(...plan.items);
      }
    });
    return items;
  }

  /**
   * Check if stock is low
   */
  isLowStock(item: MedicationItem): boolean {
    return item.stockQuantity <= item.lowThreshold;
  }

  /**
   * Parse timesOfDay (CSV format)
   */
  parseTimesOfDay(timesOfDay: string): string[] {
    return timesOfDay.split(',').map(t => t.trim());
  }

  /**
   * Mark an intake as taken
   */
  markIntakeAsTaken(itemId: number, intakeId: number): void {
    // This feature would require a backend update
    // to mark a specific intake as TAKEN
    console.log('Marking intake as taken:', itemId, intakeId);
  }

  /**
   * Format date
   */
  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }

  /**
   * CSS class based on plan status
   */
  getPlanStatusClass(status: PlanStatus): string {
    const classes: Record<PlanStatus, string> = {
      [PlanStatus.ACTIVE]: 'bg-green-100 text-green-800',
      [PlanStatus.SUSPENDED]: 'bg-yellow-100 text-yellow-800',
      [PlanStatus.STOPPED]: 'bg-red-100 text-red-800'
    };
    return classes[status];
  }

  /**
   * CSS class based on intake status
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
}
