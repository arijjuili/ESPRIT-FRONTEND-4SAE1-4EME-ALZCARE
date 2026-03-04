import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  Habit,
  HabitTask,
  CreateHabitRequest,
  UpdateHabitRequest,
  CreateHabitTaskRequest,
  UpdateHabitTaskRequest,
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
  private apiUrl = `${environment.apiUrl}/v1/daily-care`;
  private habitsUrl = `${this.apiUrl}/habits`;
  private habitTasksUrl = `${this.apiUrl}/habit-tasks`;
  private legacyRoutinesUrl = `${this.apiUrl}/routines`;

  private mockHabits: Habit[] = [
    {
      id: 1,
      name: 'Morning routine',
      type: 'MORNING',
      targetTime: '08:00:00',
      isActive: true,
      createdAt: new Date().toISOString()
    },
    {
      id: 2,
      name: 'Afternoon activity',
      type: 'ACTIVITY',
      targetTime: '14:30:00',
      isActive: true,
      createdAt: new Date().toISOString()
    },
    {
      id: 3,
      name: 'Evening routine',
      type: 'EVENING',
      targetTime: '19:30:00',
      isActive: false,
      createdAt: new Date().toISOString()
    }
  ];

  private mockHabitTasksByHabitId: Record<number, HabitTask[]> = {
    1: [
      {
        id: 101,
        habitId: 1,
        title: 'Take morning medication',
        description: 'Take Donepezil after breakfast',
        orderIndex: 1,
        isCritical: true,
        autonomyMode: 'ASSISTED'
      },
      {
        id: 102,
        habitId: 1,
        title: 'Hydration reminder',
        description: 'Drink one full glass of water',
        orderIndex: 2,
        isCritical: false,
        autonomyMode: 'INDEPENDENT'
      }
    ],
    2: [
      {
        id: 201,
        habitId: 2,
        title: 'Memory exercise',
        description: 'Photo album recall for 20 minutes',
        orderIndex: 1,
        isCritical: false,
        autonomyMode: 'INDEPENDENT'
      }
    ],
    3: [
      {
        id: 301,
        habitId: 3,
        title: 'Prepare for sleep',
        description: 'Start evening wind-down routine',
        orderIndex: 1,
        isCritical: true,
        autonomyMode: 'DEPENDENT'
      }
    ]
  };

  private taskStatusOverrides = new Map<string, UpdateTaskStatusRequest>();

  constructor(private http: HttpClient) { }

  getHabits(): Observable<Habit[]> {
    return this.http.get<Habit[]>(this.habitsUrl).pipe(
      catchError(() => of(this.mockHabits.map(habit => ({ ...habit }))))
    );
  }

  getHabitById(habitId: number): Observable<Habit> {
    return this.http.get<Habit>(`${this.habitsUrl}/${habitId}`).pipe(
      catchError(() => {
        const habit = this.mockHabits.find(item => item.id === habitId);
        return of(habit ? { ...habit } : this.createUnknownHabit(habitId));
      })
    );
  }

  createHabit(request: CreateHabitRequest): Observable<Habit> {
    return this.http.post<Habit>(this.habitsUrl, request).pipe(
      catchError(() => {
        const nextId = this.mockHabits.length > 0
          ? Math.max(...this.mockHabits.map(item => item.id)) + 1
          : 1;
        const habit: Habit = {
          id: nextId,
          name: request.name,
          type: request.type,
          targetTime: request.targetTime,
          isActive: request.isActive ?? true,
          createdAt: new Date().toISOString()
        };
        this.mockHabits.push(habit);
        this.mockHabitTasksByHabitId[nextId] = [];
        return of({ ...habit });
      })
    );
  }

  updateHabit(habitId: number, request: UpdateHabitRequest): Observable<Habit> {
    return this.http.put<Habit>(`${this.habitsUrl}/${habitId}`, request).pipe(
      catchError(() => {
        const index = this.mockHabits.findIndex(item => item.id === habitId);
        if (index === -1) {
          return of(this.createUnknownHabit(habitId));
        }
        this.mockHabits[index] = { ...this.mockHabits[index], ...request };
        return of({ ...this.mockHabits[index] });
      })
    );
  }

  deleteHabit(habitId: number): Observable<void> {
    return this.http.delete<void>(`${this.habitsUrl}/${habitId}`).pipe(
      catchError(() => {
        this.mockHabits = this.mockHabits.filter(item => item.id !== habitId);
        delete this.mockHabitTasksByHabitId[habitId];
        return of(void 0);
      })
    );
  }

  toggleHabitStatus(habitId: number): Observable<Habit> {
    return this.http.patch<Habit>(`${this.habitsUrl}/${habitId}/toggle`, {}).pipe(
      catchError(() => {
        const habit = this.mockHabits.find(item => item.id === habitId);
        if (!habit) {
          return of(this.createUnknownHabit(habitId));
        }
        habit.isActive = !habit.isActive;
        return of({ ...habit });
      })
    );
  }

  getHabitTasks(habitId: number): Observable<HabitTask[]> {
    return this.http.get<HabitTask[]>(`${this.habitsUrl}/${habitId}/tasks`).pipe(
      catchError(() => of(this.getMockHabitTasks(habitId)))
    );
  }

  createHabitTask(habitId: number, request: CreateHabitTaskRequest): Observable<HabitTask> {
    return this.http.post<HabitTask>(`${this.habitsUrl}/${habitId}/tasks`, request).pipe(
      catchError(() => {
        const tasks = this.mockHabitTasksByHabitId[habitId] || [];
        const nextId = tasks.length > 0 ? Math.max(...tasks.map(item => item.id)) + 1 : habitId * 100 + 1;
        const task: HabitTask = {
          id: nextId,
          habitId,
          title: request.title,
          description: request.description,
          orderIndex: request.orderIndex,
          isCritical: request.isCritical,
          autonomyMode: request.autonomyMode
        };
        this.mockHabitTasksByHabitId[habitId] = [...tasks, task];
        return of({ ...task });
      })
    );
  }

  updateHabitTask(taskId: number, request: UpdateHabitTaskRequest): Observable<HabitTask> {
    return this.http.put<HabitTask>(`${this.habitTasksUrl}/${taskId}`, request).pipe(
      catchError(() => {
        const located = this.findMockTaskById(taskId);
        if (!located) {
          const unknownTask: HabitTask = {
            id: taskId,
            title: 'Unknown task',
            description: '',
            orderIndex: 0,
            isCritical: false,
            autonomyMode: 'INDEPENDENT'
          };
          return of({
            ...unknownTask
          });
        }
        located.task = { ...located.task, ...request };
        this.mockHabitTasksByHabitId[located.habitId] = this.mockHabitTasksByHabitId[located.habitId].map(item =>
          item.id === taskId ? located.task : item
        );
        return of({ ...located.task });
      })
    );
  }

  deleteHabitTask(taskId: number): Observable<void> {
    return this.http.delete<void>(`${this.habitTasksUrl}/${taskId}`).pipe(
      catchError(() => {
        Object.keys(this.mockHabitTasksByHabitId).forEach(habitIdKey => {
          const habitId = Number(habitIdKey);
          this.mockHabitTasksByHabitId[habitId] = this.mockHabitTasksByHabitId[habitId].filter(item => item.id !== taskId);
        });
        return of(void 0);
      })
    );
  }

  reorderHabitTasks(habitId: number, orderedTaskIds: number[]): Observable<HabitTask[]> {
    return this.http.put<HabitTask[]>(`${this.habitsUrl}/${habitId}/tasks/reorder`, { orderedTaskIds }).pipe(
      catchError(() => {
        const existing = this.getMockHabitTasks(habitId);
        const byId = new Map(existing.map(item => [item.id, item]));
        const reordered: HabitTask[] = orderedTaskIds
          .map((taskId, index) => {
            const task = byId.get(taskId);
            return task ? { ...task, orderIndex: index + 1 } : null;
          })
          .filter((task): task is HabitTask => task !== null);
        const untouched = existing
          .filter(task => !orderedTaskIds.includes(task.id))
          .map((task, index) => ({ ...task, orderIndex: reordered.length + index + 1 }));
        this.mockHabitTasksByHabitId[habitId] = [...reordered, ...untouched];
        return of(this.getMockHabitTasks(habitId));
      })
    );
  }

  // Legacy API consumed by existing components.
  getPatientDailyTasks(patientId: string, date = this.getDateOnly()): Observable<DailyCareTask[]> {
    const params = new HttpParams().set('date', date);

    return this.http.get<DailyCareTask[]>(`${this.apiUrl}/patients/${patientId}/tasks`, { params }).pipe(
      catchError(() => of(this.getMockTasksForDate(patientId, date)))
    );
  }

  updateTaskStatus(taskId: string, request: UpdateTaskStatusRequest): Observable<DailyCareTask> {
    return this.http.patch<DailyCareTask>(`${this.apiUrl}/tasks/${taskId}/status`, request).pipe(
      catchError(() => {
        this.taskStatusOverrides.set(taskId, request);
        const task = this.getMockTasksForDate('demo-patient', this.getDateOnly()).find(item => item.id === taskId);
        if (!task) {
          return of({
            id: taskId,
            patientId: 'demo-patient',
            title: 'Unknown task',
            description: 'Task not found in local fallback',
            dueDate: new Date().toISOString(),
            priority: 'low' as DailyCarePriority,
            completed: request.completed,
            status: (request.completed ? 'COMPLETED' : 'PENDING') as DailyCareStatus
          });
        }
        return of({
          ...task,
          completed: request.completed,
          status: (request.completed ? 'COMPLETED' : 'PENDING') as DailyCareStatus,
          notes: request.notes ?? task.notes
        });
      })
    );
  }

  getRoutines(): Observable<DailyRoutine[]> {
    return this.getHabits().pipe(map(habits => habits.map(habit => this.mapHabitToRoutine(habit))));
  }

  toggleRoutineStatus(routineId: string): Observable<DailyRoutine> {
    return this.http.patch<DailyRoutine>(`${this.legacyRoutinesUrl}/${routineId}/toggle`, {}).pipe(
      catchError(() => {
        const parsedId = Number(routineId);
        if (Number.isNaN(parsedId)) {
          return of({
            id: routineId,
            name: 'Unknown routine',
            description: 'Routine not found in local fallback',
            active: false,
            patientCount: 0,
            taskCount: 0
          });
        }
        return this.toggleHabitStatus(parsedId).pipe(
          map(habit => this.mapHabitToRoutine(habit))
        );
      })
    );
  }

  private getMockTasksForDate(patientId: string, date: string): DailyCareTask[] {
    const resolvedPatientId = patientId || 'demo-patient';
    const activeHabits = this.mockHabits.filter(habit => habit.isActive);
    const tasks: DailyCareTask[] = [];

    activeHabits.forEach(habit => {
      const habitTasks = this.getMockHabitTasks(habit.id);
      habitTasks.forEach(task => {
        const legacyTaskId = `${habit.id}-${task.id}`;
        const override = this.taskStatusOverrides.get(legacyTaskId);
        const completed = override?.completed ?? false;

        tasks.push({
          id: legacyTaskId,
          patientId: resolvedPatientId,
          title: task.title,
          description: task.description,
          dueDate: this.buildDueDate(date, habit.targetTime),
          priority: this.mapTaskPriority(task),
          completed,
          status: (completed ? 'COMPLETED' : 'PENDING') as DailyCareStatus,
          routineId: String(habit.id),
          notes: override?.notes
        });
      });
    });

    return tasks.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }

  private getDateOnly(): string {
    return new Date().toISOString().split('T')[0];
  }

  private getMockHabitTasks(habitId: number): HabitTask[] {
    return (this.mockHabitTasksByHabitId[habitId] || [])
      .map(task => ({ ...task }))
      .sort((a, b) => a.orderIndex - b.orderIndex);
  }

  private findMockTaskById(taskId: number): { habitId: number; task: HabitTask } | null {
    const entries = Object.entries(this.mockHabitTasksByHabitId);
    for (const [habitIdKey, tasks] of entries) {
      const task = tasks.find(item => item.id === taskId);
      if (task) {
        return { habitId: Number(habitIdKey), task: { ...task } };
      }
    }
    return null;
  }

  private createUnknownHabit(habitId: number): Habit {
    return {
      id: habitId,
      name: 'Unknown habit',
      type: 'ACTIVITY',
      targetTime: '08:00:00',
      isActive: false,
      createdAt: new Date().toISOString()
    };
  }

  private mapHabitToRoutine(habit: Habit): DailyRoutine {
    return {
      id: String(habit.id),
      name: habit.name,
      description: `${habit.type} routine scheduled at ${habit.targetTime}`,
      active: habit.isActive,
      patientCount: 0,
      taskCount: this.getMockHabitTasks(habit.id).length,
      scheduleWindow: habit.targetTime,
      createdAt: habit.createdAt
    };
  }

  private mapTaskPriority(task: HabitTask): DailyCarePriority {
    if (task.isCritical) {
      return 'high';
    }
    if (task.autonomyMode === 'DEPENDENT') {
      return 'medium';
    }
    return 'low';
  }

  private buildDueDate(date: string, targetTime: string): string {
    const normalizedTime = targetTime.length === 5 ? `${targetTime}:00` : targetTime;
    const parsed = new Date(`${date}T${normalizedTime}`);
    return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
  }
}
