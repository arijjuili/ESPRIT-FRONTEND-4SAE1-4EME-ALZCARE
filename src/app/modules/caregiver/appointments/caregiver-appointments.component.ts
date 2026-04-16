import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth.service';
import { MedicalFollowupService } from '../../../core/services/medical-followup.service';
import { PatientService, PatientProfileResponse } from '../../../core/services/patient.service';
import { Appointment, AppointmentStatus } from '../../../core/models/medical-followup.model';

@Component({
  selector: 'app-caregiver-appointments',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './caregiver-appointments.component.html',
  styleUrls: ['./caregiver-appointments.component.scss']
})
export class CaregiverAppointmentsComponent implements OnInit {
  caregiverId: string | null = null;

  appointments: Appointment[] = [];
  loading = true;
  error: string | null = null;

  filterStatus: 'ALL' | AppointmentStatus = 'ALL';
  hideClosed = false;
  searchTerm = '';

  private patientDirectory: Record<string, string> = {};

  readonly appointmentStatuses = Object.values(AppointmentStatus);
  readonly AppointmentStatus = AppointmentStatus;

  constructor(
    private authService: AuthService,
    private medicalService: MedicalFollowupService,
    private patientService: PatientService
  ) {}

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    if (!user?.id) {
      this.loading = false;
      this.error = 'No authenticated caregiver found.';
      return;
    }

    this.caregiverId = user.id;
    this.refresh();
  }

  refresh(): void {
    if (!this.caregiverId) return;

    this.loading = true;
    this.error = null;

    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);
    const ninetyDaysLater = new Date();
    ninetyDaysLater.setDate(today.getDate() + 90);

    const fromDate = this.formatLocalDateTime(thirtyDaysAgo);
    const toDate = this.formatLocalDateTime(ninetyDaysLater);

    this.medicalService
      .listAppointments({ caregiverId: this.caregiverId, from: fromDate, to: toDate })
      .pipe(
        catchError(() => of([] as Appointment[])),
        switchMap((appointments) => {
          const sortedAppointments = (appointments || []).slice().sort(
            (left, right) => new Date(left.startAt).getTime() - new Date(right.startAt).getTime()
          );

          const patientIds = [...new Set(sortedAppointments.map(a => String(a.patientId || '').trim()).filter(Boolean))];
          if (patientIds.length === 0) {
            return of({ sortedAppointments, patients: [] as Array<PatientProfileResponse | null> });
          }

          const patientRequests = patientIds.map(id =>
            this.patientService.getPatientById(id).pipe(catchError(() => of(null)))
          );

          return forkJoin(patientRequests).pipe(
            map(patients => ({ sortedAppointments, patients }))
          );
        })
      )
      .subscribe({
        next: ({ sortedAppointments, patients }) => {
          this.patientDirectory = this.buildPatientDirectory(patients);
          this.appointments = sortedAppointments;
          this.loading = false;
        },
        error: (err) => {
          console.error('[CaregiverAppointments] Failed to load:', err);
          this.loading = false;
          this.error = 'Failed to load caregiver appointments.';
        }
      });
  }

  setFilter(status: string): void {
    this.filterStatus = status as 'ALL' | AppointmentStatus;
  }

  get filteredAppointments(): Appointment[] {
    let list = this.appointments;

    if (this.filterStatus !== 'ALL') {
      list = list.filter(a => a.status === this.filterStatus);
    }

    if (this.hideClosed) {
      list = list.filter(a => a.status !== AppointmentStatus.CANCELLED && a.status !== AppointmentStatus.COMPLETED);
    }

    const q = this.searchTerm.trim().toLowerCase();
    if (q) {
      list = list.filter(a => {
        const patient = this.getPatientLabel(a.patientId).toLowerCase();
        const type = String(a.type || '').toLowerCase();
        const mode = String(a.mode || '').toLowerCase();
        const status = String(a.status || '').toLowerCase();
        return (
          patient.includes(q) ||
          type.includes(q) ||
          mode.includes(q) ||
          status.includes(q)
        );
      });
    }

    return list;
  }

  get upcomingAppointments(): Appointment[] {
    const now = new Date();
    return this.filteredAppointments.filter(a =>
      new Date(a.startAt) >= now &&
      a.status !== AppointmentStatus.CANCELLED &&
      a.status !== AppointmentStatus.REJECTED
    );
  }

  get pastAppointments(): Appointment[] {
    const now = new Date();
    return this.filteredAppointments.filter(a =>
      new Date(a.startAt) < now ||
      a.status === AppointmentStatus.CANCELLED ||
      a.status === AppointmentStatus.COMPLETED ||
      a.status === AppointmentStatus.REJECTED
    );
  }

  getPatientLabel(patientId: string): string {
    const key = String(patientId || '').trim();
    return this.patientDirectory[key] || 'Unknown Patient';
  }

  private buildPatientDirectory(patients: Array<PatientProfileResponse | null>): Record<string, string> {
    const directory: Record<string, string> = {};
    for (const p of patients || []) {
      if (!p) continue;
      const firstName = (p.firstName || '').trim();
      const lastName = (p.lastName || '').trim();
      const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();
      if (!fullName) continue;
      if (p.userId) directory[String(p.userId)] = fullName;
      if (p.id) directory[String(p.id)] = fullName;
    }
    return directory;
  }

  private formatLocalDateTime(date: Date): string {
    // Backend expects LocalDateTime without timezone
    return date.toISOString().replace('Z', '');
  }
}
