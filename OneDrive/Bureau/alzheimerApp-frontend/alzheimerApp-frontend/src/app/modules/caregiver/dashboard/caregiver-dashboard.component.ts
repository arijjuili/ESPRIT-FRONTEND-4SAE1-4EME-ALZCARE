import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';
import { DataService } from '../../../core/services/data.service';
import { MedicalFollowupService } from '../../../core/services/medical-followup.service';
import { UserManagementService } from '../../../core/services/user-management.service';
import { StatCardComponent } from '../../../shared/components/stat-card.component';
import { AlertCardComponent } from '../../../shared/components/alert-card.component';
import { AppointmentRequestCardComponent } from '../../../shared/components/appointment-request-card.component';
import { CareTask } from '../../../core/models/user.model';
import { Appointment, AppointmentMode, AppointmentStatus } from '../../../core/models/medical-followup.model';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ManagedUser } from '../../../core/models/user-management.model';

@Component({
  selector: 'app-caregiver-dashboard',
  standalone: true,
  imports: [CommonModule, StatCardComponent, AlertCardComponent, AppointmentRequestCardComponent],
  templateUrl: './caregiver-dashboard.component.html',
  styleUrls: ['./caregiver-dashboard.component.scss']
})
export class CaregiverDashboardComponent implements OnInit {
  caregiverName = '';
  caregiverId: string | null = null;
  patients: any[] = [];
  allTasks: CareTask[] = [];
  
  // Appointments for patients under care
  patientAppointments: Map<string, Appointment[]> = new Map();
  loadingAppointments = false;

  constructor(
    private authService: AuthService,
    private dataService: DataService,
    private medicalService: MedicalFollowupService,
    private userService: UserManagementService
  ) {}

  ngOnInit(): void {
    const currentUser = this.authService.getCurrentUser();
    
    if (currentUser) {
      this.caregiverName = currentUser.name;
      this.caregiverId = currentUser.id;

      // Get tasks assigned to this caregiver
      this.allTasks = this.dataService.getTasksForCaregiver(currentUser.id);

      this.loadPatientsForCaregiver();
    }
  }

  private loadPatientsForCaregiver(): void {
    if (!this.caregiverId) {
      this.patients = this.dataService.getPatients();
      this.loadPatientAppointments();
      return;
    }

    this.userService.getPatientsForCaregiver(this.caregiverId).pipe(
      catchError((err) => {
        console.warn('[CaregiverDashboard] Falling back to local patients for caregiver dashboard', err);
        return of([] as ManagedUser[]);
      })
    ).subscribe({
      next: (patients) => {
        this.patients = patients.length > 0
          ? patients.map(patient => this.mapManagedPatient(patient))
          : this.dataService.getPatients();
        this.loadPatientAppointments();
      },
      error: () => {
        this.patients = this.dataService.getPatients();
        this.loadPatientAppointments();
      }
    });
  }

  /**
   * Load appointments for all patients under care
   */
  loadPatientAppointments(): void {
    if (this.patients.length === 0) return;
    
    this.loadingAppointments = true;
    
    // Get date range (today to 30 days ahead)
    const today = new Date();
    const thirtyDaysLater = new Date();
    thirtyDaysLater.setDate(today.getDate() + 30);
    const fromDate = today.toISOString();
    const toDate = thirtyDaysLater.toISOString();
    
    // Load appointments for each patient
    const appointmentRequests = this.patients.map(patient => 
      this.medicalService.getPatientAppointments(patient.id, fromDate, toDate)
        .pipe(catchError(() => of([])))
    );
    
    forkJoin(appointmentRequests).subscribe({
      next: (appointmentsArray) => {
        this.patients.forEach((patient, index) => {
          this.patientAppointments.set(patient.id, appointmentsArray[index]);
        });
        this.loadingAppointments = false;
      },
      error: () => {
        this.loadingAppointments = false;
      }
    });
  }

  /**
   * Get all upcoming appointments across all patients
   */
  getAllUpcomingAppointments(): { appointment: Appointment; patientName: string }[] {
    const allAppointments: { appointment: Appointment; patientName: string }[] = [];
    const now = new Date();
    
    this.patientAppointments.forEach((appointments, patientId) => {
      const patient = this.patients.find(p => p.id === patientId);
      const patientName = patient ? patient.name : 'Unknown';
      
      appointments
        .filter(appt =>
          new Date(appt.startAt) >= now &&
          appt.status !== AppointmentStatus.CANCELLED &&
          appt.status !== AppointmentStatus.REJECTED
        )
        .forEach(appointment => {
          allAppointments.push({ appointment, patientName });
        });
    });
    
    // Sort by date
    return allAppointments.sort((a, b) => 
      new Date(a.appointment.startAt).getTime() - new Date(b.appointment.startAt).getTime()
    );
  }

  toggleTask(taskId: string): void {
    const task = this.allTasks.find(t => t.id === taskId);
    if (task) {
      task.completed = !task.completed;
      this.dataService.updateTaskStatus(taskId, task.completed);
    }
  }

  getPatientName(patientId: string): string {
    const patient = this.patients.find(p => p.id === patientId);
    if (patient) {
      return patient.name;
    }

    return this.dataService.getPatientById(patientId)?.name || 'Unknown';
  }

  getAppointmentsForPatient(patientId: string): Appointment[] {
    return this.patientAppointments.get(patientId) || [];
  }

  handleAppointmentRequestCreated(patientId: string, appointment: Appointment): void {
    const existingAppointments = this.patientAppointments.get(patientId) || [];
    this.patientAppointments.set(
      patientId,
      [...existingAppointments, appointment].sort(
        (left, right) => new Date(left.startAt).getTime() - new Date(right.startAt).getTime()
      )
    );
  }

  // ==================== TELECONSULTATION HELPERS ====================

  isOnlineAppointment(appointment: Appointment): boolean {
    return appointment.mode === AppointmentMode.ONLINE;
  }

  isTeleconsultationActive(appointment: Appointment): boolean {
    return appointment.mode === AppointmentMode.ONLINE && 
           appointment.status === AppointmentStatus.CONFIRMED &&
           !!appointment.meetingUrl;
  }

  isTeleconsultationPending(appointment: Appointment): boolean {
    return appointment.mode === AppointmentMode.ONLINE && 
           (appointment.status === AppointmentStatus.REQUESTED ||
            appointment.status === AppointmentStatus.ACCEPTED);
  }

  isAppointmentCancelled(appointment: Appointment): boolean {
    return appointment.status === AppointmentStatus.CANCELLED;
  }

  /**
   * Join Jitsi meeting in a new tab
   * Le meetingUrl est fourni par le backend quand le RDV est CONFIRMÉ
   */
  joinMeeting(url: string | undefined): void {
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      alert('No meeting link available. Waiting for doctor confirmation.');
    }
  }

  getModeBadgeClass(mode: AppointmentMode): string {
    return mode === AppointmentMode.ONLINE 
      ? 'bg-purple-100 text-purple-700 border-purple-200'
      : 'bg-blue-100 text-blue-700 border-blue-200';
  }

  getModeIcon(mode: AppointmentMode): string {
    return mode === AppointmentMode.ONLINE ? '💻' : '🏥';
  }

  getAppointmentStatusClass(status: AppointmentStatus): string {
    const classes: Record<AppointmentStatus, string> = {
      [AppointmentStatus.REQUESTED]: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      [AppointmentStatus.ACCEPTED]: 'bg-blue-100 text-blue-700 border-blue-200',
      [AppointmentStatus.REJECTED]: 'bg-red-100 text-red-700 border-red-200',
      [AppointmentStatus.CONFIRMED]: 'bg-green-100 text-green-700 border-green-200',
      [AppointmentStatus.COMPLETED]: 'bg-gray-100 text-gray-700 border-gray-200',
      [AppointmentStatus.CANCELLED]: 'bg-gray-200 text-gray-600 border-gray-300'
    };
    return classes[status] || 'bg-gray-100 text-gray-700';
  }

  formatAppointmentDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleString('fr-FR', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  private mapManagedPatient(patient: ManagedUser): any {
    const profile = (patient.profile || {}) as Record<string, string>;
    const displayName = patient.fullName
      || `${patient.firstName || ''} ${patient.lastName || ''}`.trim()
      || patient.username
      || patient.email
      || 'Patient';

    return {
      id: patient.id,
      name: displayName,
      email: patient.email || 'Not available',
      phone: profile['phone'] || 'Not provided',
      condition: profile['culturalContext'] || 'Patient under care',
      emergencyContact: profile['emergencyContact'] || 'Not provided'
    };
  }
}
