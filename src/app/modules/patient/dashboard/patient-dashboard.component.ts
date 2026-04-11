import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';
import { DataService } from '../../../core/services/data.service';
import { AlertCardComponent } from '../../../shared/components/alert-card.component';
import { AppointmentRequestCardComponent } from '../../../shared/components/appointment-request-card.component';
import { NotificationBellComponent } from '../../../shared/components/notification-bell/notification-bell.component';
import { RoleTheme } from '../../../shared/components/navbar.component';
import { HealthMetric, UserRole } from '../../../core/models/user.model';
import { Appointment } from '../../../core/models/medical-followup.model';

@Component({
  selector: 'app-patient-dashboard',
  standalone: true,
  imports: [CommonModule, AlertCardComponent, AppointmentRequestCardComponent, NotificationBellComponent],
  templateUrl: './patient-dashboard.component.html',
  styleUrls: ['./patient-dashboard.component.scss']
})
export class PatientDashboardComponent implements OnInit {
  patientName = '';
  patientId: string | null = null;
  fallbackDoctorId = '';
  
  // Role theme for notification bell (teal for patient)
  currentTheme: RoleTheme = {
    name: 'Patient',
    primary: '#14b8a6',
    primaryLight: '#f0fdfa',
    primaryDark: '#0f766e',
    gradientFrom: '#14b8a6',
    gradientTo: '#0d9488',
    borderColor: '#ccfbf1',
    hoverBg: '#ccfbf1',
    activeBg: '#14b8a6',
    activeText: '#ffffff'
  };
  appointments: any[] = [];
  medications: any[] = [];
  todayTasks: any[] = [];
  healthMetrics: HealthMetric[] = [];
  completedTasksCount = 0;

  constructor(private authService: AuthService, private dataService: DataService) {}

  ngOnInit(): void {
    const currentUser = this.authService.getCurrentUser();
    
    if (currentUser) {
      this.patientName = currentUser.name;
      this.patientId = currentUser.id || null;
      
      // Get patient data (assuming patient 1 for demo)
      const patient = this.dataService.getPatients()[0];
      if (patient) {
        this.medications = patient.currentMedications;
        this.appointments = this.dataService.getAppointments(patient.id);
        const firstDoctorId = this.appointments.find(a => !!a.doctorId)?.doctorId;
        this.fallbackDoctorId = firstDoctorId ? String(firstDoctorId) : '3';
        this.todayTasks = this.dataService.getTasks(patient.id).filter(t => {
          const today = new Date();
          const taskDate = new Date(t.dueDate);
          return taskDate.toDateString() === today.toDateString();
        });
        this.healthMetrics = this.dataService.getHealthMetrics(patient.id);
        this.updateCompletedCount();
      }
    }
  }

  toggleTask(taskId: string): void {
    const task = this.todayTasks.find(t => t.id === taskId);
    if (task) {
      task.completed = !task.completed;
      this.dataService.updateTaskStatus(taskId, task.completed);
      this.updateCompletedCount();
    }
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
  handleAppointmentRequestCreated(appointment: Appointment): void {
    const mappedAppointment = {
      id: String(appointment.id ?? `req-${Date.now()}`),
      patientId: this.patientId || 'p1',
      doctorId: String((appointment.doctorId ?? this.fallbackDoctorId) || ''),
      date: appointment.startAt ? new Date(appointment.startAt) : new Date(),
      type: appointment.type || 'Appointment',
      notes: 'Appointment request submitted',
      status: String(appointment.status || 'requested').toLowerCase()
    };

    this.appointments = [...this.appointments, mappedAppointment].sort(
      (left, right) => new Date(left.date).getTime() - new Date(right.date).getTime()
    );
  }
}

