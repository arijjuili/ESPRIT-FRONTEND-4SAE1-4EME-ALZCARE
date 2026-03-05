import { Component, OnInit } from '@angular/core';
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
  MedicationIntake
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
    private medicalService: MedicalFollowupService
  ) {}

  ngOnInit(): void {
    const currentUser = this.authService.getCurrentUser();

    if (currentUser) {
      this.patientName = currentUser.name || 'Patient';
      this.patientId = currentUser.id;
      console.log('[PatientDashboard] Loaded patient:', this.patientId);
      this.loadDashboardData();
    } else {
      this.error = 'Please log in to view your dashboard';
      this.loading = { appointments: false, medications: false, tasks: false, intakes: false };
    }
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

    // Get date range (today to 30 days ahead for appointments)
    const today = new Date();
    const thirtyDaysLater = new Date();
    thirtyDaysLater.setDate(today.getDate() + 30);

    const fromDate = today.toISOString();
    const toDate = thirtyDaysLater.toISOString();

    console.log('[PatientDashboard] patientId:', this.patientId);

    forkJoin({
      appointments: this.medicalService
        .getPatientAppointments(this.patientId, fromDate, toDate)
        .pipe(catchError(() => of([]))),
      medicationPlans: this.medicalService
        .getPatientMedicationPlans(this.patientId)
        .pipe(catchError(() => of([]))),
      todaysIntakes: this.medicalService
        .getTodaysMedicationIntakes(this.patientId)
        .pipe(catchError(() => of([])))
    }).subscribe({
      next: (data) => {
        this.appointments = data.appointments;
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
}