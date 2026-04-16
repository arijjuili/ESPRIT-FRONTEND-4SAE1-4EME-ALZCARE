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
import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MedicationPlan } from '../../../core/models/medical-followup.model';
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
export class ActivePlanModalComponent implements OnChanges {
  /** Active medication plan */
  @Input() activePlan: MedicationPlan | null = null;
  
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

  /** Patient's medication plans (all prescriptions) */
  plans: MedicationPlan[] = [];
  selectedPlan: MedicationPlan | null = null;
  loadingPlans = false;
  plansError: string | null = null;

  /** Show/hide medications list */
  showMedications = false;

  /** Loading state for fetching medications */
  loadingMedications = false;

  /** Error state for fetching medications */
  medicationsError: string | null = null;

  /** Tracks whether we have fetched full medications for the current plan */
  private medicationsLoadedForPlanId: number | null = null;

  constructor(private medicalFollowupService: MedicalFollowupService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['patientId'] || changes['activePlan']) {
      this.fetchPatientPlans();
    }
  }

  /**
   * Formats the plan date range
   */
  getPlanDateRange(): string {
    if (!this.selectedPlan) return '';
    
    const startDate = new Date(this.selectedPlan.startDate);
    const startFormatted = startDate.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    if (!this.selectedPlan.endDate) {
      return `Since ${startFormatted} (no end date)`;
    }

    const endDate = new Date(this.selectedPlan.endDate);
    const endFormatted = endDate.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    return `${startFormatted} – ${endFormatted}`;
  }

  getPlanSelectLabel(plan: MedicationPlan): string {
    const start = this.formatPlanDate(plan.startDate);
    const end = plan.endDate ? this.formatPlanDate(plan.endDate) : '...';
    return `${plan.title} · ${start} – ${end} · ${plan.status}`;
  }

  private formatPlanDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  /**
   * Counts the number of medications in the plan
   */
  getMedicationCount(): number {
    return this.selectedPlan?.items?.length || 0;
  }

  onPlanSelected(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const planId = Number(select.value);
    if (!Number.isFinite(planId)) {
      return;
    }
    const plan = this.plans.find(p => p.id === planId) || null;
    this.setSelectedPlan(plan);
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
      plan: this.selectedPlan || undefined
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
    
    // Fetch medications if expanding and not yet loaded (or previous load failed)
    if (this.showMedications) {
      this.ensureMedicationsLoaded();
    }
  }

  /**
   * Fetches medication items for the selected plan
   */
  private ensureMedicationsLoaded(): void {
    if (!this.selectedPlan?.id) return;
    if (this.loadingMedications) return;

    // If we already fetched full medications for this plan in this modal session, skip.
    if (this.medicationsLoadedForPlanId === this.selectedPlan.id) {
      return;
    }

    const planId = this.selectedPlan.id;
    this.loadingMedications = true;
    this.medicationsError = null;

    this.medicalFollowupService.getMedicationItems(planId).subscribe({
      next: (items) => {
        // Ignore if input changed while request was in-flight
        if (this.selectedPlan?.id !== planId) {
          return;
        }
        this.selectedPlan.items = items;
        this.loadingMedications = false;
        this.medicationsLoadedForPlanId = planId;
      },
      error: (err) => {
        console.error('Error fetching medications:', err);
        this.medicationsError = 'Failed to load medications. Please try again.';
        this.loadingMedications = false;
      }
    });
  }

  private fetchPatientPlans(): void {
    const patientId = (this.patientId || '').trim();
    if (!patientId) {
      this.loadingPlans = false;
      this.plansError = null;
      this.plans = [];
      this.setSelectedPlan(this.activePlan);
      return;
    }

    this.loadingPlans = true;
    this.plansError = null;

    // Reset state when (re)loading plans
    this.showMedications = false;
    this.medicationsError = null;
    this.loadingMedications = false;
    this.medicationsLoadedForPlanId = null;

    // Show the detected active plan immediately while loading the full list
    this.plans = this.activePlan ? [this.activePlan] : [];
    this.selectedPlan = this.activePlan;

    this.medicalFollowupService.getPatientMedicationPlans(patientId).subscribe({
      next: (plans) => {
        const sorted = this.sortByLastUpdated(plans || []);
        this.plans = sorted;

        const preferredId = this.activePlan?.id;
        const initial =
          (preferredId ? sorted.find(p => p.id === preferredId) : null) ||
          sorted[0] ||
          this.activePlan ||
          null;

        this.setSelectedPlan(initial);
        this.loadingPlans = false;
      },
      error: (err) => {
        console.error('Error fetching patient medication plans:', err);
        this.plansError = 'Failed to load prescriptions for this patient.';
        this.plans = this.activePlan ? [this.activePlan] : [];
        this.setSelectedPlan(this.activePlan);
        this.loadingPlans = false;
      }
    });
  }

  private setSelectedPlan(plan: MedicationPlan | null): void {
    this.selectedPlan = plan;

    // Reset medication load state when selecting a different plan
    this.medicationsError = null;
    this.loadingMedications = false;
    this.medicationsLoadedForPlanId = null;
    this.showMedications = false;

    // Prefetch medications so counts/list are accurate
    this.ensureMedicationsLoaded();
  }

  private sortByLastUpdated(plans: MedicationPlan[]): MedicationPlan[] {
    return [...plans].sort((a, b) => {
      const dateA = new Date(a.updatedAt || a.createdAt).getTime();
      const dateB = new Date(b.updatedAt || b.createdAt).getTime();
      return dateB - dateA;
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
