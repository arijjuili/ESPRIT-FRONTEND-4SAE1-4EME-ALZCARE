import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Subject, takeUntil, interval } from 'rxjs';
import { CameraDeviceService } from '../../../core/services/camera-device.service';
import { PatientService, PatientProfileResponse } from '../../../core/services/patient.service';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { AuthService } from '../../../core/services/auth.service';
import { CameraZone } from '../../../core/models/camera-device.model';
import { PairingToken } from '../../../core/models/pairing-token.model';

type TokenStatus = 'used' | 'expired' | 'active';

@Component({
  selector: 'app-admin-camera-provisioning',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, FormsModule],
  templateUrl: './admin-camera-provisioning.component.html',
  styleUrls: ['./admin-camera-provisioning.component.scss']
})
export class AdminCameraProvisioningComponent implements OnInit, OnDestroy {
  patients: PatientProfileResponse[] = [];
  loadingPatients = false;

  tokenForm: FormGroup;
  generating = false;

  generatedToken: PairingToken | null = null;
  copied = false;

  patientTokens: PairingToken[] = [];
  loadingTokens = false;

  now = new Date();
  private timerSubscription: any;

  zones: CameraZone[] = ['BEDROOM', 'HALLWAY', 'BATHROOM', 'FRONT_DOOR', 'KITCHEN', 'LIVING_ROOM'];

  private destroy$ = new Subject<void>();

  constructor(
    private cameraService: CameraDeviceService,
    private patientService: PatientService,
    private toastService: ToastService,
    private authService: AuthService,
    private fb: FormBuilder
  ) {
    this.tokenForm = this.fb.group({
      patientId: ['', Validators.required],
      zone: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.loadPatients();

    this.timerSubscription = interval(1000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.now = new Date();
      });

    this.tokenForm.get('patientId')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(patientId => {
        this.generatedToken = null;
        if (patientId) {
          this.loadPatientTokens(patientId);
        } else {
          this.patientTokens = [];
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.timerSubscription) {
      this.timerSubscription.unsubscribe();
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
        error: () => {
          this.toastService.error('Failed to load patients');
          this.loadingPatients = false;
        }
      });
  }

  private loadPatientTokens(patientId: string): void {
    this.loadingTokens = true;
    this.cameraService.getPatientTokens(patientId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (tokens) => {
          this.patientTokens = tokens.sort((a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          this.loadingTokens = false;
        },
        error: () => {
          this.toastService.error('Failed to load tokens');
          this.loadingTokens = false;
        }
      });
  }

  onGenerateToken(): void {
    if (this.tokenForm.invalid) return;

    this.generating = true;
    this.generatedToken = null;

    this.cameraService.generatePairingToken(this.tokenForm.value)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (token) => {
          this.generatedToken = token;
          this.toastService.success('Pairing token generated successfully');
          this.generating = false;
          const patientId = this.tokenForm.value.patientId;
          if (patientId) {
            this.loadPatientTokens(patientId);
          }
        },
        error: () => {
          this.toastService.error('Failed to generate pairing token');
          this.generating = false;
        }
      });
  }

  copyToken(): void {
    if (!this.generatedToken) return;
    navigator.clipboard.writeText(this.generatedToken.token).then(() => {
      this.copied = true;
      this.toastService.success('Token copied to clipboard');
      setTimeout(() => this.copied = false, 2000);
    });
  }

  getQrCodeUrl(token: string): string {
    const data = encodeURIComponent(token);
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${data}`;
  }

  onRevokeToken(token: string): void {
    if (!confirm('Are you sure you want to revoke this pairing token?')) return;

    this.cameraService.revokePairingToken(token)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toastService.success('Token revoked successfully');
          const patientId = this.tokenForm.value.patientId;
          if (patientId) {
            this.loadPatientTokens(patientId);
          }
          if (this.generatedToken?.token === token) {
            this.generatedToken = null;
          }
        },
        error: () => {
          this.toastService.error('Failed to revoke token');
        }
      });
  }

  getSelectedPatientName(): string {
    const patientId = this.tokenForm.value.patientId;
    const patient = this.patients.find(p => p.id === patientId);
    return patient ? `${patient.firstName} ${patient.lastName}` : '';
  }

  getTokenStatus(token: PairingToken): TokenStatus {
    if (token.used) return 'used';
    if (new Date(token.expiresAt) < this.now) return 'expired';
    return 'active';
  }

  getStatusLabel(status: TokenStatus): string {
    const labels: Record<TokenStatus, string> = {
      used: 'Used',
      expired: 'Expired',
      active: 'Active'
    };
    return labels[status];
  }

  getStatusClass(status: TokenStatus): string {
    const classes: Record<TokenStatus, string> = {
      used: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      expired: 'bg-gray-100 text-gray-600 border-gray-200',
      active: 'bg-amber-100 text-amber-700 border-amber-200'
    };
    return classes[status];
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

  getRemainingTime(expiresAt: string): string {
    const diff = new Date(expiresAt).getTime() - this.now.getTime();
    if (diff <= 0) return 'Expired';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  }
}
