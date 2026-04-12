/**
 * Active Plan Modal Component
 * 
 * Professional modal displayed when a doctor attempts to prescribe
 * for a patient who already has an active medication plan.
 * 
 * This modal presents three options:
 * 1. Adjust current plan - Modify the existing plan
 * 2. Add medication to current plan - Add a new medication
 * 3. Replace treatment - Create a new plan (replacement)
 */
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MedicationPlan, MedicationItem } from '../../../core/models/medical-followup.model';
import { PrescriptionAction } from '../../../core/services/prescription-helper.service';
import { MedicalFollowupService } from '../../../core/services/medical-followup.service';

export interface ModalResult {
  action: PrescriptionAction;
  plan?: MedicationPlan;
}

@Component({
  selector: 'app-active-plan-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './active-plan-modal.component.html',
  styleUrls: ['./active-plan-modal.component.scss']
})
export class ActivePlanModalComponent {
  /** Active medication plan */
  @Input() activePlan!: MedicationPlan;
  
  /** Patient ID */
  @Input() patientId!: string;
  
  /** Patient name (optional) */
  @Input() patientName?: string;
  
  /** Event emitted when an action is chosen */
  @Output() actionSelected = new EventEmitter<ModalResult>();
  
  /** Event emitted when the modal is closed without action */
  @Output() closed = new EventEmitter<void>();

  /** Loading state (for future extensions) */
  loading = false;

  /** Show/hide medications list */
  showMedications = false;

  /** Loading state for fetching medications */
  loadingMedications = false;

  /** Error state for fetching medications */
  medicationsError: string | null = null;

  constructor(private medicalFollowupService: MedicalFollowupService) {}

  /**
   * Formats the plan date range
   */
  getPlanDateRange(): string {
    if (!this.activePlan) return '';
    
    const startDate = new Date(this.activePlan.startDate);
    const startFormatted = startDate.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    if (!this.activePlan.endDate) {
      return `Since ${startFormatted} (no end date)`;
    }

    const endDate = new Date(this.activePlan.endDate);
    const endFormatted = endDate.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    return `${startFormatted} – ${endFormatted}`;
  }

  /**
   * Counts the number of medications in the plan
   */
  getMedicationCount(): number {
    return this.activePlan?.items?.length || 0;
  }

  /**
   * Handles click on "Adjust current plan"
   */
  onAdjustPlan(): void {
    this.selectAction('ADJUST_CURRENT');
  }

  /**
   * Handles click on "Add medication"
   */
  onAddMedication(): void {
    this.selectAction('ADD_MEDICATION');
  }

  /**
   * Handles click on "Replace treatment"
   */
  onReplaceTreatment(): void {
    this.selectAction('REPLACE_TREATMENT');
  }

  /**
   * Closes the modal without action
   */
  onCancel(): void {
    this.closed.emit();
  }

  /**
   * Closes the modal via the X button
   */
  onClose(): void {
    this.closed.emit();
  }

  /**
   * Emits the selected action
   */
  private selectAction(action: PrescriptionAction): void {
    this.actionSelected.emit({
      action,
      plan: this.activePlan
    });
  }

  /**
   * Prevents click propagation in the modal
   */
  onModalClick(event: Event): void {
    event.stopPropagation();
  }

  /**
   * Toggles the medications list visibility
   * Fetches medications on first expand if not already loaded
   */
  toggleMedications(): void {
    this.showMedications = !this.showMedications;
    
    // Fetch medications if expanding and items are not loaded
    if (this.showMedications && !this.activePlan.items && !this.loadingMedications) {
      this.fetchMedications();
    }
  }

  /**
   * Fetches medication items for the active plan
   */
  private fetchMedications(): void {
    if (!this.activePlan?.id) return;

    this.loadingMedications = true;
    this.medicationsError = null;

    this.medicalFollowupService.getMedicationItems(this.activePlan.id).subscribe({
      next: (items) => {
        this.activePlan.items = items;
        this.loadingMedications = false;
      },
      error: (err) => {
        console.error('Error fetching medications:', err);
        this.medicationsError = 'Failed to load medications. Please try again.';
        this.loadingMedications = false;
      }
    });
  }

  /**
   * Parses timesOfDay CSV string into an array
   */
  parseTimesOfDay(timesOfDay: string): string[] {
    if (!timesOfDay) return [];
    return timesOfDay.split(',').map(t => t.trim()).filter(t => t);
  }

  /**
   * Formats frequency for display
   */
  formatFrequency(frequency: string): string {
    if (!frequency) return '';
    return frequency.replace(/_/g, ' ').toLowerCase();
  }
}
