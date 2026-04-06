import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth.service';
import { ApiService } from '../../../core/services/api.service';
import { MedicalFollowupService } from '../../../core/services/medical-followup.service';
import { AppointmentSchedulingService } from '../../../core/services/appointment-scheduling.service';
import { UserManagementService } from '../../../core/services/user-management.service';
import { Appointment, AppointmentStatus, MedicationPlan } from '../../../core/models/medical-followup.model';
import { ManagedUser } from '../../../core/models/user-management.model';
import { DoctorProfile } from '../../../core/models/api.model';

/**
 * Doctor Dashboard - Dynamic Data
 * 
 * Displays real-time data:
 * - Total patients assigned to doctor
 * - Today's appointments
 * - Pending medication reviews
 * - Active prescriptions
 */
@Component({
  selector: 'app-doctor-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './doctor-dashboard.component.html',
  styleUrls: ['./doctor-dashboard.component.scss']
})
export class DoctorDashboardComponent implements OnInit {
  doctorName = '';
  doctorId = '';
  doctorMeta: string | null = null;
  doctorProfile: DoctorProfile | null = null;
  
  // Data
  patients: ManagedUser[] = [];
  appointments: Appointment[] = [];
  medicationPlans: MedicationPlan[] = [];
  
  // Stats
  stats = {
    totalPatients: 0,
    appointmentsToday: 0,
    pendingReviews: 0,
    activePrescriptions: 0
  };
  
  // Loading states
  loading = {
    patients: true,
    appointments: true,
    medications: true
  };
  
  // Error handling
  error: string | null = null;

  // UI helpers
  patientQuery = '';
  confirming: Record<number, boolean> = {};
  nextAppointmentsPage = 1;
  patientQueuePage = 1;
  readonly nextAppointmentsPageSize = 4;
  readonly patientQueuePageSize = 6;

  constructor(
    private authService: AuthService,
    private apiService: ApiService,
    private medicalService: MedicalFollowupService,
    private schedulingService: AppointmentSchedulingService,
    private userService: UserManagementService
  ) {}

  ngOnInit(): void {
    const currentUser = this.authService.getCurrentUser();
    
    if (currentUser) {
      this.doctorName = this.formatDoctorName(currentUser.name || 'Doctor');
      this.doctorId = currentUser.id;
      this.loadDoctorProfile(currentUser.id);
      this.loadDashboardData();
    }
  }

  private formatDoctorName(name: string): string {
    const trimmed = (name || '').trim();
    if (!trimmed) return 'Doctor';
    const lower = trimmed.toLowerCase();
    if (lower.startsWith('dr') || lower.startsWith('doctor')) return trimmed;
    return `Dr. ${trimmed}`;
  }

  private loadDoctorProfile(userId: string): void {
    this.apiService.getDoctorByUserId(userId).subscribe({
      next: (profile) => {
        this.doctorProfile = profile;
        const fullName = `${profile.firstName} ${profile.lastName}`.trim();
        if (fullName) {
          this.doctorName = this.formatDoctorName(fullName);
        }
        this.doctorMeta = profile.speciality ? profile.speciality : null;
      },
      error: () => {
        // Non-blocking: keep the token-based name as fallback.
      }
    });
  }

  /**
   * Load all dashboard data in parallel
   */
  loadDashboardData(): void {
    this.loading = { patients: true, appointments: true, medications: true };
    this.error = null;

    // Get today's date range
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

    const todayFrom = startOfDay.toISOString();
    const todayTo = endOfDay.toISOString();
    const monthFrom = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
    const monthTo = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString();

    // Load patients, appointments, and medications in parallel
    forkJoin({
      patients: this.userService.getActivePatients().pipe(catchError(() => of([]))),
      appointments: this.medicalService.getDoctorAppointments(this.doctorId, monthFrom, monthTo).pipe(catchError(() => of([]))),
      medicationPlans: this.medicalService.getAllMedicationPlans().pipe(catchError(() => of([])))
    }).subscribe({
      next: (data) => {
        this.patients = data.patients;
        this.appointments = data.appointments;
        this.medicationPlans = data.medicationPlans;
        this.resetDashboardPaging();
        
        this.calculateStats(todayFrom, todayTo);
        this.loading = { patients: false, appointments: false, medications: false };
      },
      error: (err) => {
        console.error('Error loading dashboard data:', err);
        this.error = 'Failed to load dashboard data';
        this.loading = { patients: false, appointments: false, medications: false };
      }
    });
  }

  /**
   * Calculate dashboard statistics
   */
  calculateStats(todayFrom: string, todayTo: string): void {
    const todayStart = new Date(todayFrom);
    const todayEnd = new Date(todayTo);

    // Total patients
    this.stats.totalPatients = this.patients.length;

    // Today's appointments
    this.stats.appointmentsToday = this.appointments.filter(appt => {
      const apptDate = new Date(appt.startAt);
      if (apptDate < todayStart || apptDate > todayEnd) {
        return false;
      }
      return appt.status !== AppointmentStatus.CANCELLED && appt.status !== AppointmentStatus.COMPLETED;
    }).length;

    // Active prescriptions (medication plans)
    this.stats.activePrescriptions = this.medicationPlans.filter(plan => 
      plan.status === 'ACTIVE'
    ).length;

    // Pending reviews (requested appointments or suspended medication plans)
    const pendingAppointments = this.appointments.filter(appt => 
      appt.status === AppointmentStatus.REQUESTED
    ).length;
    const suspendedMedications = this.medicationPlans.filter(plan => 
      plan.status === 'SUSPENDED'
    ).length;
    this.stats.pendingReviews = pendingAppointments + suspendedMedications;
  }

  get requestedAppointmentsCount(): number {
    return this.appointments.filter(appt => appt.status === AppointmentStatus.REQUESTED).length;
  }

  get requestedAppointments(): Appointment[] {
    return this.appointments
      .filter(appt => appt.status === AppointmentStatus.REQUESTED)
      .sort((a, b) => this.compareRequestedAppointments(a, b))
      .slice(0, 5);
  }

  get suspendedPlansCount(): number {
    return this.medicationPlans.filter(plan => plan.status === 'SUSPENDED').length;
  }

  get activeTreatmentPlansCount(): number {
    return this.medicationPlans.filter(plan => plan.status === 'ACTIVE').length;
  }

  get nextSevenDaysAppointmentsCount(): number {
    const now = new Date();
    const nextWeek = new Date(now.getTime());
    nextWeek.setDate(nextWeek.getDate() + 7);

    return this.appointments.filter(appt => {
      const date = new Date(appt.startAt);
      if (date < now || date > nextWeek) {
        return false;
      }

      return appt.status !== AppointmentStatus.CANCELLED && appt.status !== AppointmentStatus.COMPLETED;
    }).length;
  }

  get patientsWithoutUpcomingCount(): number {
    return this.activePatients.filter(patient => {
      const hasUpcoming = this.appointments.some(appt => {
        if (appt.status === AppointmentStatus.CANCELLED || appt.status === AppointmentStatus.COMPLETED) {
          return false;
        }

        const matchedPatient = this.getPatientMatch(appt.patientId);
        if (!matchedPatient || matchedPatient.id !== patient.id) {
          return false;
        }

        return new Date(appt.startAt) >= new Date();
      });

      return !hasUpcoming;
    }).length;
  }

  get activeTreatmentPatientsCount(): number {
    const activePatientIds = new Set<string>();

    this.medicationPlans
      .filter(plan => plan.status === 'ACTIVE')
      .forEach(plan => {
        const matchedPatient = this.getPatientMatch(plan.patientId);
        if (matchedPatient?.id) {
          activePatientIds.add(matchedPatient.id);
        }
      });

    return activePatientIds.size;
  }

  get activePatients(): ManagedUser[] {
    return this.patients.filter(patient => {
      const candidate = patient as ManagedUser & { isActive?: boolean; keycloakId?: string };

      if (typeof candidate.isActive === 'boolean') {
        return candidate.isActive;
      }

      if (typeof patient.status === 'string' && patient.status.trim().length > 0) {
        return patient.status.toUpperCase() === 'ACTIVE';
      }

      if (typeof patient.enabled === 'boolean') {
        return patient.enabled;
      }

      return true;
    });
  }

  private getPatientMatch(patientId: string): ManagedUser | undefined {
    return this.patients.find(p => {
      const anyP: any = p as any;
      return p.id === patientId || anyP.userId === patientId || anyP.keycloakId === patientId;
    });
  }

  get visiblePatients(): ManagedUser[] {
    const query = this.patientQuery.trim().toLowerCase();
    const list = this.activePatients;

    if (!query) {
      return list.slice(0, 10);
    }

    return list
      .filter(p => {
        const fullName = (p.fullName || '').toLowerCase();
        const firstName = (p.firstName || '').toLowerCase();
        const lastName = (p.lastName || '').toLowerCase();
        const email = (p.email || '').toLowerCase();
        const username = (p.username || '').toLowerCase();
        return (
          fullName.includes(query) ||
          firstName.includes(query) ||
          lastName.includes(query) ||
          email.includes(query) ||
          username.includes(query) ||
          (p.id || '').toLowerCase().includes(query)
        );
      })
      .slice(0, 10);
  }

  get patientQueue(): Array<{
    patient: ManagedUser;
    nextAppointmentAt: string | null;
    nextAppointmentLabel: string | null;
    upcomingCount: number;
    requestedCount: number;
    hasToday: boolean;
    activePlanCount: number;
  }> {
    const now = new Date();
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const endToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    const relevantAppointments = this.appointments.filter(a =>
      a.status !== AppointmentStatus.CANCELLED && a.status !== AppointmentStatus.COMPLETED
    );

    const byPatient = new Map<string, Appointment[]>();
    for (const appt of relevantAppointments) {
      const patient = this.getPatientMatch(appt.patientId);
      if (!patient) continue;
      const bucket = byPatient.get(patient.id) || [];
      bucket.push(appt);
      byPatient.set(patient.id, bucket);
    }

    const activePlansByPatient = new Map<string, number>();
    this.medicationPlans
      .filter(plan => plan.status === 'ACTIVE')
      .forEach(plan => {
        const matchedPatient = this.getPatientMatch(plan.patientId);
        if (!matchedPatient) return;
        activePlansByPatient.set(
          matchedPatient.id,
          (activePlansByPatient.get(matchedPatient.id) || 0) + 1
        );
      });

    const cards = this.activePatients.map(patient => {
      const appts = (byPatient.get(patient.id) || []).slice().sort((a, b) =>
        new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
      );

      const futureAppts = appts.filter(a => new Date(a.startAt) >= now);
      const nextAppt = futureAppts[0] || null;

      const requestedCount = appts.filter(a => a.status === AppointmentStatus.REQUESTED).length;
      const upcomingCount = futureAppts.length;

      const hasToday = appts.some(a => {
        const d = new Date(a.startAt);
        return d >= startToday && d <= endToday;
      });

      const nextAppointmentAt = nextAppt ? nextAppt.startAt : null;
      const nextAppointmentLabel = nextAppt ? this.formatAppointmentDate(nextAppt.startAt) : null;

      return {
        patient,
        nextAppointmentAt,
        nextAppointmentLabel,
        upcomingCount,
        requestedCount,
        hasToday,
        activePlanCount: activePlansByPatient.get(patient.id) || 0
      };
    });

    const query = this.patientQuery.trim().toLowerCase();
    const filtered = query
      ? cards.filter(c => {
          const p = c.patient;
          const fullName = (p.fullName || '').toLowerCase();
          const firstName = (p.firstName || '').toLowerCase();
          const lastName = (p.lastName || '').toLowerCase();
          const email = (p.email || '').toLowerCase();
          const username = (p.username || '').toLowerCase();
          return (
            fullName.includes(query) ||
            firstName.includes(query) ||
            lastName.includes(query) ||
            email.includes(query) ||
            username.includes(query) ||
            (p.id || '').toLowerCase().includes(query)
          );
        })
      : cards;

    return filtered
      .filter(card =>
        card.hasToday ||
        card.requestedCount > 0 ||
        (card.activePlanCount > 0 && card.upcomingCount === 0)
      )
      .sort((a, b) => {
        if (a.hasToday !== b.hasToday) return a.hasToday ? -1 : 1;
        if (a.requestedCount !== b.requestedCount) return b.requestedCount - a.requestedCount;
        if (a.activePlanCount !== b.activePlanCount) return b.activePlanCount - a.activePlanCount;
        const at = a.nextAppointmentAt ? new Date(a.nextAppointmentAt).getTime() : Number.POSITIVE_INFINITY;
        const bt = b.nextAppointmentAt ? new Date(b.nextAppointmentAt).getTime() : Number.POSITIVE_INFINITY;
        if (at !== bt) return at - bt;
        const an = (a.patient.fullName || a.patient.username || a.patient.email || '').toLowerCase();
        const bn = (b.patient.fullName || b.patient.username || b.patient.email || '').toLowerCase();
        return an.localeCompare(bn);
      });
  }

  get todaysAppointments(): Appointment[] {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    return this.appointments
      .filter(appt => {
        const d = new Date(appt.startAt);
        if (d < start || d > end) return false;
        return appt.status !== AppointmentStatus.CANCELLED && appt.status !== AppointmentStatus.COMPLETED;
      })
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
  }

  get nextAppointments(): Appointment[] {
    const now = new Date();
    const nextWeek = new Date(now.getTime());
    nextWeek.setDate(nextWeek.getDate() + 7);

    return this.appointments
      .filter(appt => {
        const d = new Date(appt.startAt);
        if (d < now || d > nextWeek) return false;
        return appt.status !== AppointmentStatus.CANCELLED && appt.status !== AppointmentStatus.COMPLETED;
      })
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
  }

  get paginatedNextAppointments(): Appointment[] {
    const start = (this.safeNextAppointmentsPage - 1) * this.nextAppointmentsPageSize;
    return this.nextAppointments.slice(start, start + this.nextAppointmentsPageSize);
  }

  get nextAppointmentsTotalPages(): number {
    return Math.max(1, Math.ceil(this.nextAppointments.length / this.nextAppointmentsPageSize));
  }

  get nextAppointmentsPageNumbers(): number[] {
    return this.buildPageNumbers(this.nextAppointmentsTotalPages, this.safeNextAppointmentsPage);
  }

  get paginatedPatientQueue(): Array<{
    patient: ManagedUser;
    nextAppointmentAt: string | null;
    nextAppointmentLabel: string | null;
    upcomingCount: number;
    requestedCount: number;
    hasToday: boolean;
    activePlanCount: number;
  }> {
    const start = (this.safePatientQueuePage - 1) * this.patientQueuePageSize;
    return this.patientQueue.slice(start, start + this.patientQueuePageSize);
  }

  get patientQueueTotalPages(): number {
    return Math.max(1, Math.ceil(this.patientQueue.length / this.patientQueuePageSize));
  }

  get patientQueuePageNumbers(): number[] {
    return this.buildPageNumbers(this.patientQueueTotalPages, this.safePatientQueuePage);
  }

  get safeNextAppointmentsPage(): number {
    return this.clampPage(this.nextAppointmentsPage, this.nextAppointmentsTotalPages);
  }

  get safePatientQueuePage(): number {
    return this.clampPage(this.patientQueuePage, this.patientQueueTotalPages);
  }

  onPatientQueryChange(): void {
    this.patientQueuePage = 1;
  }

  goToNextAppointmentsPage(page: number): void {
    this.nextAppointmentsPage = this.clampPage(page, this.nextAppointmentsTotalPages);
  }

  goToPatientQueuePage(page: number): void {
    this.patientQueuePage = this.clampPage(page, this.patientQueueTotalPages);
  }

  acceptRequestedAppointment(appointmentId: number): void {
    if (!appointmentId) return;
    this.confirming[appointmentId] = true;

    this.medicalService.changeAppointmentStatus(appointmentId, AppointmentStatus.ACCEPTED).subscribe({
      next: (updated) => {
        const idx = this.appointments.findIndex(a => a.id === appointmentId);
        if (idx !== -1) {
          this.appointments[idx] = { ...this.appointments[idx], ...updated };
          this.appointments = [...this.appointments];
        }
        this.confirming[appointmentId] = false;
      },
      error: () => {
        this.confirming[appointmentId] = false;
      }
    });
  }

  /**
   * Get patient name by ID
   */
  getPatientName(patientId: string): string {
    const patient = this.getPatientMatch(patientId);
    if (patient) {
      return patient.fullName || 
        (patient.firstName && patient.lastName ? `${patient.firstName} ${patient.lastName}` : null) ||
        patient.username || 
        'Unknown Patient';
    }
    return 'Unknown Patient';
  }

  /**
   * Format appointment date for display
   */
  formatAppointmentDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Check if data is still loading
   */
  isLoading(): boolean {
    return this.loading.patients || this.loading.appointments || this.loading.medications;
  }

  private resetDashboardPaging(): void {
    this.nextAppointmentsPage = 1;
    this.patientQueuePage = 1;
  }

  private compareRequestedAppointments(a: Appointment, b: Appointment): number {
    const urgentRankA = this.schedulingService.isUrgentAppointment(a) ? 1 : 0;
    const urgentRankB = this.schedulingService.isUrgentAppointment(b) ? 1 : 0;

    if (urgentRankA !== urgentRankB) {
      return urgentRankB - urgentRankA; // urgent first
    }

    const priorityDelta = this.schedulingService.getPriorityRank(b.priority) - this.schedulingService.getPriorityRank(a.priority);
    if (priorityDelta !== 0) {
      return priorityDelta;
    }

    return new Date(a.startAt).getTime() - new Date(b.startAt).getTime();
  }

  private clampPage(page: number, totalPages: number): number {
    return Math.min(Math.max(page, 1), totalPages);
  }

  private buildPageNumbers(totalPages: number, currentPage: number): number[] {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    const start = Math.max(1, currentPage - 2);
    const end = Math.min(totalPages, start + 4);
    const adjustedStart = Math.max(1, end - 4);

    return Array.from({ length: end - adjustedStart + 1 }, (_, index) => adjustedStart + index);
  }
}
