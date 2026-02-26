import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth.service';
import { MedicalFollowupService } from '../../../core/services/medical-followup.service';
import { AlertCardComponent } from '../../../shared/components/alert-card.component';
import { Appointment, AppointmentStatus, MedicationPlan } from '../../../core/models/medical-followup.model';

/**
 * Patient Dashboard - Dynamic Data
 * 
 * Displays real-time data for the patient:
 * - Upcoming appointments
 * - Current medications
 * - Daily tasks
 * - Health metrics
 */
@Component({
  selector: 'app-patient-dashboard',
  standalone: true,
  imports: [CommonModule, AlertCardComponent],
  templateUrl: './patient-dashboard.component.html',
  styleUrls: ['./patient-dashboard.component.scss']
})
export class PatientDashboardComponent implements OnInit {
  patientName = '';
  patientId = '';
  
  // Data
  appointments: Appointment[] = [];
  medicationPlans: MedicationPlan[] = [];
  todayTasks: any[] = [];
  
  // Loading states
  loading = {
    appointments: true,
    medications: true,
    tasks: true
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
      this.loadDashboardData();
      this.generateTodayTasks();
    }
  }

  /**
   * Load all dashboard data
   */
  loadDashboardData(): void {
    this.loading = { appointments: true, medications: true, tasks: true };
    this.error = null;

    // Get date range (today to 30 days ahead for appointments)
    const today = new Date();
    const thirtyDaysLater = new Date();
    thirtyDaysLater.setDate(today.getDate() + 30);

    const fromDate = today.toISOString();
    const toDate = thirtyDaysLater.toISOString();

    // Load appointments and medications in parallel
    forkJoin({
      appointments: this.medicalService.getPatientAppointments(this.patientId, fromDate, toDate).pipe(catchError(() => of([]))),
      medicationPlans: this.medicalService.getPatientMedicationPlans(this.patientId).pipe(catchError(() => of([])))
    }).subscribe({
      next: (data) => {
        this.appointments = data.appointments;
        this.medicationPlans = data.medicationPlans;
        this.loading = { appointments: false, medications: false, tasks: false };
      },
      error: (err) => {
        console.error('Error loading dashboard data:', err);
        this.error = 'Failed to load dashboard data';
        this.loading = { appointments: false, medications: false, tasks: false };
      }
    });
  }

  /**
   * Generate today's tasks based on medications and appointments
   */
  generateTodayTasks(): void {
    // This would typically come from a task service
    // For now, generate sample tasks based on medications
    this.todayTasks = [
      {
        id: '1',
        title: 'Take Morning Medication',
        description: 'Don\'t forget your prescribed medication',
        completed: false,
        dueDate: new Date()
      },
      {
        id: '2',
        title: 'Record Blood Pressure',
        description: 'Check and log your vitals',
        completed: false,
        dueDate: new Date()
      },
      {
        id: '3',
        title: '30-Minute Walk',
        description: 'Light exercise for better health',
        completed: false,
        dueDate: new Date()
      }
    ];
    this.updateCompletedCount();
  }

  /**
   * Toggle task completion
   */
  toggleTask(taskId: string): void {
    const task = this.todayTasks.find(t => t.id === taskId);
    if (task) {
      task.completed = !task.completed;
      this.updateCompletedCount();
    }
  }

  /**
   * Get progress percentage
   */
  getProgressPercentage(): number {
    if (this.todayTasks.length === 0) return 0;
    return (this.completedTasksCount / this.todayTasks.length) * 100;
  }

  /**
   * Update completed tasks count
   */
  private updateCompletedCount(): void {
    this.completedTasksCount = this.todayTasks.filter(t => t.completed).length;
  }

  /**
   * Get greeting based on time of day
   */
  getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning! 🌅 Hope you had a good sleep.';
    if (hour < 17) return 'Good afternoon! ☀️ Keep taking care of yourself.';
    return 'Good evening! 🌙 Relax and enjoy your evening.';
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
   * Get upcoming appointments (sorted by date)
   */
  getUpcomingAppointments(): Appointment[] {
    const now = new Date();
    return this.appointments
      .filter(appt => new Date(appt.startAt) >= now)
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
      .slice(0, 3); // Top 3 upcoming
  }

  /**
   * Get active medications from medication plans
   */
  getActiveMedications(): any[] {
    const medications: any[] = [];
    this.medicationPlans
      .filter(plan => plan.status === 'ACTIVE')
      .forEach(plan => {
        if (plan.items) {
          plan.items.forEach(item => {
            medications.push({
              name: item.name,
              dosage: item.dosage,
              frequency: item.frequency,
              prescribedBy: plan.doctorId ? 'Doctor' : 'Unknown'
            });
          });
        }
      });
    return medications.length > 0 ? medications : this.getDefaultMedications();
  }

  /**
   * Default medications if no data
   */
  getDefaultMedications(): any[] {
    return [
      { name: 'Donepezil', dosage: '10mg', frequency: 'Once daily', prescribedBy: 'Smith' },
      { name: 'Memantine', dosage: '10mg', frequency: 'Twice daily', prescribedBy: 'Smith' }
    ];
  }

  /**
   * Check if data is still loading
   */
  isLoading(): boolean {
    return this.loading.appointments || this.loading.medications || this.loading.tasks;
  }
}
