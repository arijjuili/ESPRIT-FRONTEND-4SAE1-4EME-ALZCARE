/**
 * Adjust Plan Component
 * 
 * Form for adjusting an existing medication plan.
 * Displays:
 * - Effective date (default: tomorrow 00:00)
 * - Editable fields: dosage, frequency, times of day, end date
 * 
 * On confirmation:
 * - Validates inputs
 * - Cancels future intakes (>= effectiveDate)
 * - Generates new future intakes
 */
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  MedicationPlan, 
  MedicationItem,
  FrequencyType 
} from '../../../core/models/medical-followup.model';
import { 
  AdjustPlanService, 
  AdjustPlanFormData, 
  AdjustPlanResult,
  ValidationError 
} from '../../../core/services/adjust-plan.service';

@Component({
  selector: 'app-adjust-plan',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './adjust-plan.component.html',
  styleUrls: ['./adjust-plan.component.scss']
})
export class AdjustPlanComponent implements OnInit {
  /** The medication plan to adjust */
  @Input() plan!: MedicationPlan;
  
  /** The medication item to adjust (if null, adjust all items) */
  @Input() item?: MedicationItem;
  
  /** Patient ID */
  @Input() patientId!: string;
  
  /** Event emitted when adjustment is confirmed */
  @Output() confirmed = new EventEmitter<AdjustPlanResult>();
  
  /** Event emitted when cancelled */
  @Output() cancelled = new EventEmitter<void>();

  // Form data
  formData: AdjustPlanFormData = {
    effectiveDate: new Date(),
    dosage: '',
    frequency: FrequencyType.DAILY,
    timesOfDay: ['08:00'],
    endDate: undefined,
    notes: ''
  };

  // UI state
  loading = false;
  validationErrors: ValidationError[] = [];
  result: AdjustPlanResult | null = null;

  // Available options
  frequencyTypes = Object.values(FrequencyType);
  availableTimes = [
    { value: '08:00', label: 'Morning' },
    { value: '12:00', label: 'Noon' },
    { value: '14:00', label: 'Afternoon' },
    { value: '18:00', label: 'Evening' },
    { value: '22:00', label: 'Night' },
    { value: '23:00', label: 'Bedtime' }
  ];

  /**
   * Gets the display label for a time value
   */
  getTimeLabel(timeValue: string): string {
    const time = this.availableTimes.find(t => t.value === timeValue);
    return time ? time.label : timeValue;
  }

  /**
   * Gets the selected times as display labels
   */
  getSelectedTimesDisplay(): string {
    if (!this.formData.timesOfDay || this.formData.timesOfDay.length === 0) {
      return 'None selected';
    }
    return this.formData.timesOfDay.map(t => this.getTimeLabel(t)).join(', ');
  }

  constructor(private adjustPlanService: AdjustPlanService) {}

  ngOnInit(): void {
    this.initializeForm();
  }

  /**
   * Initializes the form with default values
   */
  private initializeForm(): void {
    // Default effective date: tomorrow at 00:00
    this.formData.effectiveDate = this.adjustPlanService.getDefaultEffectiveDate();
    
    // If an item is specified, pre-fill with its values
    if (this.item) {
      this.formData.dosage = this.item.dosage;
      this.formData.frequency = this.item.frequency;
      this.formData.timesOfDay = this.parseTimesOfDay(this.item.timesOfDay);
    }
    
    // Pre-fill end date from plan if exists
    if (this.plan.endDate) {
      this.formData.endDate = new Date(this.plan.endDate);
    }
  }

  /**
   * Parses times of day string into array
   */
  private parseTimesOfDay(timesOfDay: string): string[] {
    if (!timesOfDay) return ['08:00'];
    
    // If already in HH:mm format
    if (timesOfDay.includes(':')) {
      return timesOfDay.split(',').map(t => t.trim());
    }
    
    // Convert named times
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

  /**
   * Toggles a time selection
   */
  toggleTime(time: string): void {
    const index = this.formData.timesOfDay!.indexOf(time);
    if (index === -1) {
      this.formData.timesOfDay!.push(time);
      this.formData.timesOfDay!.sort();
    } else {
      // Don't allow removing the last time
      if (this.formData.timesOfDay!.length > 1) {
        this.formData.timesOfDay!.splice(index, 1);
      }
    }
  }

  /**
   * Checks if a time is selected
   */
  isTimeSelected(time: string): boolean {
    return this.formData.timesOfDay!.includes(time);
  }

  /**
   * Handles form submission
   */
  onConfirm(): void {
    this.validationErrors = [];
    this.result = null;
    
    // Validate
    const errors = this.adjustPlanService.validateInputs(this.formData);
    if (errors.length > 0) {
      this.validationErrors = errors;
      return;
    }
    
    // Apply adjustments
    this.loading = true;
    
    this.adjustPlanService.applyAdjustments(this.plan, this.formData).subscribe({
      next: (result) => {
        this.result = result;
        this.loading = false;
        
        if (result.success) {
          // Emit success after a short delay to show the result
          setTimeout(() => {
            this.confirmed.emit(result);
          }, 1500);
        }
      },
      error: (err) => {
        this.result = {
          success: false,
          message: `Error: ${err}`,
          cancelledIntakes: 0,
          generatedIntakes: 0
        };
        this.loading = false;
      }
    });
  }

  /**
   * Handles cancellation
   */
  onCancel(): void {
    this.cancelled.emit();
  }

  /**
   * Gets validation error for a field
   */
  getFieldError(field: string): string | null {
    const error = this.validationErrors.find(e => e.field === field);
    return error ? error.message : null;
  }

  /**
   * Formats date for input
   */
  formatDateForInput(date: Date | undefined): string {
    if (!date) return '';
    return date.toISOString().split('T')[0];
  }

  /**
   * Updates effective date from input
   */
  onEffectiveDateChange(value: string): void {
    this.formData.effectiveDate = new Date(value);
  }

  /**
   * Updates end date from input
   */
  onEndDateChange(value: string): void {
    this.formData.endDate = value ? new Date(value) : undefined;
  }

  /**
   * Prevents click propagation
   */
  onModalClick(event: Event): void {
    event.stopPropagation();
  }
}
