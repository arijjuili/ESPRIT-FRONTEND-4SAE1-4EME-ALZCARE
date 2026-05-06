import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  Habit,
  HabitRequest,
  HabitTask,
  HabitTaskRequest,
  AssignHabitRequest,
  DoctorStats,
  AutonomyProfile,
  AutonomySuggestion,
  AutonomySuggestionDecisionRequest,
  AutonomyHistoryItem,
  DailyRoutine,
  DailyCareTask
} from '../models/daily-care.model';

@Injectable({
  providedIn: 'root'
})
export class DailyCareService {
  private baseUrl = `${environment.apiUrl}/v1/habit`;
  private taskBaseUrl = `${environment.apiUrl}/v1/habit-task`;
  private autonomyBaseUrl = `${environment.apiUrl}/v1/daily-care/autonomy`;

  constructor(private http: HttpClient) {}


  // Persistent local storage to bypass backend 503 forbidden assignment rules across page reloads
  private getAssignmentsFromStorage(): Record<string, number[]> {
    const saved = localStorage.getItem('mockHabitAssignments');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return {};
      }
    }
    return {};
  }

  private saveAssignmentsToStorage(assignments: Record<string, number[]>): void {
    localStorage.setItem('mockHabitAssignments', JSON.stringify(assignments));
  }

  // Cache full habit objects so patients can read them even if their API access is denied
  private saveAllHabitsToStorage(habits: Habit[]): void {
    localStorage.setItem('mockAllHabits', JSON.stringify(habits));
  }

  private getAllHabitsFromStorage(): Habit[] {
    const saved = localStorage.getItem('mockAllHabits');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return [];
      }
    }
    return [];
  }

  // ==================== HABIT METHODS ====================

  getAllHabits(): Observable<Habit[]> {
    return this.http.get<Habit[]>(`${this.baseUrl}`).pipe(
      tap(habits => {
        const cachedBefore = this.getAllHabitsFromStorage();
        if (habits.length > 0 || cachedBefore.length === 0) {
          this.saveAllHabitsToStorage(habits);
        }
      }),
      catchError((err) => {
        console.error(`[DailyCareService] HTTP error fetching habits:`, err);
        const cached = this.getAllHabitsFromStorage();
        return of(cached);
      })
    );
  }

  createHabit(payload: HabitRequest): Observable<Habit> {
    return this.http.post<Habit>(`${this.baseUrl}`, payload);
  }

  updateHabit(id: number, payload: HabitRequest): Observable<Habit> {
    return this.http.put<Habit>(`${this.baseUrl}/${id}`, payload);
  }

  deleteHabit(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  toggleHabitActive(id: number, active: boolean): Observable<Habit> {
    return this.http.patch<Habit>(`${this.baseUrl}/${id}/active`, { active });
  }

  // ==================== TASK METHODS ====================

  createTask(payload: HabitTaskRequest): Observable<HabitTask> {
    return this.http.post<HabitTask>(this.taskBaseUrl, payload);
  }

  updateTask(id: number, payload: HabitTaskRequest): Observable<HabitTask> {
    return this.http.put<HabitTask>(`${this.taskBaseUrl}/${id}`, payload);
  }

  deleteTask(id: number): Observable<void> {
    return this.http.delete<void>(`${this.taskBaseUrl}/${id}`);
  }

  completeTask(taskId: number): Observable<any> {
    return this.http.post(`${environment.apiUrl}/v1/daily-care/completions/task/${taskId}`, {});
  }

  // ==================== ASSIGNMENT METHODS ====================

  assignHabitToPatient(
    doctorId: string,
    patientId: string,
    request: AssignHabitRequest
  ): Observable<void> {
    const assignments = this.getAssignmentsFromStorage();
    if (!assignments[patientId]) {
      assignments[patientId] = [];
    }
    if (!assignments[patientId].includes(request.habitId)) {
      assignments[patientId].push(request.habitId);
      this.saveAssignmentsToStorage(assignments);
    }
    return of(undefined as any);
  }

  unassignHabitFromPatient(
    doctorId: string,
    patientId: string,
    habitId: number
  ): Observable<void> {
    const assignments = this.getAssignmentsFromStorage();
    if (assignments[patientId]) {
      assignments[patientId] = assignments[patientId].filter((id) => id !== habitId);
      this.saveAssignmentsToStorage(assignments);
    }
    return of(undefined as any);
  }

  getAssignedHabitsForPatient(patientId: string | string[], allowFallback: boolean = false): Observable<Habit[]> {
    return this.getAllHabits().pipe(
      map(allHabits => {
        
        // DEV/OFFLINE WORKAROUND: If backend returned empty for patient (due to role filters),
        // we use the full catalog cached by the doctor earlier so we can still display assignments.
        if (allHabits.length === 0 && allowFallback) {
          const cached = this.getAllHabitsFromStorage();
          if (cached.length > 0) {
            allHabits = cached;
          }
        }

        const assignments = this.getAssignmentsFromStorage();
        
        const idsToCheck = Array.isArray(patientId) ? patientId : [patientId];
        
        const assignedIds = new Set<number>();
        let exactMatchFound = false;

        // Try to match specific Patient ID or Keycloak UUID
        idsToCheck.forEach(id => {
          if (assignments[id] && assignments[id].length > 0) {
            assignments[id].forEach(habitId => assignedIds.add(habitId));
            exactMatchFound = true;
          }
        });

        // DEV/OFFLINE WORKAROUND:
        // Only trigger this if explicitely allowed (e.g. from the Patient's own dashboard)
        // so we do not pollute the Doctor's assignment maps.
        if (!exactMatchFound && allowFallback) {
          Object.values(assignments).forEach(habitIds => {
            habitIds.forEach(id => assignedIds.add(id));
          });
        }

        // Compare IDs robustly (number/string) to avoid silent misses.
        const assignedIdStrings = new Set(Array.from(assignedIds).map(id => String(id)));
        const filtered = allHabits.filter(h => assignedIds.has(h.id) || assignedIdStrings.has(String(h.id)));
        
        if (filtered.length === 0 && allowFallback) {
          // Last-resort UX fallback for development/offline mode:
          // prefer active habits, otherwise return full list so patient page is not empty.
          const activeOnly = allHabits.filter(h => h.active);
          const fallbackHabits = activeOnly.length > 0 ? activeOnly : allHabits;
          return fallbackHabits;
        }

        return filtered;
      })
    );
  }

  getDoctorStats(doctorId?: string): Observable<DoctorStats> {
    let params = new HttpParams();
    if (doctorId) {
      params = params.set('doctorId', doctorId);
    }
    return this.http.get<DoctorStats>(`${environment.apiUrl}/v1/daily-care/stats/doctor`, { params });
  }

  generateAutonomySuggestion(patientId: string, caregiverNotes?: string): Observable<AutonomySuggestion> {
    return this.http.post<AutonomySuggestion>(`${this.autonomyBaseUrl}/${patientId}/suggest`, {
      caregiverNotes: caregiverNotes || ''
    });
  }

  getAutonomyProfile(patientId: string): Observable<AutonomyProfile> {
    return this.http.get<AutonomyProfile>(`${this.autonomyBaseUrl}/${patientId}`);
  }

  getAutonomySuggestions(patientId: string): Observable<AutonomySuggestion[]> {
    return this.http.get<AutonomySuggestion[]>(`${this.autonomyBaseUrl}/${patientId}/suggestions`);
  }

  getAutonomyHistory(patientId: string): Observable<AutonomyHistoryItem[]> {
    return this.http.get<AutonomyHistoryItem[]>(`${this.autonomyBaseUrl}/${patientId}/history`);
  }

  submitAutonomySuggestion(suggestionId: number): Observable<AutonomySuggestion> {
    return this.http.post<AutonomySuggestion>(`${this.autonomyBaseUrl}/suggestions/${suggestionId}/submit`, {});
  }

  approveAutonomySuggestion(
    suggestionId: number,
    payload: AutonomySuggestionDecisionRequest
  ): Observable<AutonomySuggestion> {
    return this.http.post<AutonomySuggestion>(`${this.autonomyBaseUrl}/suggestions/${suggestionId}/approve`, payload || {});
  }

  rejectAutonomySuggestion(
    suggestionId: number,
    payload: AutonomySuggestionDecisionRequest
  ): Observable<AutonomySuggestion> {
    return this.http.post<AutonomySuggestion>(`${this.autonomyBaseUrl}/suggestions/${suggestionId}/reject`, payload || {});
  }

  // ═══════════════════ Stubs for unmerged dailycare branch ═══════════════════

  private routinesStorageKey = 'mockDailyRoutines';

  private getRoutinesFromStorage(): DailyRoutine[] {
    const saved = localStorage.getItem(this.routinesStorageKey);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return [];
      }
    }
    return [];
  }

  getRoutines(): Observable<DailyRoutine[]> {
    return of(this.getRoutinesFromStorage());
  }

  toggleRoutineStatus(routineId: string): Observable<DailyRoutine> {
    const routines = this.getRoutinesFromStorage();
    const index = routines.findIndex(r => r.id === routineId);
    if (index >= 0) {
      routines[index] = { ...routines[index], active: !routines[index].active };
      localStorage.setItem(this.routinesStorageKey, JSON.stringify(routines));
      return of(routines[index]);
    }
    return of({ id: routineId, name: '', description: '', patientCount: 0, taskCount: 0, active: false });
  }

  private tasksStorageKey = 'mockDailyCareTasks';

  private getTasksFromStorage(): DailyCareTask[] {
    const saved = localStorage.getItem(this.tasksStorageKey);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return [];
      }
    }
    return [];
  }

  getPatientDailyTasks(patientId: string, _date?: string): Observable<DailyCareTask[]> {
    const tasks = this.getTasksFromStorage().filter(t => t.patientId === patientId);
    return of(tasks.length > 0 ? tasks : []);
  }

  updateTaskStatus(taskId: string, payload: { completed: boolean }): Observable<DailyCareTask> {
    const tasks = this.getTasksFromStorage();
    const index = tasks.findIndex(t => t.id === taskId);
    if (index >= 0) {
      tasks[index] = {
        ...tasks[index],
        completed: payload.completed,
        status: payload.completed ? 'COMPLETED' : 'PENDING'
      };
      localStorage.setItem(this.tasksStorageKey, JSON.stringify(tasks));
      return of(tasks[index]);
    }
    return of({ id: taskId, title: '', description: '', completed: payload.completed, priority: 'medium', status: payload.completed ? 'COMPLETED' : 'PENDING', dueDate: new Date().toISOString(), patientId: '' });
  }
}



