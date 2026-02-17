import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataService } from '../../../core/services/data.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-patient-activities',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './patient-activities.component.html',
  styleUrls: ['./patient-activities.component.scss']
})
export class PatientActivitiesComponent implements OnInit {
  todayTasks: any[] = [];

  constructor(private dataService: DataService, private authService: AuthService) {}

  ngOnInit(): void {
    const currentUser = this.authService.getCurrentUser();
    if (currentUser) {
      const patient = this.dataService.getPatients()[0];
      if (patient) {
        this.todayTasks = this.dataService.getTasks(patient.id).filter(t => {
          const today = new Date();
          const taskDate = new Date(t.dueDate);
          return taskDate.toDateString() === today.toDateString();
        });
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
}
