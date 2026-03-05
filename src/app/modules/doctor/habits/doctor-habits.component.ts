import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil, switchMap, forkJoin, of, map, catchError } from 'rxjs';
import { DailyCareService } from '../../../core/services/daily-care.service';
import { AuthService } from '../../../core/services/auth.service';
import { CareTeamService } from '../../../core/services/care-team.service';
import { DoctorAssignmentStatus, DoctorAssignment } from '../../../core/models/care-team.model';
import { Habit, HabitType, HabitTask, HabitTaskRequest, AutonomyMode } from '../../../core/models/daily-care.model';

type HabitTaskForm = {
  id?: number;
  title: string;
  description: string;
  orderIndex: number;
  isCritical: boolean;
  autonomyMode: AutonomyMode;
};

type HabitFormModel = {
  name: string;
  type: HabitType;
  targetTime: string;
  active: boolean;
  tasks: HabitTaskForm[];
};

@Component({
  selector: 'app-doctor-habits',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './doctor-habits.component.html',
  styleUrls: ['./doctor-habits.component.scss']
})
export class DoctorHabitsComponent implements OnInit, OnDestroy {
  habits: Habit[] = [];
  filteredHabits: Habit[] = [];

  searchTerm = '';
  filterType: HabitType | 'ALL' = 'ALL';

  loading = false;
  deletingId: number | null = null;
  togglingId: number | null = null;
  saving = false;
  assigningHabitId: number | null = null;
  unassigningHabitId: number | null = null;

  showForm = false;
  editingHabit: Habit | null = null;
  formData: HabitFormModel = this.getEmptyForm();
  doctorAssignments: DoctorAssignment[] = [];
  selectedPatientByHabit: Record<number, string> = {};
  assignedPatientsByHabit: Record<number, string[]> = {};
  doctorId = '';

  error = '';
  successMessage = '';

  private destroy$ = new Subject<void>();

  constructor(
    private dailyCareService: DailyCareService,
    private authService: AuthService,
    private careTeamService: CareTeamService
  ) {}

  ngOnInit(): void {
    this.loadDoctorAssignments();
    this.loadHabits();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadHabits(): void {
    this.loading = true;
    this.error = '';
    this.successMessage = '';

    this.dailyCareService.getAllHabits()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (habits) => {
          this.habits = habits.map(h => ({
            ...h,
            tasks: h.tasks || []
          }));
          this.applyFilter();
          this.refreshAssignedPatientsByHabit();
          this.loading = false;
        },
        error: (err) => {
          console.error('Failed to load habits:', err);
          this.habits = [];
          this.filteredHabits = [];
          this.error = 'Unable to load habits. The Daily Care service may not be running.';
          this.loading = false;
        }
      });
  }

  loadDoctorAssignments(): void {
    const doctorId = this.authService.getCurrentUserId();
    if (!doctorId) {
      this.error = 'Missing doctor identity. Please log in again.';
      return;
    }

    this.doctorId = doctorId;
    this.careTeamService.getDoctorPatients(doctorId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (assignments) => {
          this.doctorAssignments = assignments.filter(
            assignment => assignment.status === DoctorAssignmentStatus.ACTIVE
          );
          this.refreshAssignedPatientsByHabit();
        },
        error: () => {
          this.doctorAssignments = [];
          this.assignedPatientsByHabit = {};
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

  get activeCount(): number {
    return this.habits.filter(h => h.active).length;
  }

  get totalTasks(): number {
    return this.habits.reduce((sum, h) => sum + (h.tasks?.length || 0), 0);
  }

  openCreateForm(): void {
    this.editingHabit = null;
    this.formData = this.getEmptyForm();
    this.showForm = true;
  }

  openEditForm(habit: Habit): void {
    this.editingHabit = habit;
    this.formData = {
      name: habit.name,
      type: habit.type,
      targetTime: this.toTimeInput(habit.targetTime),
      active: habit.active,
      tasks: (habit.tasks || []).map(task => ({ ...task }))
    };
    this.showForm = true;
  }

  closeForm(): void {
    if (this.saving) return;
    this.showForm = false;
    this.editingHabit = null;
    this.formData = this.getEmptyForm();
  }

  addTask(): void {
    this.formData.tasks.push({
      title: '',
      description: '',
      orderIndex: this.formData.tasks.length + 1,
      isCritical: false,
      autonomyMode: 'INDEPENDENT'
    });
  }

  removeTask(index: number): void {
    this.formData.tasks.splice(index, 1);
    this.formData.tasks = this.formData.tasks.map((task, idx) => ({
      ...task,
      orderIndex: idx + 1
    }));
  }

  saveHabit(): void {
    if (!this.formData.name.trim() || this.saving) return;

    if (!this.validateTasks()) {
      return;
    }

    this.saving = true;
    this.error = '';

    const habitPayload = {
      name: this.formData.name.trim(),
      type: this.formData.type,
      targetTime: this.toBackendTime(this.formData.targetTime),
      active: this.formData.active
    };

    const operation$ = this.editingHabit
      ? this.dailyCareService.updateHabit(this.editingHabit.id, habitPayload).pipe(
          switchMap(updatedHabit =>
            this.syncTasks(
              updatedHabit.id,
              this.editingHabit?.tasks || [],
              this.formData.tasks
            )
          )
        )
      : this.dailyCareService.createHabit(habitPayload).pipe(
          switchMap(createdHabit =>
            this.syncTasks(createdHabit.id, [], this.formData.tasks)
          )
        );

    operation$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.saving = false;
          this.closeForm();
          this.loadHabits();
        },
        error: (err) => {
          this.error = this.getErrorMessage(err, 'Failed to save habit.');
          this.saving = false;
        }
      });
  }

  toggleActive(habit: Habit): void {
    this.togglingId = habit.id;
    this.dailyCareService.toggleHabitActive(habit.id, !habit.active)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: updated => {
          const index = this.habits.findIndex(item => item.id === updated.id);
          if (index !== -1) {
            this.habits[index] = { ...updated, tasks: this.habits[index].tasks || [] };
          }
          this.applyFilter();
          this.togglingId = null;
        },
        error: (err) => {
          this.error = this.getErrorMessage(err, 'Failed to update active state.');
          this.togglingId = null;
        }
      });
  }

  deleteHabit(habit: Habit): void {
    if (this.deletingId !== null) {
      return;
    }

    const confirmed = window.confirm(`Delete "${habit.name}"? This cannot be undone.`);
    if (!confirmed) return;

    this.deletingId = habit.id;
    this.error = '';

    this.findAssignedPatientsForHabit(habit.id)
      .pipe(
        switchMap((assignedPatientNames) => {
          if (assignedPatientNames.length > 0) {
            const names = assignedPatientNames.join(', ');
            this.error = `Cannot delete this habit because it is assigned to: ${names}. Unassign first, then retry.`;
            this.deletingId = null;
            return of(null);
          }

          const deleteTasksFirst$ = (habit.tasks && habit.tasks.length > 0)
            ? forkJoin(habit.tasks.map(task => this.dailyCareService.deleteTask(task.id))).pipe(map(() => null))
            : of(null);

          return deleteTasksFirst$.pipe(
            switchMap(() => this.dailyCareService.deleteHabit(habit.id))
          );
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (result) => {
          if (result === null) {
            return;
          }
          this.deletingId = null;
          this.habits = this.habits.filter(item => item.id !== habit.id);
          this.applyFilter();
        },
        error: (err) => {
          this.error = this.getDeleteErrorMessage(err);
          this.deletingId = null;
        }
      });
  }

  assignHabit(habitId: number): void {
    const patientId = this.selectedPatientByHabit[habitId];
    if (!patientId || !this.doctorId) {
      this.error = 'Select a patient before assigning this habit.';
      return;
    }

    this.assigningHabitId = habitId;
    this.error = '';
    this.successMessage = '';

    this.dailyCareService.assignHabitToPatient(this.doctorId, patientId, { habitId })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.assigningHabitId = null;
          this.successMessage = 'Habit assigned successfully.';
          this.refreshAssignedPatientsByHabit();
        },
        error: (err) => {
          this.assigningHabitId = null;
          this.error = this.getErrorMessage(err, 'Failed to assign habit to patient.');
        }
      });
  }

  unassignHabit(habitId: number): void {
    const patientId = this.selectedPatientByHabit[habitId];
    if (!patientId || !this.doctorId) {
      this.error = 'Select a patient before unassigning this habit.';
      return;
    }

    this.unassigningHabitId = habitId;
    this.error = '';
    this.successMessage = '';

    this.dailyCareService.unassignHabitFromPatient(this.doctorId, patientId, habitId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.unassigningHabitId = null;
          this.successMessage = 'Habit unassigned successfully.';
          this.refreshAssignedPatientsByHabit();
        },
        error: (err) => {
          this.unassigningHabitId = null;
          if (err && typeof err === 'object' && 'status' in err && (err as { status?: number }).status === 404) {
            this.error = 'Unassign endpoint not found on backend. Ask backend to expose DELETE /api/v1/habit/doctors/{doctorId}/patients/{patientId}/assignments/{habitId}.';
            return;
          }
          this.error = this.getErrorMessage(err, 'Failed to unassign habit from patient.');
        }
      });
  }

  getPatientLabel(assignment: DoctorAssignment): string {
    const fullName = `${assignment.patientFirstName || ''} ${assignment.patientLastName || ''}`.trim();
    return fullName || assignment.patientId;
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

  private validateTasks(): boolean {
    for (const task of this.formData.tasks) {
      if (!task.title.trim()) {
        this.error = 'Every task must have a title.';
        return false;
      }
      if (!task.description.trim()) {
        this.error = 'Every task must have a description.';
        return false;
      }
      if (!task.autonomyMode) {
        this.error = 'Select autonomy mode for each task.';
        return false;
      }
    }
    return true;
  }

  private getEmptyForm(): HabitFormModel {
    return {
      name: '',
      type: 'MORNING',
      targetTime: '08:00',
      active: true,
      tasks: []
    };
  }

  private toBackendTime(time: string): string {
    return time.length === 5 ? `${time}:00` : time;
  }

  private toTimeInput(targetTime: string): string {
    return targetTime?.slice(0, 5) || '08:00';
  }

  private syncTasks(habitId: number, originalTasks: HabitTask[], formTasks: HabitTaskForm[]) {
    const normalizedTasks = formTasks.map((task, index) => ({
      ...task,
      orderIndex: index + 1
    }));

    const originalById = new Map<number, HabitTask>(
      originalTasks.filter(t => typeof t.id === 'number').map(t => [t.id, t])
    );

    const formIds = new Set<number>(
      normalizedTasks.filter(t => typeof t.id === 'number').map(t => t.id as number)
    );

    const deleteCalls = originalTasks
      .filter(task => !formIds.has(task.id))
      .map(task => this.dailyCareService.deleteTask(task.id));

    const updateCalls = normalizedTasks
      .filter(task => typeof task.id === 'number' && originalById.has(task.id as number))
      .map(task =>
        this.dailyCareService.updateTask(task.id as number, {
          habitId,
          title: task.title,
          description: task.description,
          orderIndex: task.orderIndex,
          critical: task.isCritical,
          autonomyMode: task.autonomyMode
        } as HabitTaskRequest)
      );

    const createCalls = normalizedTasks
      .filter(task => typeof task.id !== 'number')
      .map(task =>
        this.dailyCareService.createTask({
          habitId,
          title: task.title,
          description: task.description,
          orderIndex: task.orderIndex,
          critical: task.isCritical,
          autonomyMode: task.autonomyMode
        } as HabitTaskRequest)
      );

    const allCalls = [...deleteCalls, ...updateCalls, ...createCalls];
    if (allCalls.length === 0) {
      return of(null);
    }

    return forkJoin(allCalls);
  }

  private getErrorMessage(error: unknown, fallback: string): string {
    if (error && typeof error === 'object' && 'message' in error) {
      const msg = (error as { message?: string }).message;
      if (msg) return msg;
    }
    return fallback;
  }

  private getDeleteErrorMessage(error: unknown): string {
    if (error && typeof error === 'object' && 'status' in error) {
      const status = (error as { status?: number }).status;
      if (status === 500) {
        return 'Delete failed on server. This habit may still be assigned to patients. Unassign it first, then retry.';
      }
    }
    return this.getErrorMessage(error, 'Failed to delete habit.');
  }

  private findAssignedPatientsForHabit(habitId: number) {
    if (!this.doctorAssignments.length) {
      return of([] as string[]);
    }

    const checks = this.doctorAssignments.map(assignment =>
      this.dailyCareService.getAssignedHabitsForPatient(assignment.patientId).pipe(
        map(habits => {
          const isAssigned = habits.some(habit => habit.id === habitId);
          return isAssigned ? this.getPatientLabel(assignment) : null;
        }),
        catchError(() => of(null))
      )
    );

    return forkJoin(checks).pipe(
      map(results => results.filter((name): name is string => !!name))
    );
  }

  private refreshAssignedPatientsByHabit(): void {
    if (!this.habits.length || !this.doctorAssignments.length) {
      this.assignedPatientsByHabit = {};
      return;
    }

    const trackedHabitIds = new Set(this.habits.map(habit => habit.id));
    const checks = this.doctorAssignments.map(assignment =>
      this.dailyCareService.getAssignedHabitsForPatient(assignment.patientId).pipe(
        map(habits => ({
          assignment,
          habitIds: habits.map(habit => habit.id).filter(id => trackedHabitIds.has(id))
        })),
        catchError(() => of({ assignment, habitIds: [] as number[] }))
      )
    );

    forkJoin(checks)
      .pipe(takeUntil(this.destroy$))
      .subscribe(results => {
        const nextMap: Record<number, string[]> = {};

        results.forEach(result => {
          const patientLabel = this.getPatientLabel(result.assignment);
          result.habitIds.forEach(habitId => {
            if (!nextMap[habitId]) {
              nextMap[habitId] = [];
            }
            if (!nextMap[habitId].includes(patientLabel)) {
              nextMap[habitId].push(patientLabel);
            }
          });
        });

        this.assignedPatientsByHabit = nextMap;
      });
  }
}
