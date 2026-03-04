import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { CameraDeviceService } from '../../../core/services/camera-device.service';
import { PatientService, PatientProfileResponse } from '../../../core/services/patient.service';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { AuthService } from '../../../core/services/auth.service';
import { CameraDevice, CameraStatus, CameraZone } from '../../../core/models/camera-device.model';

@Component({
  selector: 'app-admin-camera-devices',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, FormsModule],
  templateUrl: './admin-camera-devices.component.html',
  styleUrls: ['./admin-camera-devices.component.scss']
})
export class AdminCameraDevicesComponent implements OnInit, OnDestroy {
  // Patient selection
  patients: PatientProfileResponse[] = [];
  selectedPatientId: string = '';
  selectedPatientName: string = '';
  
  // Cameras list
  cameras: CameraDevice[] = [];
  loading = false;
  loadingPatients = false;
  
  // Modal state
  showPairModal = false;
  pairForm: FormGroup;
  pairing = false;
  
  // Zones for dropdown
  zones: CameraZone[] = ['BEDROOM', 'HALLWAY', 'BATHROOM', 'FRONT_DOOR', 'KITCHEN', 'LIVING_ROOM'];
  
  // Current user ID for pairedBy
  currentUserId: string = '';
  
  private destroy$ = new Subject<void>();

  constructor(
    private cameraService: CameraDeviceService,
    private patientService: PatientService,
    private toastService: ToastService,
    private authService: AuthService,
    private fb: FormBuilder
  ) {
    this.pairForm = this.fb.group({
      zone: ['', Validators.required],
      macAddress: ['', [Validators.required, Validators.pattern(/^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/)]],
      patientId: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.loadCurrentUser();
    this.loadPatients();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadCurrentUser(): void {
    // Try to get UUID from token's 'sub' claim (Keycloak ID)
    let userId = this.authService.getCurrentUserId();
    
    // Fallback: try to get from currentUser object
    if (!userId) {
      const user = this.authService.getCurrentUser();
      if (user) {
        userId = user.id;
        console.log('Using user.id from currentUser:', userId);
      }
    } else {
      console.log('Using UUID from token sub:', userId);
    }
    
    if (userId) {
      this.currentUserId = userId;
    } else {
      console.error('Could not get user ID');
    }
  }

  private loadPatients(): void {
    this.loadingPatients = true;
    this.patientService.getPatients()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (patients) => {
          this.patients = patients;
          this.loadingPatients = false;
        },
        error: (error) => {
          console.error('Error loading patients:', error);
          this.toastService.error('Failed to load patients');
          this.loadingPatients = false;
        }
      });
  }

  onPatientSelect(patientId: string): void {
    this.selectedPatientId = patientId;
    const patient = this.patients.find(p => p.id === patientId);
    this.selectedPatientName = patient ? `${patient.firstName} ${patient.lastName}` : '';
    
    // Update form patientId
    this.pairForm.patchValue({ patientId });
    
    if (patientId) {
      this.loadCameras();
    } else {
      this.cameras = [];
    }
  }

  private loadCameras(): void {
    if (!this.selectedPatientId) return;
    
    this.loading = true;
    this.cameraService.getCamerasByPatient(this.selectedPatientId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (cameras) => {
          this.cameras = cameras;
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading cameras:', error);
          this.toastService.error('Failed to load cameras');
          this.loading = false;
        }
      });
  }

  openPairModal(): void {
    if (!this.selectedPatientId) {
      this.toastService.warning('Please select a patient first');
      return;
    }
    
    this.pairForm.reset({
      patientId: this.selectedPatientId,
      zone: '',
      macAddress: ''
    });
    this.showPairModal = true;
  }

  closePairModal(): void {
    this.showPairModal = false;
    this.pairForm.reset();
  }

  onPairSubmit(): void {
    if (this.pairForm.invalid || !this.currentUserId) return;
    
    this.pairing = true;
    const request = {
      ...this.pairForm.value,
      pairedBy: this.currentUserId
    };
    
    this.cameraService.pairCamera(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (camera) => {
          this.toastService.success(`Camera paired successfully for ${camera.zone}`);
          this.cameras.push(camera);
          this.closePairModal();
          this.pairing = false;
        },
        error: (error) => {
          console.error('Error pairing camera:', error);
          this.toastService.error('Failed to pair camera');
          this.pairing = false;
        }
      });
  }

  onUnpairCamera(cameraId: string): void {
    if (!confirm('Are you sure you want to unpair this camera?')) return;
    
    this.cameraService.unpairCamera(cameraId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toastService.success('Camera unpaired successfully');
          this.cameras = this.cameras.filter(c => c.id !== cameraId);
        },
        error: (error) => {
          console.error('Error unpairing camera:', error);
          this.toastService.error('Failed to unpair camera');
        }
      });
  }

  onUpdateStatus(cameraId: string, status: CameraStatus): void {
    this.cameraService.updateStatus(cameraId, status)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedCamera) => {
          const index = this.cameras.findIndex(c => c.id === cameraId);
          if (index !== -1) {
            this.cameras[index] = updatedCamera;
          }
          this.toastService.success(`Camera status updated to ${status}`);
        },
        error: (error) => {
          console.error('Error updating status:', error);
          this.toastService.error('Failed to update status');
        }
      });
  }

  getStatusClass(status: CameraStatus): string {
    const classes: Record<CameraStatus, string> = {
      ACTIVE: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      OFFLINE: 'bg-gray-100 text-gray-600 border-gray-200',
      PAUSED: 'bg-amber-100 text-amber-700 border-amber-200'
    };
    return classes[status] || 'bg-gray-100 text-gray-700';
  }

  getStatusDot(status: CameraStatus): string {
    const classes: Record<CameraStatus, string> = {
      ACTIVE: 'bg-emerald-500',
      OFFLINE: 'bg-gray-400',
      PAUSED: 'bg-amber-500'
    };
    return classes[status] || 'bg-gray-400';
  }

  getZoneLabel(zone: CameraZone): string {
    const labels: Record<CameraZone, string> = {
      BEDROOM: 'Bedroom',
      HALLWAY: 'Hallway',
      BATHROOM: 'Bathroom',
      FRONT_DOOR: 'Front Door',
      KITCHEN: 'Kitchen',
      LIVING_ROOM: 'Living Room'
    };
    return labels[zone] || zone;
  }

  getZoneIcon(zone: CameraZone): string {
    const icons: Record<CameraZone, string> = {
      BEDROOM: '🛏️',
      HALLWAY: '🚶',
      BATHROOM: '🚿',
      FRONT_DOOR: '🚪',
      KITCHEN: '🍳',
      LIVING_ROOM: '🛋️'
    };
    return icons[zone] || '📹';
  }

  formatMacAddress(mac: string): string {
    return mac?.toUpperCase() || '';
  }
}
