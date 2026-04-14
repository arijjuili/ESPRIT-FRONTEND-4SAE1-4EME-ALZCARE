import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, interval, Subscription, of } from 'rxjs';
import { switchMap, catchError, distinctUntilChanged, map } from 'rxjs/operators';
import { SafetyAlertService } from './safety-alert.service';
import { ToastService } from '../../shared/components/toast/toast.service';
import { AlertResponse } from '../models/safety-alert.model';

const POLL_INTERVAL_MS = 30_000;

@Injectable({ providedIn: 'root' })
export class AlertPollingService implements OnDestroy {
  private alertsSubject = new BehaviorSubject<AlertResponse[]>([]);
  /** All currently ACTIVE alerts. Components subscribe to this. */
  readonly alerts$ = this.alertsSubject.asObservable();

  /** Count of active alerts (for badge). */
  readonly alertCount$ = this.alerts$.pipe(map(a => a.length));

  /** Count of CRITICAL active alerts. */
  readonly criticalCount$ = this.alerts$.pipe(
    map(a => a.filter(x => x.severity === 'CRITICAL').length)
  );

  private seenIds = new Set<string>();
  private pollSub?: Subscription;

  constructor(
    private safetyAlertService: SafetyAlertService,
    private toastService: ToastService
  ) {
    this.startPolling();
  }

  private startPolling(): void {
    // Immediate first fetch, then every POLL_INTERVAL_MS
    this.fetchAlerts();
    this.pollSub = interval(POLL_INTERVAL_MS).subscribe(() => this.fetchAlerts());
  }

  private fetchAlerts(): void {
    this.safetyAlertService.getActiveAlerts().pipe(
      catchError(() => of([] as AlertResponse[]))
    ).subscribe(alerts => {
      this.detectNewCriticals(alerts);
      this.alertsSubject.next(alerts);
    });
  }

  private detectNewCriticals(incoming: AlertResponse[]): void {
    for (const alert of incoming) {
      if (!this.seenIds.has(alert.id)) {
        this.seenIds.add(alert.id);
        // Only toast on genuinely new CRITICAL/HIGH alerts (skip initial load noise by
        // checking if we already had alerts before)
        if (this.alertsSubject.value.length > 0 &&
            (alert.severity === 'CRITICAL' || alert.severity === 'HIGH')) {
          const label = alert.severity === 'CRITICAL' ? 'CRITICAL ALERT' : 'High-Priority Alert';
          this.toastService.show(
            `Patient ${alert.patientId.slice(0, 8)} — ${alert.ruleCode.replace(/_/g, ' ')}`,
            alert.severity === 'CRITICAL' ? 'emergency' : 'warning',
            label,
            0
          );
        }
      }
    }
  }

  /** Force an immediate refresh (e.g. after resolving an alert). */
  refresh(): void {
    this.fetchAlerts();
  }

  ngOnDestroy(): void {
    this.pollSub?.unsubscribe();
  }
}
