import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Subject, forkJoin, of } from 'rxjs';
import { takeUntil, catchError, switchMap, map } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth.service';
import { CareTeamService } from '../../../core/services/care-team.service';
import { PatientService } from '../../../core/services/patient.service';
import { ApiService } from '../../../core/services/api.service';
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
  /** patient userId -> display name from identity (assignments often omit patientFirstName/LastName) */
  patientNamesByUserId: Record<string, string> = {};
  /** caregiver Keycloak userId -> display name from identity API */
  caregiverNamesByUserId: Record<string, string> = {};
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
    private patientService: PatientService,
    private apiService: ApiService,
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
        switchMap((assignments) => {
          this.assignments = assignments.filter((a) => a.status === AssignmentStatus.ACTIVE);
          return this.loadPatientDisplayNames().pipe(switchMap(() => this.loadAllHandovers()));
        })
      )
      .subscribe(() => {
        this.loading = false;
      });
  }

  /**
   * Native <option> cannot contain HTML; labels must be plain text.
   * Prefer identity profile when care-team does not send patient names.
   */
  private loadPatientDisplayNames() {
    const ids = [...new Set(this.assignments.map((a) => a.patientId).filter(Boolean))];
    if (ids.length === 0) {
      this.patientNamesByUserId = {};
      return of(void 0);
    }
    return forkJoin(
      ids.map((id) =>
        this.patientService.getPatientById(id).pipe(
          map((p) => {
            const n = `${p.firstName || ''} ${p.lastName || ''}`.trim();
            return { id, name: n || this.shortPatientLabel(id) };
          }),
          catchError(() => of({ id, name: this.shortPatientLabel(id) }))
        )
      )
    ).pipe(
      map((rows) => {
        this.patientNamesByUserId = Object.fromEntries(rows.map((r) => [r.id, r.name]));
      }),
      map(() => void 0)
    );
  }

  private shortPatientLabel(id: string): string {
    return id.length > 12 ? `Patient ${id.slice(0, 8)}…` : `Patient ${id}`;
  }

  private shortCaregiverLabel(id: string): string {
    return id.length > 12 ? `Caregiver ${id.slice(0, 8)}…` : `Caregiver ${id}`;
  }

  /** Load caregiver display names from identity (care-team rows often omit first/last name). */
  private fetchAndMergeCaregiverNames(userIds: (string | null | undefined)[]): void {
    const ids = [
      ...new Set(
        userIds.filter((id): id is string => !!id && String(id).trim().length > 0 && !this.caregiverNamesByUserId[id])
      )
    ];
    if (ids.length === 0) {
      return;
    }
    forkJoin(
      ids.map((id) =>
        this.apiService.getCaregiverByUserId(id).pipe(
          map((p) => ({
            id,
            name: `${p.firstName || ''} ${p.lastName || ''}`.trim() || this.shortCaregiverLabel(id)
          })),
          catchError(() => of({ id, name: this.shortCaregiverLabel(id) }))
        )
      )
    )
      .pipe(takeUntil(this.destroy$))
      .subscribe((rows) => {
        for (const r of rows) {
          this.caregiverNamesByUserId[r.id] = r.name;
        }
      });
  }

  /** Single line for <select> options (no nested tags). */
  getPatientSelectLabel(assignment: CaregiverAssignment): string {
    const fromAssignment = [assignment.patientFirstName, assignment.patientLastName]
      .filter(Boolean)
      .join(' ')
      .trim();
    const fromIdentity = (this.patientNamesByUserId[assignment.patientId] || '').trim();
    const name = (fromIdentity || fromAssignment || this.shortPatientLabel(assignment.patientId)).trim();
    return `${name} — your role: ${this.getRoleLabel(assignment.role)}`;
  }

  getCaregiverSelectLabel(c: CaregiverAssignment): string {
    const cid = (c.caregiverId && String(c.caregiverId).trim()) || '';
    const fromAssignment = [c.caregiverFirstName, c.caregiverLastName].filter(Boolean).join(' ').trim();
    const fromIdentity = (cid ? this.caregiverNamesByUserId[cid] : '')?.trim() || '';
    const who =
      fromIdentity ||
      fromAssignment ||
      (cid ? this.shortCaregiverLabel(cid) : 'Unknown caregiver');
    return `${who} (${this.getRoleLabel(c.role)})`;
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
      map((results) => {
        this.allHandovers = results.flat();
        this.categorizeHandovers();
        const ids = this.allHandovers.flatMap((h) => [h.fromCaregiverId, h.toCaregiverId]);
        this.fetchAndMergeCaregiverNames(ids);
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
      .subscribe((caregivers) => {
        const st = (s: unknown) => String(s ?? '').toUpperCase();
        // Only accepted teammates (ACTIVE + linked Keycloak user). Pending invites have no caregiverId.
        const otherCaregivers = caregivers.filter(
          (c) =>
            !!c.caregiverId &&
            String(c.caregiverId).trim() !== String(this.caregiverId).trim() &&
            st(c.status) === 'ACTIVE'
        );
        this.allPatientCaregivers.set(patientId, otherCaregivers);
        this.fetchAndMergeCaregiverNames(otherCaregivers.map((c) => c.caregiverId));
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
    const cached = (this.patientNamesByUserId[patientId] || '').trim();
    if (cached) {
      return cached;
    }
    const assignment = this.assignments.find((a) => a.patientId === patientId);
    if (assignment?.patientFirstName) {
      return `${assignment.patientFirstName} ${assignment.patientLastName || ''}`.trim();
    }
    const handover = this.allHandovers.find((h) => h.patientId === patientId);
    if (handover?.patientFirstName) {
      return `${handover.patientFirstName} ${handover.patientLastName || ''}`.trim();
    }
    return this.shortPatientLabel(patientId);
  }

  getCaregiverName(caregiverId: string, type: 'from' | 'to'): string {
    const fromIdentity = (this.caregiverNamesByUserId[caregiverId] || '').trim();
    if (fromIdentity) {
      return fromIdentity;
    }
    const handover = this.allHandovers.find(
      (h) => (type === 'from' ? h.fromCaregiverId === caregiverId : h.toCaregiverId === caregiverId)
    );
    if (handover) {
      const name = type === 'from' ? handover.fromCaregiverFirstName : handover.toCaregiverFirstName;
      if (name) {
        return name;
      }
    }
    return this.shortCaregiverLabel(caregiverId);
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
