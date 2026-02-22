import { Component, Output, EventEmitter, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { SafetyAlertService } from '../../../../core/services/safety-alert.service';
import { PatientService, PatientProfileResponse } from '../../../../core/services/patient.service';
import { ToastService } from '../../../../shared/components/toast/toast.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ImageUploadComponent } from '../../../../shared/components/image-upload/image-upload.component';

@Component({
  selector: 'app-behavior-log-form',
  templateUrl: './behavior-log-form.component.html',
  styleUrls: ['./behavior-log-form.component.scss'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ImageUploadComponent]
})
export class BehaviorLogFormComponent implements OnInit {
  @Input() patientId = '';
  @Output() formSubmit = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();
  
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
    private patientService: PatientService,
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
    // Set patientId if provided via input
    if (this.patientId) {
      this.behaviorForm.patchValue({ patientId: this.patientId });
    }
  }
  
  /**
   * Load patients from the identity-service
   */
  loadPatients(): void {
    this.isLoadingPatients = true;
    this.patientLoadError = null;
    
    this.patientService.getPatients().subscribe({
      next: (patients) => {
        this.patients = patients;
        this.isLoadingPatients = false;
      },
      error: (err) => {
        this.isLoadingPatients = false;
        this.patientLoadError = 'Failed to load patients. Please try again.';
        console.error('Error loading patients:', err);
      }
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
      const formValue = this.behaviorForm.value;
      
      // Get current user ID for reportedBy
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
  
  onCancel(): void {
    this.behaviorForm.reset({ severity: 3 });
    this.uploadedImageUrls = [];
    this.cancel.emit();
  }
}
