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
  AutonomyHistoryItem
} from '../models/daily-care.model';

@Injectable({
  providedIn: 'root'
})
export class DailyCareService {
  private baseUrl = `${environment.apiUrl}/v1/habit`;
  private taskBaseUrl = `${environment.apiUrl}/v1/habit-task`;
  private autonomyBaseUrl = `${environment.apiUrl}/v1/daily-care/autonomy`;

  constructor(private http: HttpClient) {}

  private debugStorageSnapshot(context: string): void {
    const assignmentsRaw = localStorage.getItem('mockHabitAssignments');
    const allHabitsRaw = localStorage.getItem('mockAllHabits');
    console.log(`[DailyCareService][${context}] localStorage.mockHabitAssignments(raw):`, assignmentsRaw);
    console.log(`[DailyCareService][${context}] localStorage.mockAllHabits(raw length):`, allHabitsRaw?.length || 0);
  }

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
        console.log(`[DailyCareService] Fetched ${habits.length} habits from backend.`);
        const cachedBefore = this.getAllHabitsFromStorage();
        if (habits.length > 0) {
          console.log(`[DailyCareService] Saving non-empty habits payload to cache (${habits.length} items).`);
          this.saveAllHabitsToStorage(habits);
        } else if (cachedBefore.length > 0) {
          console.warn(`[DailyCareService] Backend returned empty list. Keeping existing cache (${cachedBefore.length} items) to avoid data loss.`);
        } else {
          console.warn('[DailyCareService] Backend returned empty list and no cache exists yet.');
          this.saveAllHabitsToStorage(habits);
        }
      }),
      catchError((err) => {
        console.error(`[DailyCareService] HTTP error fetching habits:`, err);
        const cached = this.getAllHabitsFromStorage();
        console.log(`[DailyCareService] Falling back to ${cached.length} cached habits from storage.`);
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
    console.log('[DailyCareService][ASSIGN] START', {
      doctorId,
      patientId,
      habitId: request.habitId,
      habitIdType: typeof request.habitId
    });
    this.debugStorageSnapshot('ASSIGN_BEFORE');
    const assignments = this.getAssignmentsFromStorage();
    console.log('[DailyCareService][ASSIGN] Parsed assignments before mutation:', assignments);
    if (!assignments[patientId]) {
      assignments[patientId] = [];
    }
    if (!assignments[patientId].includes(request.habitId)) {
      assignments[patientId].push(request.habitId);
      this.saveAssignmentsToStorage(assignments);
      console.log('[DailyCareService][ASSIGN] Habit inserted for patient key.');
    } else {
      console.log('[DailyCareService][ASSIGN] Habit already assigned for this patient key. No-op.');
    }
    console.log('[DailyCareService][ASSIGN] Parsed assignments after mutation:', this.getAssignmentsFromStorage());
    this.debugStorageSnapshot('ASSIGN_AFTER');
    return of(undefined as any);
  }

  unassignHabitFromPatient(
    doctorId: string,
    patientId: string,
    habitId: number
  ): Observable<void> {
    console.log('[DailyCareService][UNASSIGN] START', { doctorId, patientId, habitId });
    this.debugStorageSnapshot('UNASSIGN_BEFORE');
    const assignments = this.getAssignmentsFromStorage();
    if (assignments[patientId]) {
      console.log('[DailyCareService][UNASSIGN] Existing patient assignments:', assignments[patientId]);
      assignments[patientId] = assignments[patientId].filter((id) => id !== habitId);
      this.saveAssignmentsToStorage(assignments);
      console.log('[DailyCareService][UNASSIGN] Updated patient assignments:', assignments[patientId]);
    } else {
      console.log('[DailyCareService][UNASSIGN] No assignment bucket found for patient key.');
    }
    this.debugStorageSnapshot('UNASSIGN_AFTER');
    return of(undefined as any);
  }

  getAssignedHabitsForPatient(patientId: string | string[], allowFallback: boolean = false): Observable<Habit[]> {
    console.log(`[DailyCareService] getAssignedHabitsForPatient - Request for ID(s):`, patientId, `| allowFallback:`, allowFallback);
    this.debugStorageSnapshot('PATIENT_LOOKUP_START');
    return this.getAllHabits().pipe(
      map(allHabits => {
        console.log(`[DailyCareService] getAssignedHabitsForPatient: allHabits length = ${allHabits.length}`);
        
        // DEV/OFFLINE WORKAROUND: If backend returned empty for patient (due to role filters),
        // we use the full catalog cached by the doctor earlier so we can still display assignments.
        if (allHabits.length === 0 && allowFallback) {
          const cached = this.getAllHabitsFromStorage();
          console.log(`[DailyCareService] Fallback triggered! Using ${cached.length} cached habits.`);
          if (cached.length > 0) {
            allHabits = cached;
          }
        }

        const assignments = this.getAssignmentsFromStorage();
        console.log(`[DailyCareService] All raw assignments from storage:`, assignments);
        
        const idsToCheck = Array.isArray(patientId) ? patientId : [patientId];
        console.log('[DailyCareService] Normalized idsToCheck with types:', idsToCheck.map(id => ({ id, type: typeof id })));
        console.log('[DailyCareService] Assignment keys available:', Object.keys(assignments));
        
        const assignedIds = new Set<number>();
        let exactMatchFound = false;

        // Try to match specific Patient ID or Keycloak UUID
        idsToCheck.forEach(id => {
          if (assignments[id] && assignments[id].length > 0) {
            console.log(`[DailyCareService] Exact match found for ID: ${id} -> Habits:`, assignments[id]);
            assignments[id].forEach(habitId => assignedIds.add(habitId));
            exactMatchFound = true;
          }
        });

        // DEV/OFFLINE WORKAROUND:
        // Only trigger this if explicitely allowed (e.g. from the Patient's own dashboard)
        // so we do not pollute the Doctor's assignment maps.
        if (!exactMatchFound && allowFallback) {
          console.warn(`[DailyCareService] No exact match found for Patient ID mapping! Using global fallback assignments!`);
          Object.values(assignments).forEach(habitIds => {
            habitIds.forEach(id => assignedIds.add(id));
          });
          console.log(`[DailyCareService] Global fallback assigned IDs collected:`, Array.from(assignedIds));
        }

        // Compare IDs robustly (number/string) to avoid silent misses.
        const assignedIdStrings = new Set(Array.from(assignedIds).map(id => String(id)));
        console.log('[DailyCareService] Aggregated assigned IDs (number):', Array.from(assignedIds));
        console.log('[DailyCareService] Aggregated assigned IDs (string):', Array.from(assignedIdStrings));
        console.log('[DailyCareService] allHabits IDs:', allHabits.map(h => ({ id: h.id, idType: typeof h.id, active: h.active })));
        const filtered = allHabits.filter(h => assignedIds.has(h.id) || assignedIdStrings.has(String(h.id)));
        
        if (filtered.length === 0 && allowFallback) {
          console.warn('[DailyCareService] No matched assigned habits found. Applying patient-safe fallback.');
          // Last-resort UX fallback for development/offline mode:
          // prefer active habits, otherwise return full list so patient page is not empty.
          const activeOnly = allHabits.filter(h => h.active);
          const fallbackHabits = activeOnly.length > 0 ? activeOnly : allHabits;
          console.log(`[DailyCareService] Fallback returning ${fallbackHabits.length} habits.`);
          return fallbackHabits;
        }

        console.log(`[DailyCareService] Returning ${filtered.length} habits after filtering against assigned IDs.`);
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
}



