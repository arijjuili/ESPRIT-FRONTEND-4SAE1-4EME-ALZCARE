import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { DailyCareService } from '../../../core/services/daily-care.service';
import { AuthService } from '../../../core/services/auth.service';
import { Habit, HabitTask, HabitType, AutonomyMode } from '../../../core/models/daily-care.model';

@Component({
  selector: 'app-patient-routines',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './patient-routines.component.html',
  styleUrls: ['./patient-routines.component.scss']
})
export class PatientRoutinesComponent implements OnInit, OnDestroy {
  habits: Habit[] = [];
  filteredHabits: Habit[] = [];

  searchTerm = '';
  filterType: HabitType | 'ALL' = 'ALL';
  loading = false;
  error = '';

  private destroy$ = new Subject<void>();

  constructor(
    private dailyCareService: DailyCareService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadHabits();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadHabits(): void {
    this.loading = true;
    this.error = '';

    const patientId = this.authService.getCurrentUserId();
    if (!patientId) {
      this.error = 'Missing patient identity. Please log in again.';
      this.loading = false;
      return;
    }

    this.dailyCareService.getAssignedHabitsForPatient(patientId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (habits) => {
          this.habits = habits.map(h => ({
            ...h,
            tasks: h.tasks || []
          }));
          this.applyFilter();
          this.loading = false;
        },
        error: () => {
          this.error = 'Failed to load habits. Make sure the backend is running.';
          this.loading = false;
        }
      });
  }

  applyFilter(): void {
    let result = [...this.habits];

    if (this.filterType !== 'ALL') {
      result = result.filter(h => h.type === this.filterType);
    }

    const query = this.searchTerm.trim().toLowerCase();
    if (query) {
      result = result.filter(h => h.name.toLowerCase().includes(query));
    }

    this.filteredHabits = result;
  }

  getTasksForHabit(habit: Habit): HabitTask[] {
    return habit.tasks || [];
  }

  getTypeLabel(type: HabitType): string {
    switch (type) {
      case 'MORNING': return 'Morning';
      case 'EVENING': return 'Evening';
      case 'ACTIVITY': return 'Activity';
      default: return type;
    }
  }

  getTypeClass(type: HabitType): string {
    switch (type) {
      case 'MORNING': return 'bg-amber-100 text-amber-700';
      case 'EVENING': return 'bg-indigo-100 text-indigo-700';
      case 'ACTIVITY': return 'bg-emerald-100 text-emerald-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  }

  getAutonomyClass(mode: AutonomyMode): string {
    switch (mode) {
      case 'INDEPENDENT': return 'bg-green-100 text-green-700';
      case 'ASSISTED': return 'bg-yellow-100 text-yellow-700';
      case 'DEPENDENT': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  }

  get activeCount(): number {
    return this.habits.filter(h => h.active).length;
  }

  get totalTasks(): number {
    return this.habits.reduce((count, h) => count + (h.tasks?.length || 0), 0);
  }

  get criticalTasks(): number {
    return this.habits.reduce((count, h) =>
      count + (h.tasks?.filter(t => t.isCritical).length || 0), 0);
  }
}
