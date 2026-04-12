import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MedicalFollowupService } from '../../../core/services/medical-followup.service';
import { AuthService } from '../../../core/services/auth.service';
import {
  MedicationPlan,
  MedicationItem,
  MedicationIntake,
  IntakeStatus,
  PlanStatus,
  MedicationAutonomyLevel
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



  // Patient ID (to be retrieved from auth)
patientId!: string;
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
  const user = this.authService.getCurrentUser();

  console.log('[PatientMedications] currentUser:', user);

 if (!user?.id) {
  this.error = 'No authenticated user found';
  this.loading = false;
  return;
}

  this.patientId = user.id; // ✅ ici c'est le sub Keycloak
  this.loadMedicationPlans();
}

  /**
   * Load medication plans from backend
   */
  loadMedicationPlans(): void {
  this.loading = true;
  this.error = null;

  // ✅ LOG POUR DEBUG
  console.log('[PatientMedications] loading plans for patientId:', this.patientId);

  this.medicalService.getPatientMedicationPlans(this.patientId).subscribe({
    next: (plans) => {
      console.log('[PatientMedications] plans received:', plans); // utile aussi
      this.medicationPlans = plans;
      this.calculateStats();
      this.loading = false;
     
    },
    error: (err) => {
  console.error('Error loading medication plans:', err);
  this.error = 'Unable to load medications from server';
  this.loading = false;

}
  });
}

  /**
   * Fallback: Load mock data (legacy behavior)
   */
  

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
   * Check if patient can confirm intake based on autonomy level
   */
  canPatientConfirm(plan: MedicationPlan): boolean {
    return plan.autonomyLevel === MedicationAutonomyLevel.INDEPENDENT;
  }

  /**
   * Confirm an intake (patient marks as taken)
   */
  confirmIntake(plan: MedicationPlan, intake: MedicationIntake): void {
    if (!this.canPatientConfirm(plan)) {
      alert('You cannot confirm this medication. Your autonomy level requires assistance.');
      return;
    }

    if (!intake.id) {
      console.error('Intake ID is missing');
      return;
    }

    this.medicalService.confirmMedicationIntake(intake.id).subscribe({
      next: (updated: MedicationIntake) => {
        intake.status = IntakeStatus.TAKEN;
        console.log('Intake confirmed:', updated);
      },
      error: (err: unknown) => {
        console.error('Error confirming intake:', err);
        alert('Failed to confirm medication intake. Please try again.');
      }
    });
  }

  /**
   * Format date
   */
  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('fr-FR', {
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
      [PlanStatus.STOPPED]: 'bg-red-100 text-red-800',
      [PlanStatus.COMPLETED]: 'bg-emerald-100 text-emerald-800'
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
