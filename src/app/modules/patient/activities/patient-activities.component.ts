import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { DailyCareService } from '../../../core/services/daily-care.service';
import { DailyCareTask } from '../../../core/models/daily-care.model';

@Component({
  selector: 'app-patient-activities',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './patient-activities.component.html',
  styleUrls: ['./patient-activities.component.scss']
})
export class PatientActivitiesComponent implements OnInit, OnDestroy {
  todayTasks: DailyCareTask[] = [];
  loading = false;
  private destroy$ = new Subject<void>();

  constructor(
    private dailyCareService: DailyCareService,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      return;
    }

    this.loading = true;
    this.dailyCareService
      .getPatientDailyTasks(currentUser.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: tasks => {
          this.todayTasks = tasks;
          this.loading = false;
        },
        error: () => {
          this.loading = false;
        }
      });
  }

  toggleTask(taskId: string): void {
    const task = this.todayTasks.find(t => t.id === taskId);
    if (task) {
      const updatedValue = !task.completed;
      this.dailyCareService
        .updateTaskStatus(taskId, { completed: updatedValue })
        .pipe(takeUntil(this.destroy$))
        .subscribe(updatedTask => {
          const index = this.todayTasks.findIndex(t => t.id === updatedTask.id);
          if (index !== -1) {
            this.todayTasks[index] = updatedTask;
          }
        });
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
