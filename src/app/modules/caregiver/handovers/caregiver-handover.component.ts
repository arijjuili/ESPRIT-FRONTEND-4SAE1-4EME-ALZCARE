import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Subject, forkJoin, of } from 'rxjs';
import { takeUntil, catchError, switchMap, map } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth.service';
import { CareTeamService } from '../../../core/services/care-team.service';
import { ToastService } from '../../../shared/components/toast/toast.service';
import {
  CaregiverAssignment,
  CaregiverHandover,
  CaregiverRole,
  AssignmentStatus
} from '../../../core/models/care-team.model';

type TabType = 'create' | 'history';

@Component({
  selector: 'app-caregiver-handover',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './caregiver-handover.component.html',
  styleUrls: ['./caregiver-handover.component.scss']
})
export class CaregiverHandoverComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  caregiverId!: string;
  caregiverName = '';
  assignments: CaregiverAssignment[] = [];
  allPatientCaregivers: Map<string, CaregiverAssignment[]> = new Map();

  activeTab: TabType = 'create';
  handoverForm: FormGroup;

  // Handovers
  outgoingHandovers: CaregiverHandover[] = [];
  incomingHandovers: CaregiverHandover[] = [];
  allHandovers: CaregiverHandover[] = [];

  // Loading states
  loading = false;
  submitting = false;
  acknowledgingId: string | null = null;

  // Enums for template
  CaregiverRole = CaregiverRole;

  // Role badge colors
  roleColors: Record<CaregiverRole, string> = {
    [CaregiverRole.PRIMARY]: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    [CaregiverRole.FAMILY]: 'bg-blue-100 text-blue-800 border-blue-200',
    [CaregiverRole.EMERGENCY]: 'bg-rose-100 text-rose-800 border-rose-200'
  };

  constructor(
    private authService: AuthService,
    private careTeamService: CareTeamService,
    private toastService: ToastService,
    private fb: FormBuilder
  ) {
    this.handoverForm = this.fb.group({
      patientId: ['', Validators.required],
      toCaregiverId: ['', Validators.required],
      notes: ['', [Validators.required, Validators.minLength(10)]]
    });
  }

  ngOnInit(): void {
    const currentUser = this.authService.getCurrentUser();
    if (currentUser) {
      this.caregiverId = currentUser.id;
      this.caregiverName = currentUser.name;
      this.loadData();
    }

    // When patient changes, load other caregivers for that patient
    this.handoverForm.get('patientId')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(patientId => {
        if (patientId) {
          this.loadPatientCaregivers(patientId);
          this.handoverForm.get('toCaregiverId')?.setValue('');
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadData(): void {
    this.loading = true;
    this.careTeamService.getCaregiverAssignments(this.caregiverId)
      .pipe(
        takeUntil(this.destroy$),
        catchError(error => {
          console.error('Failed to load assignments:', error);
          this.toastService.error('Failed to load your assignments');
          return of([]);
        }),
        switchMap(assignments => {
          this.assignments = assignments.filter(a => a.status === AssignmentStatus.ACTIVE);
          return this.loadAllHandovers();
        })
      )
      .subscribe(() => {
        this.loading = false;
      });
  }

  loadAllHandovers() {
    if (this.assignments.length === 0) {
      return of([]);
    }

    const handoverObservables = this.assignments.map(assignment =>
      this.careTeamService.getPatientHandovers(assignment.patientId).pipe(
        catchError(error => {
          console.error(`Failed to load handovers for patient ${assignment.patientId}:`, error);
          return of([]);
        })
      )
    );

    return forkJoin(handoverObservables).pipe(
      takeUntil(this.destroy$),
      map(results => {
        // Flatten all handovers
        this.allHandovers = results.flat();
        this.categorizeHandovers();
        return this.allHandovers;
      })
    );
  }

  categorizeHandovers(): void {
    // Outgoing: created by current caregiver
    this.outgoingHandovers = this.allHandovers
      .filter(h => h.fromCaregiverId === this.caregiverId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Incoming: received by current caregiver
    this.incomingHandovers = this.allHandovers
      .filter(h => h.toCaregiverId === this.caregiverId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  loadPatientCaregivers(patientId: string): void {
    if (this.allPatientCaregivers.has(patientId)) {
      return;
    }

    this.careTeamService.getPatientCaregivers(patientId)
      .pipe(
        takeUntil(this.destroy$),
        catchError(error => {
          console.error('Failed to load patient caregivers:', error);
          return of([]);
        })
      )
      .subscribe(caregivers => {
        // Filter out current caregiver
        const otherCaregivers = caregivers.filter(c => c.caregiverId !== this.caregiverId);
        this.allPatientCaregivers.set(patientId, otherCaregivers);
      });
  }

  getPatientCaregivers(patientId: string): CaregiverAssignment[] {
    return this.allPatientCaregivers.get(patientId) || [];
  }

  submitHandover(): void {
    if (this.handoverForm.invalid) {
      this.markFormGroupTouched(this.handoverForm);
      return;
    }

    this.submitting = true;
    const formValue = this.handoverForm.value;

    const request = {
      patientId: formValue.patientId,
      fromCaregiverId: this.caregiverId,
      toCaregiverId: formValue.toCaregiverId,
      notes: formValue.notes
    };

    this.careTeamService.createHandover(request)
      .pipe(
        takeUntil(this.destroy$),
        catchError(error => {
          console.error('Failed to create handover:', error);
          this.toastService.error('Failed to create handover note');
          this.submitting = false;
          return of(null);
        })
      )
      .subscribe(result => {
        if (result) {
          this.toastService.success('Handover note created successfully!');
          this.handoverForm.reset();
          this.activeTab = 'history';
          this.loadAllHandovers().subscribe();
        }
        this.submitting = false;
      });
  }

  acknowledgeHandover(handoverId: string): void {
    this.acknowledgingId = handoverId;

    this.careTeamService.acknowledgeHandover(handoverId)
      .pipe(
        takeUntil(this.destroy$),
        catchError(error => {
          console.error('Failed to acknowledge handover:', error);
          this.toastService.error('Failed to acknowledge handover');
          this.acknowledgingId = null;
          return of(null);
        })
      )
      .subscribe(result => {
        if (result) {
          this.toastService.success('Handover acknowledged!');
          // Update the handover in the list
          const index = this.allHandovers.findIndex(h => h.id === handoverId);
          if (index !== -1) {
            this.allHandovers[index] = result;
            this.categorizeHandovers();
          }
        }
        this.acknowledgingId = null;
      });
  }

  setTab(tab: TabType): void {
    this.activeTab = tab;
  }

  getPatientName(patientId: string): string {
    const assignment = this.assignments.find(a => a.patientId === patientId);
    if (assignment?.patientFirstName) {
      return `${assignment.patientFirstName} ${assignment.patientLastName || ''}`.trim();
    }
    const handover = this.allHandovers.find(h => h.patientId === patientId);
    if (handover?.patientFirstName) {
      return `${handover.patientFirstName} ${handover.patientLastName || ''}`.trim();
    }
    return `Patient ${patientId}`;
  }

  getCaregiverName(caregiverId: string, type: 'from' | 'to'): string {
    const handover = this.allHandovers.find(h => 
      type === 'from' ? h.fromCaregiverId === caregiverId : h.toCaregiverId === caregiverId
    );
    if (handover) {
      const name = type === 'from' ? handover.fromCaregiverFirstName : handover.toCaregiverFirstName;
      if (name) return name;
    }
    return `Caregiver ${caregiverId}`;
  }

  getRoleBadgeClass(role: CaregiverRole | undefined): string {
    if (!role) return 'bg-gray-100 text-gray-800';
    return this.roleColors[role];
  }

  getRoleLabel(role: CaregiverRole | undefined): string {
    if (!role) return 'Unknown';
    const labels: Record<CaregiverRole, string> = {
      [CaregiverRole.PRIMARY]: 'Primary',
      [CaregiverRole.FAMILY]: 'Family',
      [CaregiverRole.EMERGENCY]: 'Emergency'
    };
    return labels[role];
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatDateShort(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  getPendingIncomingCount(): number {
    return this.incomingHandovers.filter(h => !h.acknowledged).length;
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();
      if ((control as any).controls) {
        this.markFormGroupTouched(control as FormGroup);
      }
    });
  }

  refreshData(): void {
    this.loadData();
  }
}
