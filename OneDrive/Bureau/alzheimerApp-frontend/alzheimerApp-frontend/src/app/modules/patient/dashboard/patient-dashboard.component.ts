import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth.service';
import { MedicalFollowupService } from '../../../core/services/medical-followup.service';
import { AlertCardComponent } from '../../../shared/components/alert-card.component';
import {
  Appointment,
  MedicationPlan,
  PlanStatus,
  IntakeStatus,
  MedicationIntake,
  AppointmentMode,
  AppointmentStatus
} from '../../../core/models/medical-followup.model';

@Component({
  selector: 'app-patient-dashboard',
  standalone: true,
  imports: [CommonModule, AlertCardComponent],
  templateUrl: './patient-dashboard.component.html',
  styleUrls: ['./patient-dashboard.component.scss']
})
export class PatientDashboardComponent implements OnInit {
  patientName = '';
  patientId: string | null = null;

  // Data
  appointments: Appointment[] = [];
  medicationPlans: MedicationPlan[] = [];
  todayTasks: any[] = [];

  // ✅ any[] because we enrich with itemName/dosage
  todaysIntakes: any[] = [];

  // Toggle between Today and All medication views
  selectedMedicationView: 'TODAY' | 'ALL' = 'TODAY';

  // Enum for template
  IntakeStatus = IntakeStatus;

  // Loading states
  loading = {
    appointments: true,
    medications: true,
    tasks: true,
    intakes: true
  };

  // Error handling
  error: string | null = null;

  completedTasksCount = 0;

  constructor(
    private authService: AuthService,
    private medicalService: MedicalFollowupService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    console.log('[PatientDashboard] currentUser:', user);

    if (!user?.id) {
      this.error = 'No authenticated user found';
      this.loading = { appointments: false, medications: false, tasks: false, intakes: false };
      return;
    }

    this.patientName = user.name || 'Patient';
    this.patientId = user.id; // Same as PatientMedicationsComponent
    console.log('[PatientDashboard] Using patientId:', this.patientId);
    this.loadDashboardData();
  }

  /**
   * Load all dashboard data
   */
  loadDashboardData(): void {
    if (!this.patientId) {
      this.error = 'Patient ID not available';
      this.loading = { appointments: false, medications: false, tasks: false, intakes: false };
      return;
    }

    this.loading = { appointments: true, medications: true, tasks: true, intakes: true };
    this.error = null;

    // Get date range (today to 90 days ahead for appointments)
    const today = new Date();
    const ninetyDaysLater = new Date();
    ninetyDaysLater.setDate(today.getDate() + 90);

    // Format dates without timezone (for LocalDateTime compatibility)
    const formatLocalDateTime = (date: Date): string => {
      return date.toISOString().replace('Z', '');
    };

    const fromDate = formatLocalDateTime(today);
    const toDate = formatLocalDateTime(ninetyDaysLater);

    console.log('[PatientDashboard] patientId:', this.patientId);

    console.log('[PatientDashboard] Loading appointments for patient:', this.patientId);
    console.log('[PatientDashboard] Date range:', fromDate, 'to', toDate);

    forkJoin({
      appointments: this.medicalService
        .getPatientAppointments(this.patientId, fromDate, toDate)
        .pipe(catchError((err) => {
          console.error('[PatientDashboard] Error loading appointments:', err);
          return of([]);
        })),
      medicationPlans: this.medicalService
        .getPatientMedicationPlans(this.patientId)
        .pipe(catchError(() => of([]))),
      todaysIntakes: this.medicalService
        .getTodaysMedicationIntakes(this.patientId)
        .pipe(catchError(() => of([])))
    }).subscribe({
      next: (data) => {
        this.appointments = data.appointments;
        console.log('[PatientDashboard] Appointments loaded for this patient:', this.appointments);
        console.log('[PatientDashboard] Expected patientId:', this.patientId);
        this.medicationPlans = data.medicationPlans;

        // ✅ raw + enrich
        this.todaysIntakes = this.enrichTodaysIntakes(data.todaysIntakes as MedicationIntake[]);

        console.log(
          '[PatientDashboard] Loaded',
          data.appointments.length,
          'appointments and',
          data.medicationPlans.length,
          'medication plans'
        );
        console.log('[PatientDashboard] Loaded', data.todaysIntakes.length, 'todays intakes');

        this.generateTodayTasks();
        this.loading = { appointments: false, medications: false, tasks: false, intakes: false };
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading dashboard data:', err);
        this.error = 'Failed to load dashboard data';
        this.loading = { appointments: false, medications: false, tasks: false, intakes: false };
      }
    });
  }

  /**
   * ✅ Enrich intakes (/today) with medication name/dosage using plans data
   * Join key: intake.id
   */
  private enrichTodaysIntakes(intakes: MedicationIntake[]): any[] {

  const intakeIdToItem = new Map<number, any>();

  this.medicationPlans.forEach(plan => {
    plan.items?.forEach(item => {

      item.intakes?.forEach(i => {

        if (i.id !== undefined) {
          intakeIdToItem.set(i.id, item);
        }

      });

    });
  });

  return intakes.map(i => {

    const item = i.id !== undefined ? intakeIdToItem.get(i.id) : null;

    return {
      ...i,
      itemName: item?.name ?? 'Medication',
      dosage: item?.dosage ?? ''
    };

  });

}

  /**
   * Generate today's tasks based on today's intakes + appointments
   */
  generateTodayTasks(): void {
    const tasks: any[] = [];

    // ✅ 1) Tasks from today's intakes endpoint
    this.todaysIntakes
      .filter((intake: any) => intake.status === IntakeStatus.PENDING)
      .forEach((intake: any) => {
        const itemName = intake.itemName || 'Medication';
        const dosage = intake.dosage || '';

        tasks.push({
          id: `med-${intake.id}`,
          title: `Take ${itemName}`,
          description: `${dosage} at ${this.formatTime(intake.scheduledAt)}`,
          completed: false,
          dueDate: new Date(intake.scheduledAt),
          type: 'medication',
          intakeId: intake.id
        });
      });

    // ✅ 2) Appointments
    this.appointments
      .filter(appt => new Date(appt.startAt) > new Date())
      .slice(0, 2)
      .forEach(appt => {
        tasks.push({
          id: `appt-${appt.id}`,
          title: `Appointment: ${appt.type}`,
          description: `${appt.mode} • ${this.formatTime(appt.startAt)}`,
          completed: false,
          dueDate: new Date(appt.startAt),
          type: 'appointment'
        });
      });

    // ✅ 3) Default tasks only if no tasks
    if (tasks.length === 0) {
      tasks.push(
        {
          id: 'bp-1',
          title: 'Record Blood Pressure',
          description: 'Check and log your vitals',
          completed: false,
          dueDate: new Date(),
          type: 'health'
        },
        {
          id: 'walk-1',
          title: '30-Minute Walk',
          description: 'Light exercise for better health',
          completed: false,
          dueDate: new Date(),
          type: 'health'
        }
      );
    }

    this.todayTasks = tasks.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
    this.updateCompletedCount();
  }

  toggleTask(taskId: string): void {
    const task = this.todayTasks.find(t => t.id === taskId);
    if (task) {
      task.completed = !task.completed;

      if (task.type === 'medication' && task.completed && task.intakeId) {
        this.markMedicationAsTaken(task);
      }

      this.updateCompletedCount();
    }
  }

  private markMedicationAsTaken(task: any): void {
    const updateRequest = {
      status: IntakeStatus.TAKEN,
      confirmedAt: new Date().toISOString(),
      notes: 'Confirmed via dashboard'
    };

    this.medicalService.updateMedicationIntake(task.intakeId, updateRequest).subscribe({
      next: () => console.log('[PatientDashboard] Medication marked as taken:', task.title),
      error: (err) => console.error('[PatientDashboard] Failed to mark medication as taken:', err)
    });
  }

  getProgressPercentage(): number {
    if (this.todayTasks.length === 0) return 0;
    return (this.completedTasksCount / this.todayTasks.length) * 100;
  }

  private updateCompletedCount(): void {
    this.completedTasksCount = this.todayTasks.filter(t => t.completed).length;
  }

  getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning! 🌅 Hope you had a good sleep.';
    if (hour < 17) return 'Good afternoon! ☀️ Keep taking care of yourself.';
    return 'Good evening! 🌙 Relax and enjoy your evening.';
  }

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

  formatTime(dateStr: string): string {
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatTimeOnly(dateStr: string): string {
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  }

  getStatusBadgeClass(status: IntakeStatus): string {
    switch (status) {
      case IntakeStatus.PENDING:
        return 'bg-yellow-100 text-yellow-800';
      case IntakeStatus.TAKEN:
        return 'bg-green-100 text-green-800';
      case IntakeStatus.MISSED:
        return 'bg-red-100 text-red-800';
      case IntakeStatus.REFUSED:
        return 'bg-gray-100 text-gray-800';
      case IntakeStatus.DELAYED:
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  getUpcomingAppointments(): Appointment[] {
    const now = new Date();
    return this.appointments
      .filter(appt => new Date(appt.startAt) >= now)
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
      .slice(0, 3);
  }

  /**
   * Get ALL appointments (upcoming and past) sorted by date
   */
  getAllAppointments(): Appointment[] {
    return this.appointments
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
  }

  /**
   * Calculate duration in minutes between two dates
   */
  getDurationMinutes(startAt: string, endAt: string): number {
    const start = new Date(startAt).getTime();
    const end = new Date(endAt).getTime();
    return Math.round((end - start) / 60000);
  }

  getActiveMedications(): any[] {
    const medications: any[] = [];

    this.medicationPlans
      .filter(plan => plan.status === PlanStatus.ACTIVE)
      .forEach(plan => {
        plan.items?.forEach(item => {
          medications.push({
            id: item.id,
            name: item.name,
            dosage: item.dosage,
            frequency: item.frequency,
            prescribedBy: plan.doctorId ? 'Doctor' : 'Unknown',
            isHighRisk: item.isHighRisk,
            stockQuantity: item.stockQuantity,
            lowThreshold: item.lowThreshold
          });
        });
      });

    return medications;
  }

  getTodayPendingMedications(): number {
    let count = 0;
    const today = new Date().toDateString();

    this.medicationPlans
      .filter(plan => plan.status === PlanStatus.ACTIVE)
      .forEach(plan => {
        plan.items?.forEach(item => {
          item.intakes?.forEach(intake => {
            const intakeDate = new Date(intake.scheduledAt).toDateString();
            if (intakeDate === today && intake.status === IntakeStatus.PENDING) {
              count++;
            }
          });
        });
      });

    return count;
  }

  isLoading(): boolean {
    return this.loading.appointments || this.loading.medications || this.loading.tasks;
  }

  refreshData(): void {
    this.loadDashboardData();
  }

  // ==================== TELECONSULTATION HELPERS ====================

  /**
   * Check if appointment is an online teleconsultation
   */
  isOnlineAppointment(appointment: Appointment): boolean {
    return appointment.mode === AppointmentMode.ONLINE;
  }

  /**
   * Check if teleconsultation is active and ready to join
   * (ONLINE mode, CONFIRMED status, and has meetingUrl)
   */
  isTeleconsultationActive(appointment: Appointment): boolean {
    return appointment.mode === AppointmentMode.ONLINE && 
           appointment.status === AppointmentStatus.CONFIRMED &&
           !!appointment.meetingUrl;
  }

  /**
   * Check if teleconsultation is pending (ONLINE but not confirmed yet)
   */
  isTeleconsultationPending(appointment: Appointment): boolean {
    return appointment.mode === AppointmentMode.ONLINE && 
           appointment.status === AppointmentStatus.REQUESTED;
  }

  /**
   * Check if appointment is cancelled
   */
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

  /**
   * Get CSS class for appointment mode badge
   */
  getModeBadgeClass(mode: AppointmentMode): string {
    return mode === AppointmentMode.ONLINE 
      ? 'bg-purple-100 text-purple-700 border-purple-200'
      : 'bg-blue-100 text-blue-700 border-blue-200';
  }

  /**
   * Get icon for appointment mode
   */
  getModeIcon(mode: AppointmentMode): string {
    return mode === AppointmentMode.ONLINE ? '💻' : '🏥';
  }

  /**
   * Get CSS class for appointment status badge
   */
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
}