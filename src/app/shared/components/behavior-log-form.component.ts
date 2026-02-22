import { Component, EventEmitter, Output, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SafetyAlertService } from '../../core/services/safety-alert.service';
import { AuthService } from '../../core/services/auth.service';
import { PatientProfileResponse } from '../../core/services/patient.service';
import { BehaviorType, CreateManualBehaviorLogRequest } from '../../core/models/safety-alert.model';
import { ImageUploadComponent } from './image-upload/image-upload.component';

@Component({
  selector: 'app-behavior-log-form',
  standalone: true,
  imports: [CommonModule, FormsModule, ImageUploadComponent],
  template: `
    <div class="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto" (click)="onBackdropClick($event)">
      <div class="bg-white rounded-xl shadow-2xl w-full max-w-lg my-8 relative" (click)="$event.stopPropagation()" style="max-height: calc(100vh - 4rem); overflow-y: auto;">
        <!-- Header -->
        <div class="bg-emerald-600 px-6 py-4 rounded-t-xl flex justify-between items-center">
          <h2 class="text-xl font-bold text-white">📝 Log Patient Behavior</h2>
          <button (click)="onClose()" class="text-white hover:text-emerald-100 text-2xl leading-none">&times;</button>
        </div>

        <!-- Form -->
        <form (ngSubmit)="onSubmit()" class="p-6 space-y-4">
          <!-- Patient Selection -->
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-1">Patient *</label>
            <select 
              [(ngModel)]="formData.patientId" 
              name="patientId" 
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition">
              <option value="" disabled>Select a patient</option>
              <option *ngFor="let patient of patients" [value]="patient.id">{{ patient.firstName }} {{ patient.lastName }}</option>
            </select>
          </div>

          <!-- Behavior Type -->
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-1">Behavior Type *</label>
            <select 
              [(ngModel)]="formData.type" 
              name="type" 
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition">
              <option value="" disabled>Select behavior type</option>
              <option *ngFor="let type of behaviorTypes" [value]="type.value">{{ type.label }}</option>
            </select>
          </div>

          <!-- Severity -->
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-1">Severity Level *</label>
            <div class="flex gap-2">
              <button 
                *ngFor="let level of severityLevels" 
                type="button"
                (click)="formData.severity = level.value"
                [class]="formData.severity === level.value ? level.activeClass : level.inactiveClass"
                class="flex-1 py-2 rounded-lg font-semibold text-sm transition">
                {{ level.label }}
              </button>
            </div>
          </div>

          <!-- Location -->
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-1">Location</label>
            <input 
              type="text" 
              [(ngModel)]="formData.location" 
              name="location"
              placeholder="e.g., Living Room, Bedroom, Garden"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition">
          </div>

          <!-- Description -->
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-1">Description *</label>
            <textarea 
              [(ngModel)]="formData.description" 
              name="description" 
              required
              rows="3"
              placeholder="Describe the behavior observed..."
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition resize-none"></textarea>
          </div>

          <!-- Triggers -->
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-1">Potential Triggers</label>
            <input 
              type="text" 
              [(ngModel)]="formData.triggers" 
              name="triggers"
              placeholder="e.g., Loud noise, unfamiliar person, medication change"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition">
          </div>

          <!-- Witnesses -->
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-1">Witnesses</label>
            <input 
              type="text" 
              [(ngModel)]="formData.witnesses" 
              name="witnesses"
              placeholder="Names of people who witnessed the behavior"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition">
          </div>

          <!-- Image Upload -->
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-1">Images</label>
            <app-image-upload
              [maxImages]="5"
              (imagesUploaded)="onImagesUploaded($event)"
              (uploadError)="onUploadError($event)">
            </app-image-upload>
          </div>

          <!-- Error Message -->
          <div *ngIf="errorMessage" class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {{ errorMessage }}
          </div>

          <!-- Success Message -->
          <div *ngIf="successMessage" class="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg text-sm">
            {{ successMessage }}
          </div>

          <!-- Actions -->
          <div class="flex gap-3 pt-2">
            <button 
              type="button"
              (click)="onClose()"
              class="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold transition">
              Cancel
            </button>
            <button 
              type="submit"
              [disabled]="isSubmitting || !isFormValid()"
              class="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:bg-emerald-300 disabled:cursor-not-allowed font-semibold transition flex justify-center items-center gap-2">
              <span *ngIf="isSubmitting" class="animate-spin">⏳</span>
              {{ isSubmitting ? 'Saving...' : 'Log Behavior' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [``]
})
export class BehaviorLogFormComponent implements OnInit {
  @Input() patients: PatientProfileResponse[] = [];
  @Input() preselectedPatientId: string = '';
  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  formData: CreateManualBehaviorLogRequest = {
    patientId: '',
    type: '' as BehaviorType,
    severity: 3,
    description: '',
    reportedBy: '' // Will be set from auth service on submit
  };

  isSubmitting = false;
  errorMessage = '';
  successMessage = '';
  uploadedImageUrls: string[] = [];

  behaviorTypes = [
    { value: 'FALL', label: 'Fall' },
    { value: 'WANDERING', label: 'Wandering' },
    { value: 'AGITATION', label: 'Agitation' },
    { value: 'SLEEP_DISORDER', label: 'Sleep Disorder' },
    { value: 'HALLUCINATION', label: 'Hallucination' },
    { value: 'CONFUSION', label: 'Confusion' },
    { value: 'AGGRESSION', label: 'Aggression' },
    { value: 'MEDICATION_REFUSAL', label: 'Medication Refusal' },
    { value: 'OTHER', label: 'Other' }
  ];

  severityLevels = [
    { value: 1, label: 'Mild', activeClass: 'bg-green-500 text-white', inactiveClass: 'bg-gray-100 text-gray-600 hover:bg-gray-200' },
    { value: 2, label: 'Low', activeClass: 'bg-emerald-500 text-white', inactiveClass: 'bg-gray-100 text-gray-600 hover:bg-gray-200' },
    { value: 3, label: 'Moderate', activeClass: 'bg-yellow-500 text-white', inactiveClass: 'bg-gray-100 text-gray-600 hover:bg-gray-200' },
    { value: 4, label: 'High', activeClass: 'bg-orange-500 text-white', inactiveClass: 'bg-gray-100 text-gray-600 hover:bg-gray-200' },
    { value: 5, label: 'Severe', activeClass: 'bg-red-500 text-white', inactiveClass: 'bg-gray-100 text-gray-600 hover:bg-gray-200' }
  ];

  constructor(
    private safetyAlertService: SafetyAlertService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    if (this.preselectedPatientId) {
      this.formData.patientId = this.preselectedPatientId;
    }
  }

  isFormValid(): boolean {
    return !!(
      this.formData.patientId &&
      this.formData.type &&
      this.formData.severity &&
      this.formData.description?.trim()
    );
  }

  onImagesUploaded(urls: string[]): void {
    this.uploadedImageUrls = urls;
  }

  onUploadError(error: string): void {
    this.errorMessage = error;
  }

  onSubmit(): void {
    if (!this.isFormValid()) {
      this.errorMessage = 'Please fill in all required fields.';
      return;
    }

    // Add the current user's ID as reportedBy
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser?.id) {
      this.errorMessage = 'Unable to identify current user. Please log in again.';
      return;
    }

    const requestData: CreateManualBehaviorLogRequest = {
      ...this.formData,
      reportedBy: currentUser.id,
      imageUrls: this.uploadedImageUrls
    };

    this.isSubmitting = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.safetyAlertService.createManualBehaviorLog(requestData).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.successMessage = 'Behavior logged successfully!';
        this.saved.emit();
        setTimeout(() => this.onClose(), 1000);
      },
      error: (error) => {
        this.isSubmitting = false;
        this.errorMessage = error.error?.message || 'Failed to log behavior. Please try again.';
      }
    });
  }

  onClose(): void {
    this.uploadedImageUrls = [];
    this.close.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    this.onClose();
  }
}
