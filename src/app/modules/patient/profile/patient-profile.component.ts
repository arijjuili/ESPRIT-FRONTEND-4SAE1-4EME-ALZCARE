import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import {
  ChangePasswordRequest,
  PatientProfileResponse,
  PatientProfileUpdateRequest,
  PatientService
} from '../../../core/services/patient.service';
import { ImageUploadService, UploadProgress } from '../../../core/services/image-upload.service';
import { ToastService } from '../../../shared/components/toast/toast.service';

@Component({
  selector: 'app-patient-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './patient-profile.component.html',
  styleUrls: ['./patient-profile.component.scss']
})
export class PatientProfileComponent implements OnInit {
  loading = false;
  saving = false;
  changingPassword = false;
  photoUploading = false;
  photoUploadProgress = 0;
  isEditMode = false;
  error = '';
  userId = '';
  profile: PatientProfileResponse | null = null;
  form: FormGroup;
  passwordForm: FormGroup;

  constructor(
    private authService: AuthService,
    private patientService: PatientService,
    private imageUploadService: ImageUploadService,
    private toastService: ToastService,
    private fb: FormBuilder
  ) {
    this.form = this.fb.group({
      firstName: ['', [Validators.required, Validators.maxLength(100)]],
      lastName: ['', [Validators.required, Validators.maxLength(100)]],
      dateOfBirth: ['', Validators.required],
      gender: ['MALE', Validators.required],
      phone: [''],
      emergencyContact: [''],
      address: [''],
      preferredLanguage: ['ENGLISH']
    });

    this.passwordForm = this.fb.group({
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required, Validators.minLength(8)]]
    });
  }

  ngOnInit(): void {
    const authUser = this.authService.getCurrentUser();
    const tokenUserId = this.authService.getCurrentUserId();
    this.userId = tokenUserId || authUser?.id || '';

    if (!this.userId) {
      this.error = 'Missing patient identity. Please log in again.';
      return;
    }

    this.loadProfile();
  }

  get fullName(): string {
    if (!this.profile) return '';
    return `${this.profile.firstName || ''} ${this.profile.lastName || ''}`.trim();
  }

  get profilePhotoUrl(): string | null {
    return this.profile?.photoUrl || null;
  }

  loadProfile(): void {
    this.loading = true;
    this.error = '';

    this.patientService.getPatientById(this.userId).subscribe({
      next: (profile) => {
        this.profile = profile;
        this.form.patchValue({
          firstName: profile.firstName || '',
          lastName: profile.lastName || '',
          dateOfBirth: profile.dateOfBirth || '',
          gender: profile.gender || 'MALE',
          phone: profile.phone || profile.phoneNumber || '',
          emergencyContact: profile.emergencyContact || profile.emergencyContactName || '',
          address: profile.address || '',
          preferredLanguage: profile.preferredLanguage || 'ENGLISH'
        });
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load patient profile:', err);
        this.error = 'Unable to load profile. Please try again.';
        this.loading = false;
      }
    });
  }

  startEdit(): void {
    this.isEditMode = true;
  }

  cancelEdit(): void {
    this.isEditMode = false;
    if (this.profile) {
      this.form.patchValue({
        firstName: this.profile.firstName || '',
        lastName: this.profile.lastName || '',
        dateOfBirth: this.profile.dateOfBirth || '',
        gender: this.profile.gender || 'MALE',
        phone: this.profile.phone || this.profile.phoneNumber || '',
        emergencyContact: this.profile.emergencyContact || this.profile.emergencyContactName || '',
        address: this.profile.address || '',
        preferredLanguage: this.profile.preferredLanguage || 'ENGLISH'
      });
    }
  }

  saveProfile(): void {
    if (!this.profile || this.form.invalid || this.saving) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving = true;
    const value = this.form.value;

    const payload: PatientProfileUpdateRequest = this.buildUpdatePayload({
      firstName: value.firstName,
      lastName: value.lastName,
      dateOfBirth: value.dateOfBirth,
      gender: value.gender,
      preferredLanguage: value.preferredLanguage || undefined,
      phone: value.phone || undefined,
      emergencyContact: value.emergencyContact || undefined,
      address: value.address || undefined
    });

    this.patientService.updatePatientByUserId(this.userId, payload).subscribe({
      next: (updated) => {
        this.profile = updated;
        this.isEditMode = false;
        this.saving = false;
        this.toastService.success('Profile updated successfully');
      },
      error: (err) => {
        console.error('Failed to update profile:', err);
        this.saving = false;
        this.toastService.error('Failed to update profile');
      }
    });
  }

  async onPhotoSelected(event: Event): Promise<void> {
    if (!this.profile || !this.isEditMode) {
      return;
    }
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    this.photoUploading = true;
    this.photoUploadProgress = 0;

    try {
      const uploadResult = await this.imageUploadService.uploadWithProgress(
        file,
        (progress: UploadProgress) => {
          this.photoUploadProgress = progress.percentage;
        }
      );

      const payload = this.buildUpdatePayload({ photoUrl: uploadResult.url });
      this.patientService.updatePatientByUserId(this.userId, payload).subscribe({
        next: (updated) => {
          this.profile = updated;
          this.photoUploading = false;
          this.toastService.success('Profile photo updated');
        },
        error: (err) => {
          console.error('Failed to save uploaded profile image:', err);
          this.photoUploading = false;
          this.toastService.error('Image uploaded but profile update failed');
        }
      });
    } catch (error) {
      this.photoUploading = false;
      const message = error instanceof Error ? error.message : 'Image upload failed';
      this.toastService.error(message);
    } finally {
      input.value = '';
    }
  }

  changePassword(): void {
    if (this.passwordForm.invalid || this.changingPassword) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    const newPassword = this.passwordForm.value.newPassword as string;
    const confirmPassword = this.passwordForm.value.confirmPassword as string;
    if (newPassword !== confirmPassword) {
      this.toastService.error('Password confirmation does not match');
      return;
    }

    this.changingPassword = true;
    const payload: ChangePasswordRequest = { newPassword };
    this.patientService.changePasswordByUserId(this.userId, payload).subscribe({
      next: () => {
        this.changingPassword = false;
        this.passwordForm.reset();
        this.toastService.success('Password changed successfully');
      },
      error: (err) => {
        console.error('Failed to change password:', err);
        this.changingPassword = false;
        const message = err?.error?.detail || err?.error?.message || 'Failed to change password';
        this.toastService.error(message);
      }
    });
  }

  private buildUpdatePayload(patch: Partial<PatientProfileUpdateRequest>): PatientProfileUpdateRequest {
    const value = this.form.value;
    return {
      firstName: patch.firstName ?? value.firstName,
      lastName: patch.lastName ?? value.lastName,
      dateOfBirth: patch.dateOfBirth ?? value.dateOfBirth,
      gender: patch.gender ?? value.gender,
      preferredLanguage: patch.preferredLanguage ?? (value.preferredLanguage || undefined),
      photoUrl: patch.photoUrl ?? this.profile?.photoUrl,
      phone: patch.phone ?? (value.phone || undefined),
      emergencyContact: patch.emergencyContact ?? (value.emergencyContact || undefined),
      address: patch.address ?? (value.address || undefined),
      isActive: this.profile?.isActive ?? true,
      totalPoints: this.profile?.totalPoints,
      currentStreak: this.profile?.currentStreak,
      lastPlayedDate: this.profile?.lastPlayedDate,
      assistedModeActive: this.profile?.assistedModeActive
    };
  }
}
