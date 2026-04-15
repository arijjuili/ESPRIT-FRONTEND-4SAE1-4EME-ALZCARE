import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil, catchError, of } from 'rxjs';
import { AlertPollingService } from '../../../core/services/alert-polling.service';
import { SafetyAlertService } from '../../../core/services/safety-alert.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../shared/components/toast/toast.service';
import {
  AlertResponse, AlertHistoryResponse,
  AcknowledgeAlertRequest, ResolveAlertRequest, ResolutionActionType
} from '../../../core/models/safety-alert.model';

type SeverityFilter = 'ALL' | 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
type StatusFilter = 'ACTIVE' | 'RESOLVED';

@Component({
  selector: 'app-alert-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './alert-list.component.html'
})
export class AlertListComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  alerts: AlertResponse[] = [];
  loading = true;

  // Filters
  severityFilter: SeverityFilter = 'ALL';
  statusFilter: StatusFilter = 'ACTIVE';

  // Resolve dialog state
  resolvingAlertId: string | null = null;
  resolveForm = {
    resolutionType: 'CHECKED_OK' as ResolutionActionType,
    resolutionNotes: '',
    isFalsePositive: false
  };
  resolveSubmitting = false;

  // Acknowledge state
  acknowledgingId: string | null = null;
  acknowledgeNotes = '';
  acknowledgeSubmitting = false;

  // History panel
  historyAlertId: string | null = null;
  historyItems: AlertHistoryResponse[] = [];
  historyLoading = false;

  readonly resolutionTypes: { value: ResolutionActionType; label: string }[] = [
    { value: 'CHECKED_OK', label: 'Checked — OK' },
    { value: 'APPOINTMENT_SCHEDULED', label: 'Appointment Scheduled' },
    { value: 'EMERGENCY_CONTACTED', label: 'Emergency Contacted' },
    { value: 'MEDICATION_ADJUSTED', label: 'Medication Adjusted' },
    { value: 'ENVIRONMENT_MODIFIED', label: 'Environment Modified' },
    { value: 'INCIDENT_REPORT_CREATED', label: 'Incident Report Created' }
  ];

  constructor(
    private polling: AlertPollingService,
    private safetyService: SafetyAlertService,
    private authService: AuthService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.polling.alerts$.pipe(takeUntil(this.destroy$)).subscribe(alerts => {
      this.loading = false;
      // Merge: keep any locally-resolved ones until next poll clears them
      if (this.statusFilter === 'ACTIVE') {
        this.alerts = alerts;
      }
    });
    // If we want resolved, fetch all and client-filter (backend filter is buggy)
    if (this.statusFilter === 'RESOLVED') {
      this.fetchResolved();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get filtered(): AlertResponse[] {
    return this.alerts.filter(a => {
      if (this.severityFilter !== 'ALL' && a.severity !== this.severityFilter) return false;
      return true;
    }).sort((a, b) => {
      const order = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
      return (order[a.severity] ?? 4) - (order[b.severity] ?? 4);
    });
  }

  onStatusFilterChange(): void {
    this.loading = true;
    this.historyAlertId = null;
    if (this.statusFilter === 'ACTIVE') {
      this.polling.alerts$.pipe(takeUntil(this.destroy$)).subscribe(alerts => {
        this.alerts = alerts;
        this.loading = false;
      });
    } else {
      this.fetchResolved();
    }
  }

  private fetchResolved(): void {
    this.safetyService.getActiveAlerts().pipe(
      catchError(() => of([] as AlertResponse[]))
    ).subscribe(all => {
      // Backend bug: status filter unreliable, so we fetch active and inverse client-side.
      // For resolved, we'd need another endpoint — show empty for now with note.
      this.alerts = [];
      this.loading = false;
    });
  }

  // ─── Acknowledge ───────────────────────────────────────────────
  openAcknowledge(alertId: string): void {
    this.acknowledgingId = alertId;
    this.acknowledgeNotes = '';
  }

  cancelAcknowledge(): void {
    this.acknowledgingId = null;
  }

  submitAcknowledge(): void {
    if (!this.acknowledgingId) return;
    const userId = this.authService.getCurrentUser()?.id ?? '';
    const req: AcknowledgeAlertRequest = { userId, notes: this.acknowledgeNotes };
    this.acknowledgeSubmitting = true;
    this.safetyService.acknowledgeAlert(this.acknowledgingId, req).pipe(
      catchError(err => {
        this.toastService.error('Failed to acknowledge alert');
        return of(undefined);
      })
    ).subscribe(() => {
      this.acknowledgeSubmitting = false;
      this.acknowledgingId = null;
      this.toastService.success('Alert acknowledged');
      this.polling.refresh();
    });
  }

  // ─── Resolve ───────────────────────────────────────────────────
  openResolve(alertId: string): void {
    this.resolvingAlertId = alertId;
    this.resolveForm = { resolutionType: 'CHECKED_OK', resolutionNotes: '', isFalsePositive: false };
  }

  cancelResolve(): void {
    this.resolvingAlertId = null;
  }

  submitResolve(): void {
    if (!this.resolvingAlertId) return;
    const userId = this.authService.getCurrentUser()?.id ?? '';
    const req: ResolveAlertRequest = {
      resolutionType: this.resolveForm.resolutionType,
      resolutionNotes: this.resolveForm.resolutionNotes,
      isFalsePositive: this.resolveForm.isFalsePositive,
      resolvedBy: userId
    };
    this.resolveSubmitting = true;
    this.safetyService.resolveAlert(this.resolvingAlertId, req).pipe(
      catchError(() => {
        this.toastService.error('Failed to resolve alert');
        return of(undefined);
      })
    ).subscribe(() => {
      this.resolveSubmitting = false;
      this.resolvingAlertId = null;
      this.toastService.success('Alert resolved');
      this.polling.refresh();
    });
  }

  // ─── History ───────────────────────────────────────────────────
  toggleHistory(alertId: string): void {
    if (this.historyAlertId === alertId) {
      this.historyAlertId = null;
      return;
    }
    this.historyAlertId = alertId;
    this.historyLoading = true;
    this.safetyService.getAlertHistory(alertId).pipe(
      catchError(() => of([] as AlertHistoryResponse[]))
    ).subscribe(items => {
      this.historyItems = items.sort(
        (a, b) => new Date(b.performedAt).getTime() - new Date(a.performedAt).getTime()
      );
      this.historyLoading = false;
    });
  }

  // ─── Helpers ───────────────────────────────────────────────────
  severityClass(severity: string): string {
    const map: Record<string, string> = {
      CRITICAL: 'bg-red-100 text-red-800 border-red-200',
      HIGH: 'bg-orange-100 text-orange-800 border-orange-200',
      MEDIUM: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      LOW: 'bg-green-100 text-green-800 border-green-200'
    };
    return map[severity] ?? 'bg-gray-100 text-gray-800 border-gray-200';
  }

  severityDotClass(severity: string): string {
    const map: Record<string, string> = {
      CRITICAL: 'bg-red-500',
      HIGH: 'bg-orange-500',
      MEDIUM: 'bg-yellow-500',
      LOW: 'bg-green-500'
    };
    return map[severity] ?? 'bg-gray-400';
  }

  levelIcon(level: string): string {
    const map: Record<string, string> = {
      CAREGIVER: '👩‍⚕️',
      DOCTOR: '🩺',
      EMERGENCY_CONTACT: '🚨'
    };
    return map[level] ?? '👤';
  }

  actionIcon(action: string): string {
    const map: Record<string, string> = {
      NOTIFIED: '🔔',
      ESCALATED: '⬆️',
      ACKNOWLEDGED: '✅',
      RESOLVED: '🔒',
      FALSE_POSITIVE: '❌'
    };
    return map[action] ?? '•';
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
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  formatCountdown(minutes: number): string {
    if (minutes <= 0) return 'Overdue';
    if (minutes < 60) return `${minutes}m`;
    return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  }
}
