import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth.service';
import { MedicalFollowupService } from '../../../core/services/medical-followup.service';
import { UserManagementService } from '../../../core/services/user-management.service';
import { StatCardComponent } from '../../../shared/components/stat-card.component';
import { AlertCardComponent } from '../../../shared/components/alert-card.component';
import { Appointment, AppointmentStatus, MedicationPlan } from '../../../core/models/medical-followup.model';
import { ManagedUser } from '../../../core/models/user-management.model';

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
  imports: [CommonModule, RouterLink, StatCardComponent, AlertCardComponent],
  templateUrl: './doctor-dashboard.component.html',
  styleUrls: ['./doctor-dashboard.component.scss']
})
export class DoctorDashboardComponent implements OnInit {
  doctorName = '';
  doctorId = '';
  
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

  constructor(
    private authService: AuthService,
    private medicalService: MedicalFollowupService,
    private userService: UserManagementService
  ) {}

  ngOnInit(): void {
    const currentUser = this.authService.getCurrentUser();
    
    if (currentUser) {
      this.doctorName = currentUser.name || 'Doctor';
      this.doctorId = currentUser.id;
      this.loadDashboardData();
    }
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
      return apptDate >= todayStart && apptDate <= todayEnd;
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

  /**
   * Get upcoming appointments (sorted by date)
   */
  getUpcomingAppointments(): Appointment[] {
    const now = new Date();
    return this.appointments
      .filter(appt => new Date(appt.startAt) >= now)
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
      .slice(0, 5); // Top 5 upcoming
  }

  /**
   * Get patient name by ID
   */
  getPatientName(patientId: string): string {
    const patient = this.patients.find(p => p.id === patientId);
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
}
