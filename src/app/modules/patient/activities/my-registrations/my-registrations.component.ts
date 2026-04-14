import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Subject, of } from 'rxjs';
import { takeUntil, catchError, finalize } from 'rxjs/operators';
import { ActivityService } from '../../../../core/services/activity.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ToastService } from '../../../../shared/components/toast/toast.service';
import { Registration } from '../../../../core/models/activity.model';

@Component({
  selector: 'app-my-registrations',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './my-registrations.component.html'
})
export class MyRegistrationsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private patientId = '';

  registrations: Registration[] = [];
  loading = false;
  cancellingId: string | null = null;

  constructor(
    private activityService: ActivityService,
    private authService: AuthService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    if (user) {
      this.patientId = user.id;
      this.loadRegistrations();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadRegistrations(): void {
    if (!this.patientId) return;
    this.loading = true;
    this.activityService.getPatientRegistrations(this.patientId)
      .pipe(
        catchError(() => {
          this.toastService.error('Failed to load registrations');
          return of([]);
        }),
        finalize(() => { this.loading = false; }),
        takeUntil(this.destroy$)
      )
      .subscribe(regs => { this.registrations = regs; });
  }

  cancelRegistration(reg: Registration): void {
    this.cancellingId = reg.id;
    this.activityService.cancelRegistration(reg.id)
      .pipe(
        catchError(() => {
          this.toastService.error('Failed to cancel registration');
          return of(undefined);
        }),
        finalize(() => { this.cancellingId = null; }),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        reg.status = 'CANCELLED';
        this.toastService.success('Registration cancelled');
      });
  }

  get activeRegistrations(): Registration[] {
    return this.registrations.filter(r => r.status !== 'CANCELLED');
  }

  get cancelledRegistrations(): Registration[] {
    return this.registrations.filter(r => r.status === 'CANCELLED');
  }

  statusClass(status: string): string {
    const m: Record<string, string> = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      CONFIRMED: 'bg-green-100 text-green-800',
      RECORDED: 'bg-blue-100 text-blue-800',
      CANCELLED: 'bg-gray-100 text-gray-500'
    };
    return m[status] ?? 'bg-gray-100 text-gray-600';
  }

  formatDate(iso?: string): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
  }
}
