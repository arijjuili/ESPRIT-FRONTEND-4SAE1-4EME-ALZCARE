import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { DataService } from '../../core/services/data.service';
import { StatCardComponent } from '../../shared/components/stat-card.component';
import { AlertCardComponent } from '../../shared/components/alert-card.component';
import { Patient, Appointment, CareTask, HealthMetric } from '../../core/models/user.model';

@Component({
  selector: 'app-patient-dashboard',
  standalone: true,
  imports: [CommonModule, StatCardComponent, AlertCardComponent],
  templateUrl: './patient-dashboard-redesign.component.html',
  styleUrls: ['./patient-dashboard-redesign.component.scss']
})
export class PatientDashboardComponent implements OnInit {
  patientName = '';
  appointments: any[] = [];
  medications: any[] = [];
  todayTasks: any[] = [];
  healthMetrics: HealthMetric[] = [];

  constructor(private authService: AuthService, private dataService: DataService) {}

  ngOnInit(): void {
    const currentUser = this.authService.getCurrentUser();
    
    if (currentUser) {
      this.patientName = currentUser.name.split(' ')[0];
      
      const patient = this.dataService.getPatients()[0];
      if (patient) {
        this.medications = patient.currentMedications;
        this.appointments = this.dataService.getAppointments(patient.id);
        this.todayTasks = this.dataService.getTasks(patient.id).filter(t => {
          const today = new Date();
          const taskDate = new Date(t.dueDate);
          return taskDate.toDateString() === today.toDateString();
        });
        this.healthMetrics = this.dataService.getHealthMetrics(patient.id);
      }
    }
  }

  toggleTask(taskId: string): void {
    const task = this.todayTasks.find(t => t.id === taskId);
    if (task) {
      task.completed = !task.completed;
      this.dataService.updateTaskStatus(taskId, task.completed);
    }
  }

  getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning! 🌅 Hope you had a good sleep.';
    if (hour < 17) return 'Good afternoon! ☀️ Keep taking care of yourself.';
    return 'Good evening! 🌙 Relax and enjoy your evening.';
  }
}
