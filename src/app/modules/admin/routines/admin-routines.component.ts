import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { DailyCareService } from '../../../core/services/daily-care.service';
import { DailyRoutine } from '../../../core/models/daily-care.model';

@Component({
  selector: 'app-admin-routines',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-routines.component.html',
  styleUrls: ['./admin-routines.component.scss']
})
export class AdminRoutinesComponent implements OnInit, OnDestroy {
  routines: DailyRoutine[] = [];
  filteredRoutines: DailyRoutine[] = [];
  searchTerm = '';
  loading = false;
  togglingRoutineId: string | null = null;

  private destroy$ = new Subject<void>();

  constructor(private dailyCareService: DailyCareService) { }

  ngOnInit(): void {
    this.loadRoutines();
  }

  onSearchChange(): void {
    const query = this.searchTerm.trim().toLowerCase();
    this.filteredRoutines = !query
      ? [...this.routines]
      : this.routines.filter(routine =>
        routine.name.toLowerCase().includes(query) ||
        routine.description.toLowerCase().includes(query)
      );
  }

  toggleRoutine(routineId: string): void {
    this.togglingRoutineId = routineId;
    this.dailyCareService
      .toggleRoutineStatus(routineId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: updated => {
          const index = this.routines.findIndex(item => item.id === updated.id);
          if (index !== -1) {
            this.routines[index] = updated;
          }
          this.onSearchChange();
          this.togglingRoutineId = null;
        },
        error: () => {
          this.togglingRoutineId = null;
        }
      });
  }

  get activeRoutinesCount(): number {
    return this.routines.filter(routine => routine.active).length;
  }

  get totalTasksCount(): number {
    return this.routines.reduce((sum, routine) => sum + routine.taskCount, 0);
  }

  private loadRoutines(): void {
    this.loading = true;
    this.dailyCareService
      .getRoutines()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: routines => {
          this.routines = routines;
          this.onSearchChange();
          this.loading = false;
        },
        error: () => {
          this.routines = [];
          this.filteredRoutines = [];
          this.loading = false;
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
