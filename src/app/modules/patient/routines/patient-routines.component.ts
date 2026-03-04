import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin, of, Subject } from 'rxjs';
import { catchError, takeUntil } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth.service';
import { DailyCareService } from '../../../core/services/daily-care.service';
import { DailyCareTask, DailyRoutine } from '../../../core/models/daily-care.model';

@Component({
  selector: 'app-patient-routines',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './patient-routines.component.html',
  styleUrls: ['./patient-routines.component.scss']
})
export class PatientRoutinesComponent implements OnInit, OnDestroy {
  routines: DailyRoutine[] = [];
  filteredRoutines: DailyRoutine[] = [];
  tasks: DailyCareTask[] = [];

  patientId = '';
  searchTerm = '';
  selectedDate = this.getTodayDate();
  loading = false;
  togglingTaskId: string | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    private authService: AuthService,
    private dailyCareService: DailyCareService
  ) {}

  ngOnInit(): void {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      return;
    }

    this.patientId = currentUser.id;
    this.loadData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadData(): void {
    if (!this.patientId) return;

    this.loading = true;

    forkJoin({
      routines: this.dailyCareService.getRoutines().pipe(catchError(() => of([]))),
      tasks: this.dailyCareService.getPatientDailyTasks(this.patientId, this.selectedDate).pipe(catchError(() => of([])))
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe(({ routines, tasks }) => {
        this.routines = routines;
        this.tasks = tasks;
        this.applyRoutineFilter();
        this.loading = false;
      });
  }

  applyRoutineFilter(): void {
    const query = this.searchTerm.trim().toLowerCase();
    this.filteredRoutines = !query
      ? [...this.routines]
      : this.routines.filter(routine =>
          routine.name.toLowerCase().includes(query) ||
          routine.description.toLowerCase().includes(query)
        );
  }

  getRoutineTasks(routineId: string): DailyCareTask[] {
    return this.tasks.filter(task => task.routineId === routineId);
  }

  getCompletedCount(routineId: string): number {
    return this.getRoutineTasks(routineId).filter(task => task.completed).length;
  }

  getCompletionRate(routineId: string): number {
    const routineTasks = this.getRoutineTasks(routineId);
    if (routineTasks.length === 0) return 0;
    return Math.round((this.getCompletedCount(routineId) / routineTasks.length) * 100);
  }

  get totalTasks(): number {
    return this.tasks.length;
  }

  get completedTasks(): number {
    return this.tasks.filter(task => task.completed).length;
  }

  toggleTask(task: DailyCareTask): void {
    this.togglingTaskId = task.id;

    this.dailyCareService
      .updateTaskStatus(task.id, { completed: !task.completed })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: updatedTask => {
          const index = this.tasks.findIndex(item => item.id === updatedTask.id);
          if (index !== -1) {
            this.tasks[index] = updatedTask;
          }
          this.togglingTaskId = null;
        },
        error: () => {
          this.togglingTaskId = null;
        }
      });
  }

  private getTodayDate(): string {
    return new Date().toISOString().split('T')[0];
  }
}
