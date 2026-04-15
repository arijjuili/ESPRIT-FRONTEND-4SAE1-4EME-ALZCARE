import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, of } from 'rxjs';
import { takeUntil, catchError, finalize } from 'rxjs/operators';
import { ActivityService } from '../../../../core/services/activity.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ToastService } from '../../../../shared/components/toast/toast.service';
import { ActivityResponse, Registration } from '../../../../core/models/activity.model';

@Component({
  selector: 'app-activity-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './activity-detail.component.html'
})
export class ActivityDetailComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private patientId = '';

  activity: ActivityResponse | null = null;
  loading = false;
  error: string | null = null;

  // Registration state
  existingRegistration: Registration | null = null;
  checkingRegistration = false;
  registering = false;
  cancelling = false;
  specialNeeds = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private activityService: ActivityService,
    private authService: AuthService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    if (user) this.patientId = user.id;

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadActivity(id);
    } else {
      this.error = 'Invalid activity ID';
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadActivity(id: string): void {
    this.loading = true;
    this.activityService.getActivity(id)
      .pipe(
        catchError(() => {
          this.error = 'Failed to load activity details';
          return of(null);
        }),
        finalize(() => { this.loading = false; }),
        takeUntil(this.destroy$)
      )
      .subscribe(activity => {
        if (activity) {
          this.activity = activity;
          if (this.patientId) this.checkRegistration(activity.id);
        }
      });
  }

  checkRegistration(activityId: string): void {
    this.checkingRegistration = true;
    this.activityService.checkPatientRegistered(activityId, this.patientId)
      .pipe(
        catchError(() => of(null)),
        finalize(() => { this.checkingRegistration = false; }),
        takeUntil(this.destroy$)
      )
      .subscribe(reg => { this.existingRegistration = reg; });
  }

  register(): void {
    if (!this.activity || !this.patientId) return;
    this.registering = true;
    this.activityService.registerForActivity({
      activityId: this.activity.id,
      patientId: this.patientId,
      specialNeeds: this.specialNeeds || undefined
    })
      .pipe(
        catchError(err => {
          const msg = err.error?.message || err.error?.detail || 'Registration failed';
          this.toastService.error(msg);
          return of(null);
        }),
        finalize(() => { this.registering = false; }),
        takeUntil(this.destroy$)
      )
      .subscribe(reg => {
        if (reg) {
          this.existingRegistration = reg;
          if (this.activity) this.activity.registeredCount++;
          this.specialNeeds = '';
          this.toastService.success('You\'re registered! See My Registrations for details.');
        }
      });
  }

  cancelRegistration(): void {
    if (!this.existingRegistration) return;
    this.cancelling = true;
    this.activityService.cancelRegistration(this.existingRegistration.id)
      .pipe(
        catchError(() => {
          this.toastService.error('Failed to cancel registration');
          return of(undefined);
        }),
        finalize(() => { this.cancelling = false; }),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.existingRegistration = null;
        if (this.activity) this.activity.registeredCount = Math.max(0, this.activity.registeredCount - 1);
        this.toastService.success('Registration cancelled');
      });
  }

  get isFull(): boolean {
    return !!this.activity && this.activity.registeredCount >= this.activity.maxCapacity;
  }

  get isCancelled(): boolean {
    return this.activity?.status === 'CANCELLED';
  }

  capacityPercent(): number {
    if (!this.activity?.maxCapacity) return 0;
    return Math.min(100, Math.round((this.activity.registeredCount / this.activity.maxCapacity) * 100));
  }

  capacityClass(): string {
    const pct = this.capacityPercent();
    if (pct >= 90) return 'bg-red-400';
    if (pct >= 60) return 'bg-yellow-400';
    return 'bg-green-400';
  }

  statusClass(status: string): string {
    const m: Record<string, string> = {
      PUBLISHED: 'bg-green-100 text-green-800',
      IN_PROGRESS: 'bg-blue-100 text-blue-800',
      CANCELLED: 'bg-gray-100 text-gray-500'
    };
    return m[status] ?? 'bg-gray-100 text-gray-600';
  }

  registrationStatusClass(status: string): string {
    const m: Record<string, string> = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      CONFIRMED: 'bg-green-100 text-green-800',
      RECORDED: 'bg-blue-100 text-blue-800',
      CANCELLED: 'bg-gray-100 text-gray-500'
    };
    return m[status] ?? 'bg-gray-100 text-gray-600';
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-GB', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }

  goBack(): void {
    this.router.navigate(['/patient/activities']);
  }
}
