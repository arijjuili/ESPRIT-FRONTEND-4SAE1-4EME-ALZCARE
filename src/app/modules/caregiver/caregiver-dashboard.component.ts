import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { DataService } from '../../core/services/data.service';
import { StatCardComponent } from '../../shared/components/stat-card.component';
import { AlertCardComponent } from '../../shared/components/alert-card.component';
import { CareTask } from '../../core/models/user.model';

@Component({
  selector: 'app-caregiver-dashboard',
  standalone: true,
  imports: [CommonModule, StatCardComponent, AlertCardComponent],
  templateUrl: './caregiver-dashboard.component.html',
  styleUrls: ['./caregiver-dashboard.component.scss']
})
export class CaregiverDashboardComponent implements OnInit {
  caregiverName = '';
  patients: any[] = [];
  allTasks: CareTask[] = [];

  constructor(private authService: AuthService, private dataService: DataService) {}

  ngOnInit(): void {
    const currentUser = this.authService.getCurrentUser();
    
    if (currentUser) {
      this.caregiverName = currentUser.name;
      
      // Get all patients
      this.patients = this.dataService.getPatients();
      
      // Get tasks assigned to this caregiver
      this.allTasks = this.dataService.getTasksForCaregiver(currentUser.id);
    }
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
    return patient ? patient.name : 'Unknown';
  }
}
