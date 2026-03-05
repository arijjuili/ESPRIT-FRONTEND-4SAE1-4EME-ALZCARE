import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';
import {
  Habit,
  HabitTask,
  HabitTaskRequest,
  HabitAssignment,
  HabitAssignmentRequest,
  HabitType,
  DailyCareTask,
  DailyCarePriority,
  DailyCareStatus,
  DailyRoutine,
  UpdateTaskStatusRequest
} from '../models/daily-care.model';

@Injectable({
  providedIn: 'root'
})
export class DailyCareService {
  private habitUrl = `${environment.apiUrl}/v1/habit`;
  private taskUrl = `${environment.apiUrl}/v1/habit-task`;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  // ===== REAL BACKEND METHODS (your dailyCare-service) =====

  getAllHabits(): Observable<Habit[]> {
    return this.http.get<Habit[] | { content: Habit[] }>(this.habitUrl).pipe(
      map((response) => this.extractHabits(response))
    );
  }

  getHabitsByType(type: HabitType): Observable<Habit[]> {
    const params = new HttpParams().set('type', type);
    return this.http.get<Habit[] | { content: Habit[] }>(this.habitUrl, { params }).pipe(
      map((response) => this.extractHabits(response))
    );
  }

  getHabitsByActive(active: boolean): Observable<Habit[]> {
    const params = new HttpParams().set('active', active.toString());
    return this.http.get<Habit[] | { content: Habit[] }>(this.habitUrl, { params }).pipe(
      map((response) => this.extractHabits(response))
    );
  }

  getHabitById(id: number): Observable<Habit> {
    return this.http.get<Habit>(`${this.habitUrl}/${id}`);
  }

  getAssignedHabitsForPatient(patientId: string): Observable<Habit[]> {
    return this.http
      .get<Habit[] | { content: Habit[] }>(`${this.habitUrl}/patients/${patientId}`)
      .pipe(map((response) => this.extractHabits(response)));
  }

  assignHabitToPatient(
    doctorId: string,
    patientId: string,
    request: HabitAssignmentRequest
  ): Observable<HabitAssignment> {
    return this.http.post<HabitAssignment>(
      `${this.habitUrl}/doctors/${doctorId}/patients/${patientId}/assignments`,
      request
    );
  }

  unassignHabitFromPatient(doctorId: string, patientId: string, habitId: number): Observable<void> {
    const primaryUrl = `${this.habitUrl}/doctors/${doctorId}/patients/${patientId}/assignments/${habitId}`;
    const fallbackUrl1 = `${this.habitUrl}/doctors/${doctorId}/patients/${patientId}/assignments`;
    const fallbackUrl2 = `${this.habitUrl}/doctors/${doctorId}/assignments/${habitId}`;
    const fallbackUrl3 = `${this.habitUrl}/assignments/${habitId}`;

    return this.http.delete<void>(primaryUrl).pipe(
      catchError((error) => {
        if (error?.status !== 404) return throwError(() => error);

        return this.http.delete<void>(fallbackUrl1, {
          params: new HttpParams().set('habitId', habitId.toString())
        }).pipe(
          catchError((error1) => {
            if (error1?.status !== 404) return throwError(() => error1);

            return this.http.delete<void>(fallbackUrl2, {
              params: new HttpParams().set('patientId', patientId)
            }).pipe(
              catchError((error2) => {
                if (error2?.status !== 404) return throwError(() => error2);

                return this.http.delete<void>(fallbackUrl3, {
                  params: new HttpParams()
                    .set('doctorId', doctorId)
                    .set('patientId', patientId)
                });
              })
            );
          })
        );
      })
    );
  }

  createHabit(habit: Partial<Habit>): Observable<Habit> {
    const unauthorized = this.requireDoctorAccess('create habits');
    if (unauthorized) return unauthorized;
    return this.http.post<Habit>(this.habitUrl, habit);
  }

  updateHabit(id: number, habit: Partial<Habit>): Observable<Habit> {
    const unauthorized = this.requireDoctorAccess('update habits');
    if (unauthorized) return unauthorized;
    return this.http.put<Habit>(`${this.habitUrl}/${id}`, habit);
  }

  toggleHabitActive(id: number, active: boolean): Observable<Habit> {
    const unauthorized = this.requireDoctorAccess('change habit status');
    if (unauthorized) return unauthorized;
    const params = new HttpParams().set('value', active.toString());
    return this.http.patch<Habit>(`${this.habitUrl}/${id}/active`, null, { params });
  }

  deleteHabit(id: number): Observable<void> {
    const unauthorized = this.requireDoctorAccess('delete habits');
    if (unauthorized) return unauthorized;
    return this.http.delete<void>(`${this.habitUrl}/${id}`);
  }

  createTask(task: any): Observable<HabitTask> {
    return this.http.post<HabitTask>(this.taskUrl, task);
  }

  updateTask(id: number, task: HabitTaskRequest): Observable<HabitTask> {
    const unauthorized = this.requireDoctorAccess('update habit tasks');
    if (unauthorized) return unauthorized;
    return this.http.put<HabitTask>(`${this.taskUrl}/${id}`, task);
  }

  deleteTask(id: number): Observable<void> {
    const unauthorized = this.requireDoctorAccess('delete habit tasks');
    if (unauthorized) return unauthorized;
    return this.http.delete<void>(`${this.taskUrl}/${id}`);
  }

  getReadableHabitsForCurrentUser(): Observable<Habit[]> {
    const currentUser = this.authService.getCurrentUser();
    const currentUserId = this.authService.getCurrentUserId();

    if (currentUser?.role === 'patient' && currentUserId) {
      return this.getAssignedHabitsForPatient(currentUserId).pipe(
        catchError(() => of([]))
      );
    }

    return this.getAllHabits().pipe(
      catchError(() => this.getHabitsByActive(true)),
      catchError(() => of([]))
    );
  }

  // ===== LEGACY METHODS (used by admin/caregiver/activities pages) =====

  private mockTasks: DailyCareTask[] = [
    {
      id: 'dt-001',
      patientId: 'demo-patient',
      title: 'Morning medications',
      description: 'Take Donepezil after breakfast',
      dueDate: new Date().toISOString(),
      priority: 'high' as DailyCarePriority,
      completed: false,
      status: 'PENDING' as DailyCareStatus,
      routineId: 'dr-001'
    },
    {
      id: 'dt-002',
      patientId: 'demo-patient',
      title: 'Hydration reminder',
      description: 'Drink one full glass of water',
      dueDate: new Date().toISOString(),
      priority: 'medium' as DailyCarePriority,
      completed: false,
      status: 'PENDING' as DailyCareStatus,
      routineId: 'dr-002'
    }
  ];

  private mockRoutines: DailyRoutine[] = [
    {
      id: 'dr-001',
      name: 'Morning care routine',
      description: 'Wake up, hygiene, breakfast, medications',
      active: true,
      patientCount: 28,
      taskCount: 8,
      scheduleWindow: '06:30 - 10:00'
    },
    {
      id: 'dr-002',
      name: 'Afternoon activities',
      description: 'Hydration, walk, cognitive stimulation',
      active: true,
      patientCount: 31,
      taskCount: 6,
      scheduleWindow: '13:00 - 17:00'
    }
  ];

  getPatientDailyTasks(patientId: string, date?: string): Observable<DailyCareTask[]> {
    return of(this.mockTasks.map(t => ({ ...t, patientId })));
  }

  updateTaskStatus(taskId: string, request: UpdateTaskStatusRequest): Observable<DailyCareTask> {
    const task = this.mockTasks.find(t => t.id === taskId);
    if (task) {
      task.completed = request.completed;
      task.status = (request.completed ? 'COMPLETED' : 'PENDING') as DailyCareStatus;
    }
    return of(task ? { ...task } : {
      id: taskId,
      patientId: 'demo-patient',
      title: 'Unknown task',
      description: '',
      dueDate: new Date().toISOString(),
      priority: 'low' as DailyCarePriority,
      completed: request.completed,
      status: (request.completed ? 'COMPLETED' : 'PENDING') as DailyCareStatus
    });
  }

  getRoutines(): Observable<DailyRoutine[]> {
    return of(this.mockRoutines.map(r => ({ ...r })));
  }

  toggleRoutineStatus(routineId: string): Observable<DailyRoutine> {
    const routine = this.mockRoutines.find(r => r.id === routineId);
    if (routine) {
      routine.active = !routine.active;
    }
    return of(routine ? { ...routine } : {
      id: routineId,
      name: 'Unknown',
      description: '',
      active: false,
      patientCount: 0,
      taskCount: 0
    });
  }

  private requireDoctorAccess(action: string): Observable<never> | null {
    const role = this.authService.getCurrentUser()?.role;
    if (role === 'doctor') {
      return null;
    }

    return throwError(() => new Error(`Unauthorized: only doctors can ${action}.`));
  }

  private extractHabits(response: Habit[] | { content: Habit[] }): Habit[] {
    if (Array.isArray(response)) {
      return response;
    }

    if (response && Array.isArray(response.content)) {
      return response.content;
    }

    return [];
  }
}
