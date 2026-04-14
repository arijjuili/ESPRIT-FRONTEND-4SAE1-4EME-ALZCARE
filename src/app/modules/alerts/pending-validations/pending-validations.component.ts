import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil, catchError, of } from 'rxjs';
import { SafetyAlertService } from '../../../core/services/safety-alert.service';
import { AlertPollingService } from '../../../core/services/alert-polling.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { BehaviorLogResponse, BehaviorValidationStatus } from '../../../core/models/safety-alert.model';

@Component({
  selector: 'app-pending-validations',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pending-validations.component.html'
})
export class PendingValidationsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  pendingLogs: BehaviorLogResponse[] = [];
  loading = true;
  processingId: string | null = null;

  // Notes modal
  validatingId: string | null = null;
  pendingStatus: BehaviorValidationStatus | null = null;
  validationNotes = '';
  submitting = false;

  constructor(
    private safetyService: SafetyAlertService,
    private polling: AlertPollingService,
    private authService: AuthService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.load();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  load(): void {
    this.loading = true;
    this.safetyService.getPendingValidations().pipe(
      catchError(() => of([] as BehaviorLogResponse[])),
      takeUntil(this.destroy$)
    ).subscribe(logs => {
      this.pendingLogs = logs;
      this.loading = false;
    });
  }

  openValidate(logId: string, status: BehaviorValidationStatus): void {
    this.validatingId = logId;
    this.pendingStatus = status;
    this.validationNotes = '';
  }

  cancelValidate(): void {
    this.validatingId = null;
    this.pendingStatus = null;
  }

  submitValidation(): void {
    if (!this.validatingId || !this.pendingStatus) return;
    const userId = this.authService.getCurrentUser()?.id ?? '';
    this.submitting = true;
    this.safetyService.validateBehavior(this.validatingId, {
      validationStatus: this.pendingStatus,
      validatedBy: userId,
      validationNotes: this.validationNotes
    }).pipe(
      catchError(() => {
        this.toastService.error('Failed to validate behavior');
        return of(null);
      }),
      takeUntil(this.destroy$)
    ).subscribe(result => {
      this.submitting = false;
      if (result) {
        const action = this.pendingStatus === 'CONFIRMED' ? 'confirmed' : 'marked as false alarm';
        this.toastService.success(`Behavior log ${action}`);
        // Remove from list
        this.pendingLogs = this.pendingLogs.filter(l => l.id !== this.validatingId);
        // Trigger alert polling refresh so new alert shows if CONFIRMED
        if (this.pendingStatus === 'CONFIRMED') {
          setTimeout(() => this.polling.refresh(), 2000);
        }
      }
      this.validatingId = null;
      this.pendingStatus = null;
    });
  }

  behaviorTypeLabel(type: string): string {
    return type.replace(/_/g, ' ');
  }

  severityLabel(sev: string): string {
    const map: Record<string, string> = {
      ONE: '1 — Minimal', TWO: '2 — Mild', THREE: '3 — Moderate',
      FOUR: '4 — Severe', FIVE: '5 — Critical'
    };
    return map[sev] ?? sev;
  }

  severityBadgeClass(sev: string): string {
    const map: Record<string, string> = {
      ONE: 'bg-green-50 text-green-700 border-green-200',
      TWO: 'bg-teal-50 text-teal-700 border-teal-200',
      THREE: 'bg-yellow-50 text-yellow-700 border-yellow-200',
      FOUR: 'bg-orange-50 text-orange-700 border-orange-200',
      FIVE: 'bg-red-50 text-red-700 border-red-200'
    };
    return map[sev] ?? 'bg-gray-50 text-gray-700 border-gray-200';
  }

  formatTime(iso: string): string {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
}
