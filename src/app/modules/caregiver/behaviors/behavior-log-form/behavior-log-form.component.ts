import { Component, Output, EventEmitter, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { SafetyAlertService } from '../../../../core/services/safety-alert.service';
import { PatientProfileResponse } from '../../../../core/services/patient.service';
import { CaregiverPatientContextService } from '../../../../core/services/caregiver-patient-context.service';
import { ToastService } from '../../../../shared/components/toast/toast.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ImageUploadComponent } from '../../../../shared/components/image-upload/image-upload.component';
import { BehaviorLogResponse, UpdateBehaviorLogRequest } from '../../../../core/models/safety-alert.model';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';

@Component({
  selector: 'app-behavior-log-form',
  templateUrl: './behavior-log-form.component.html',
  styleUrls: ['./behavior-log-form.component.scss'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ImageUploadComponent]
})
export class BehaviorLogFormComponent implements OnInit {
  @Input() patientId = '';
  @Input() editMode = false;
  @Input() logToEdit: BehaviorLogResponse | null = null;
  @Output() formSubmit = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();
  @Output() editComplete = new EventEmitter<void>();
  
  behaviorForm: FormGroup;
  isSubmitting = false;
  uploadedImageUrls: string[] = [];
  
  // Patient data
  patients: PatientProfileResponse[] = [];
  isLoadingPatients = false;
  patientLoadError: string | null = null;
  
  behaviorTypes = [
    { value: 'FALL', label: 'Fall', icon: '💥' },
    { value: 'WANDERING', label: 'Wandering', icon: '🚶' },
    { value: 'AGITATION', label: 'Agitation', icon: '😤' },
    { value: 'SLEEP_DISORDER', label: 'Sleep Disorder', icon: '😴' },
    { value: 'HALLUCINATION', label: 'Hallucination', icon: '👁️' },
    { value: 'CONFUSION', label: 'Confusion', icon: '😵' },
    { value: 'AGGRESSION', label: 'Aggression', icon: '😠' },
    { value: 'MEDICATION_REFUSAL', label: 'Medication Refusal', icon: '💊' },
    { value: 'OTHER', label: 'Other', icon: '📝' }
  ];
  
  severityLabels: { [key: number]: string } = {
    1: 'Mild - Minimal impact',
    2: 'Low - Minor concern',
    3: 'Moderate - Requires attention',
    4: 'High - Significant issue',
    5: 'Critical - Immediate action needed'
  };
  
  constructor(
    private fb: FormBuilder, 
    private safetyService: SafetyAlertService,
    private caregiverPatientContext: CaregiverPatientContextService,
    private toastService: ToastService,
    private authService: AuthService
  ) {
    this.behaviorForm = this.fb.group({
      patientId: [this.patientId, Validators.required],
      type: ['', Validators.required],
      severity: [3, [Validators.required, Validators.min(1), Validators.max(5)]],
      location: [''],
      description: ['', Validators.required],
      triggers: [''],
      witnesses: [''],
      imageUrls: [[]] // Array of uploaded image URLs
    });
  }
  
  ngOnInit(): void {
    this.loadPatients();
    
    if (this.editMode && this.logToEdit) {
      // Pre-fill form for editing
      this.populateFormForEdit(this.logToEdit);
    } else if (this.patientId) {
      // Set patientId if provided via input (for new log)
      this.behaviorForm.patchValue({ patientId: this.patientId });
    }
  }
  
  /**
   * Populate form with existing log data for editing
   */
  private populateFormForEdit(log: BehaviorLogResponse): void {
    // Convert severity enum to number (ONE->1, TWO->2, etc.)
    const severityMap: Record<string, number> = {
      'ONE': 1, 'TWO': 2, 'THREE': 3, 'FOUR': 4, 'FIVE': 5
    };
    const severityNumber = severityMap[log.severity] || 3;
    
    this.behaviorForm.patchValue({
      patientId: log.patientId,
      type: log.type,
      severity: severityNumber,
      location: log.location || '',
      description: log.description || '',
      triggers: log.triggers || '',
      witnesses: log.witnesses || '',
      imageUrls: log.imageUrls || []
    });
    
    // Set uploaded images for the image upload component
    this.uploadedImageUrls = log.imageUrls || [];
    
    // Disable patient selection in edit mode (can't change patient)
    this.behaviorForm.get('patientId')?.disable();
  }

  /**
   * Get form title based on mode
   */
  getFormTitle(): string {
    return this.editMode ? 'Edit Behavior Log' : 'Log Behavior Incident';
  }

  /**
   * Get form subtitle based on mode
   */
  getFormSubtitle(): string {
    return this.editMode 
      ? 'Update the behavior log details' 
      : 'Document patient behavior for safety tracking';
  }

  /**
   * Get submit button text based on mode
   */
  getSubmitButtonText(): string {
    if (this.isSubmitting) {
      return this.editMode ? 'Updating...' : 'Submitting...';
    }
    return this.editMode ? 'Update Log' : 'Submit Log';
  }
  
  /**
   * Load assigned patients for the current caregiver
   */
  loadPatients(): void {
    this.isLoadingPatients = true;
    this.patientLoadError = null;
    
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      this.isLoadingPatients = false;
      this.patientLoadError = 'User not authenticated';
      return;
    }
    
    this.caregiverPatientContext.getAssignedPatients()
      .pipe(
        catchError(error => {
          console.error('Failed to load assigned patients:', error);
          this.patientLoadError = 'Failed to load your assigned patients. Please try again.';
          return of([] as PatientProfileResponse[]);
        })
      )
      .subscribe(patients => {
        this.patients = patients;
        this.isLoadingPatients = false;
      });
  }
  
  /**
   * Retry loading patients after an error
   */
  retryLoadPatients(): void {
    this.loadPatients();
  }
  
  /**
   * Get display name for a patient
   */
  getPatientDisplayName(patient: PatientProfileResponse): string {
    return `${patient.firstName} ${patient.lastName}`;
  }
  
  get severityValue(): number {
    return this.behaviorForm.get('severity')?.value || 3;
  }
  
  getSeverityColor(severity: number): string {
    if (severity <= 2) return 'bg-success';
    if (severity === 3) return 'bg-warning';
    return 'bg-danger';
  }

  /**
   * Get severity value as percentage for slider track fill
   * Maps 1-5 to 0-100%
   */
  getSeverityPercentage(): number {
    const severity = this.severityValue;
    return ((severity - 1) / 4) * 100;
  }
  
  /**
   * Handle images uploaded from the image upload component
   */
  onImagesUploaded(urls: string[]): void {
    this.uploadedImageUrls = urls;
    this.behaviorForm.patchValue({ imageUrls: urls });
  }

  /**
   * Handle upload errors
   */
  onUploadError(error: string): void {
    this.toastService.error(error);
  }

  onSubmit(): void {
    if (this.behaviorForm.valid) {
      this.isSubmitting = true;
      
      // Get raw value (includes disabled fields like patientId in edit mode)
      const formValue = this.behaviorForm.getRawValue();
      
      if (this.editMode && this.logToEdit) {
        // Update existing log
        const request: UpdateBehaviorLogRequest = {
          type: formValue.type,
          severity: formValue.severity,
          location: formValue.location,
          description: formValue.description,
          triggers: formValue.triggers,
          witnesses: formValue.witnesses,
          imageUrls: this.uploadedImageUrls
        };
        
        this.safetyService.updateBehaviorLog(this.logToEdit.id, request).subscribe({
          next: () => {
            this.isSubmitting = false;
            this.toastService.success('Behavior log updated successfully!');
            this.editComplete.emit();
          },
          error: (err) => {
            this.isSubmitting = false;
            const errorMessage = err.error?.detail || err.error?.message || 'Failed to update behavior log. Please try again.';
            this.toastService.error(errorMessage);
          }
        });
      } else {
        // Create new log (existing code)
        const currentUser = this.authService.getCurrentUser();
        const reportedBy = currentUser?.id || '';
        
        const request = {
          ...formValue,
          reportedBy,
          imageUrls: this.uploadedImageUrls
        };
        
        this.safetyService.createManualBehaviorLog(request).subscribe({
          next: () => {
            this.isSubmitting = false;
            this.behaviorForm.reset({ severity: 3 });
            this.uploadedImageUrls = [];
            this.toastService.success('Behavior log created successfully!');
            this.formSubmit.emit();
          },
          error: (err) => {
            this.isSubmitting = false;
            const errorMessage = err.error?.detail || err.error?.message || 'Failed to save behavior log. Please try again.';
            this.toastService.error(errorMessage);
          }
        });
      }
    }
  }
  
  onCancel(): void {
    if (this.editMode) {
      // In edit mode, just emit cancel without resetting
      this.cancel.emit();
    } else {
      // In create mode, reset the form
      this.behaviorForm.reset({ severity: 3 });
      this.uploadedImageUrls = [];
      this.cancel.emit();
    }
  }
}
