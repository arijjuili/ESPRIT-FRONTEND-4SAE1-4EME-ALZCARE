import { Injectable } from '@angular/core';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, finalize, map, shareReplay, switchMap, tap } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { CareTeamService } from './care-team.service';
import { PatientProfileResponse, PatientService } from './patient.service';
import { AssignmentStatus, CaregiverAssignment } from '../models/care-team.model';

/**
 * Shared caregiver patient context cache.
 * Keeps assigned patients and active assignments in memory to avoid duplicate calls across caregiver pages.
 */
@Injectable({
  providedIn: 'root'
})
export class CaregiverPatientContextService {
  private readonly ttlMs = 5 * 60 * 1000;

  private cacheCaregiverId: string | null = null;

  private activeAssignmentsSnapshot: CaregiverAssignment[] = [];
  private activeAssignmentsFetchedAt = 0;
  private activeAssignmentsRequest$: Observable<CaregiverAssignment[]> | null = null;

  private assignedPatientsSnapshot: PatientProfileResponse[] = [];
  private assignedPatientsFetchedAt = 0;
  private assignedPatientsRequest$: Observable<PatientProfileResponse[]> | null = null;

  constructor(
    private authService: AuthService,
    private careTeamService: CareTeamService,
    private patientService: PatientService
  ) {}

  getActiveAssignments(forceRefresh = false): Observable<CaregiverAssignment[]> {
    const caregiverId = this.ensureCaregiverScope();
    if (!caregiverId) {
      return of([]);
    }

    if (!forceRefresh && this.isFresh(this.activeAssignmentsFetchedAt)) {
      return of(this.activeAssignmentsSnapshot);
    }

    if (!forceRefresh && this.activeAssignmentsRequest$) {
      return this.activeAssignmentsRequest$;
    }

    const request$ = this.careTeamService.getCaregiverAssignments(caregiverId).pipe(
      map(assignments => assignments.filter(a => a.status === AssignmentStatus.ACTIVE)),
      tap(assignments => {
        this.activeAssignmentsSnapshot = assignments;
        this.activeAssignmentsFetchedAt = Date.now();
      }),
      catchError(error => {
        console.error('Failed to load caregiver assignments:', error);
        this.activeAssignmentsSnapshot = [];
        this.activeAssignmentsFetchedAt = Date.now();
        return of([] as CaregiverAssignment[]);
      }),
      finalize(() => {
        this.activeAssignmentsRequest$ = null;
      }),
      shareReplay({ bufferSize: 1, refCount: false })
    );

    this.activeAssignmentsRequest$ = request$;
    return request$;
  }

  getAssignedPatients(forceRefresh = false): Observable<PatientProfileResponse[]> {
    const caregiverId = this.ensureCaregiverScope();
    if (!caregiverId) {
      return of([]);
    }

    if (!forceRefresh && this.isFresh(this.assignedPatientsFetchedAt)) {
      return of(this.assignedPatientsSnapshot);
    }

    if (!forceRefresh && this.assignedPatientsRequest$) {
      return this.assignedPatientsRequest$;
    }

    const request$ = this.getActiveAssignments(forceRefresh).pipe(
      switchMap(assignments => {
        if (assignments.length === 0) {
          return of([] as PatientProfileResponse[]);
        }

        const requests = assignments.map(assignment =>
          this.patientService.getPatientById(assignment.patientId).pipe(
            map(patient => this.normalizePatient(patient, assignment)),
            catchError(error => {
              console.error(`Failed to load patient ${assignment.patientId}:`, error);
              return of({
                id: assignment.patientId,
                userId: assignment.patientId,
                firstName: assignment.patientFirstName || 'Unknown',
                lastName: assignment.patientLastName || 'Patient'
              } as PatientProfileResponse);
            })
          )
        );

        return forkJoin(requests).pipe(map(patients => this.dedupePatients(patients)));
      }),
      tap(patients => {
        this.assignedPatientsSnapshot = patients;
        this.assignedPatientsFetchedAt = Date.now();
      }),
      catchError(error => {
        console.error('Failed to load caregiver assigned patients:', error);
        this.assignedPatientsSnapshot = [];
        this.assignedPatientsFetchedAt = Date.now();
        return of([] as PatientProfileResponse[]);
      }),
      finalize(() => {
        this.assignedPatientsRequest$ = null;
      }),
      shareReplay({ bufferSize: 1, refCount: false })
    );

    this.assignedPatientsRequest$ = request$;
    return request$;
  }

  refreshAssignedPatients(): Observable<PatientProfileResponse[]> {
    this.invalidate();
    return this.getAssignedPatients(true);
  }

  invalidate(): void {
    this.activeAssignmentsSnapshot = [];
    this.activeAssignmentsFetchedAt = 0;
    this.activeAssignmentsRequest$ = null;

    this.assignedPatientsSnapshot = [];
    this.assignedPatientsFetchedAt = 0;
    this.assignedPatientsRequest$ = null;
  }

  private normalizePatient(
    patient: PatientProfileResponse,
    assignment: CaregiverAssignment
  ): PatientProfileResponse {
    return {
      ...patient,
      id: patient.id || assignment.patientId,
      userId: patient.userId || assignment.patientId,
      firstName: patient.firstName || assignment.patientFirstName || 'Unknown',
      lastName: patient.lastName || assignment.patientLastName || 'Patient'
    };
  }

  private dedupePatients(patients: PatientProfileResponse[]): PatientProfileResponse[] {
    const seen = new Set<string>();
    const unique: PatientProfileResponse[] = [];

    for (const patient of patients) {
      const key = patient.id || patient.userId;
      if (!key || seen.has(key)) {
        continue;
      }
      seen.add(key);
      unique.push(patient);
    }

    return unique;
  }

  private ensureCaregiverScope(): string | null {
    const caregiverId = this.getCurrentCaregiverId();
    if (!caregiverId) {
      this.invalidate();
      this.cacheCaregiverId = null;
      return null;
    }

    if (this.cacheCaregiverId !== caregiverId) {
      this.invalidate();
      this.cacheCaregiverId = caregiverId;
    }

    return caregiverId;
  }

  private getCurrentCaregiverId(): string | null {
    const user = this.authService.getCurrentUser();
    if (!user || user.role !== 'caregiver' || !user.id) {
      return null;
    }
    return user.id;
  }

  private isFresh(fetchedAt: number): boolean {
    return fetchedAt > 0 && Date.now() - fetchedAt < this.ttlMs;
  }
}
