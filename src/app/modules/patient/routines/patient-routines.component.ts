import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { takeUntil } from 'rxjs/operators';
import { DailyCareService } from '../../../core/services/daily-care.service';
import { AuthService } from '../../../core/services/auth.service';
import { PatientService } from '../../../core/services/patient.service';
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
    private authService: AuthService,
    private patientService: PatientService
  ) { }

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

    const userId = this.authService.getCurrentUserId();
    const currentUser = this.authService.getCurrentUser();
    const token = this.authService.getAccessToken();
    console.log('[PatientRoutines][STEP 1] Current user object:', currentUser);
    console.log('[PatientRoutines][STEP 2] Current User ID from auth service:', userId);
    console.log('[PatientRoutines][STEP 3] Access token exists:', !!token, '| token length:', token?.length || 0);
    console.log('[PatientRoutines][STEP 4] localStorage.mockHabitAssignments(raw):', localStorage.getItem('mockHabitAssignments'));
    console.log('[PatientRoutines][STEP 5] localStorage.mockAllHabits(raw length):', localStorage.getItem('mockAllHabits')?.length || 0);

    if (!userId) {
      this.error = 'Missing patient identity. Please log in again.';
      this.loading = false;
      return;
    }

    console.log('[PatientRoutines] Resolving patient profile for robust assignment lookup...');
    this.patientService.getPatientById(userId).pipe(
      takeUntil(this.destroy$),
      catchError((err) => {
        console.warn('[PatientRoutines][STEP 6] Could not resolve patient profile. Falling back to userId only.', err);
        return of(null);
      }),
      switchMap((profile) => {
        const idsToCheck = profile ? [userId, profile.id] : [userId];
        console.log('[PatientRoutines][STEP 7] Profile lookup result:', profile);
        console.log('[PatientRoutines][STEP 8] Requesting assigned habits for IDs:', idsToCheck);
        // Query by both Keycloak userId and profile id to handle mixed assignment keys.
        return this.dailyCareService.getAssignedHabitsForPatient(idsToCheck, true);
      })
    )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (habits) => {
          console.log('[PatientRoutines][STEP 9] Successfully received habits from service:', habits);
          console.log('[PatientRoutines][STEP 10] Returned habit IDs:', habits.map(h => h.id));
          this.habits = habits.map(h => ({
            ...h,
            tasks: h.tasks || []
          }));
          this.applyFilter();
          console.log('[PatientRoutines][STEP 11] filteredHabits after applyFilter:', this.filteredHabits.map(h => ({ id: h.id, name: h.name, active: h.active })));
          this.loading = false;
        },
        error: (err) => {
          console.error('[PatientRoutines][ERROR] Error fetching habits:', err);
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
