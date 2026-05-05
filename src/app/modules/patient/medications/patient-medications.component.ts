import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable, catchError, forkJoin, map, of } from 'rxjs';
import { MedicalFollowupService } from '../../../core/services/medical-followup.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../shared/components/toast/toast.service';
import {
  MedicationPlan,
  MedicationItem,
  MedicationIntake,
  IntakeStatus,
  PlanStatus,
  MedicationAutonomyLevel,
  ValidatorRole
} from '../../../core/models/medical-followup.model';

interface CalendarDayCell {
  date: Date;
  dateKey: string; // YYYY-MM-DD (local)
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isInTreatment: boolean;
  isDisabled: boolean;
  totalCount: number;
  completedCount: number;
  segments: IntakeStatus[];
}

interface DayIntakeGroup {
  groupKey: string;
  name: string;
  dosage?: string;
  planTitle?: string;
  autonomyLevel?: MedicationAutonomyLevel;
  intakes: MedicationIntake[];
}

/**
 * Patient Medications - Connected Use Case
 *
 * UI:
 * - Global calendar view for all intakes (month grid)
 * - Day details modal with per-intake confirmation
 *
 * Business rules (unchanged):
 * - Patient can confirm only when plan.autonomyLevel === INDEPENDENT
 */
@Component({
  selector: 'app-patient-medications',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './patient-medications.component.html',
  styleUrls: ['./patient-medications.component.scss']
})
export class PatientMedicationsComponent implements OnInit {
  // Backend data
  medicationPlans: MedicationPlan[] = [];
  loading = false;
  error: string | null = null;

  // Patient ID (Keycloak sub)
  patientId!: string;

  // Stats
  totalPlans = 0;
  activePlans = 0;
  highRiskItems = 0;
  adherenceRate = 94;

  // Enums for template
  planStatuses = PlanStatus;
  intakeStatuses = IntakeStatus;

  // Calendar state (global intakes)
  readonly weekdayLabels = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
  viewMonth = this.startOfMonth(new Date());
  calendarDays: CalendarDayCell[] = [];
  calendarLoading = false;
  calendarError: string | null = null;

  selectedDayKey: string | null = null;
  selectedDayDate: Date | null = null;
  selectedDayGroups: DayIntakeGroup[] = [];
  confirmingIntakeIds = new Set<number>();

  private intakesByDay = new Map<string, MedicationIntake[]>();
  private itemById = new Map<number, MedicationItem>();
  private planByItemId = new Map<number, MedicationPlan>();
  private treatmentStartKey?: string;
  private treatmentEndKey?: string;
  private openEndedTreatment = false;
  private readonly todayKey = this.toDateKey(new Date());

  constructor(
    private medicalService: MedicalFollowupService,
    private authService: AuthService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();

    if (!user?.id) {
      this.error = 'No authenticated user found';
      this.toastService.show('Please sign in again to view your medications.', 'error');
      return;
    }

    this.patientId = user.id;
    this.buildCalendarGrid();
    this.loadMedicationPlans();
  }

  loadMedicationPlans(): void {
    this.loading = true;
    this.error = null;

    this.medicalService.getPatientMedicationPlans(this.patientId).subscribe({
      next: (plans) => {
        this.hydratePlanItems(plans).subscribe({
          next: (enrichedPlans) => {
            this.medicationPlans = enrichedPlans;
            this.calculateStats();
            this.rebuildItemMaps();
            this.updateTreatmentRangeFromPlans();
            this.loading = false;
            this.loadCalendarIntakes();
          },
          error: () => {
            this.medicationPlans = plans;
            this.calculateStats();
            this.rebuildItemMaps();
            this.updateTreatmentRangeFromPlans();
            this.loading = false;
            this.loadCalendarIntakes();
          }
        });
      },
      error: (err) => {
        this.error = 'Unable to load medications from server';
        this.toastService.show('Unable to load medications from server.', 'error');
        this.loading = false;
        this.loadCalendarIntakes();
      }
    });
  }

  private hydratePlanItems(plans: MedicationPlan[]): Observable<MedicationPlan[]> {
    if (!plans.length) {
      return of([]);
    }

    const requests = plans.map((plan) => {
      if (Array.isArray(plan.items) && plan.items.length > 0) {
        return of(plan);
      }

      return this.medicalService.getMedicationItems(plan.id).pipe(
        map((items) => ({ ...plan, items })),
        catchError(() => of({ ...plan, items: plan.items ?? [] }))
      );
    });

    return forkJoin(requests);
  }

  calculateStats(): void {
    this.totalPlans = this.medicationPlans.length;
    this.activePlans = this.medicationPlans.filter((p) => p.status === PlanStatus.ACTIVE).length;

    this.highRiskItems = this.medicationPlans.reduce((count, plan) => {
      return count + (plan.items?.filter((item) => item.isHighRisk).length || 0);
    }, 0);
  }

  get allMedicationItems(): MedicationItem[] {
    const items: MedicationItem[] = [];
    this.medicationPlans.forEach((plan) => {
      if (plan.items) items.push(...plan.items);
    });
    return items;
  }

  isLowStock(item: MedicationItem): boolean {
    return item.stockQuantity <= item.lowThreshold;
  }

  parseTimesOfDay(timesOfDay: string): string[] {
    if (!timesOfDay) return [];

    if (timesOfDay.includes(':')) {
      return timesOfDay.split(',').map((t) => t.trim()).filter((t) => t);
    }

    const timeMap: Record<string, string> = {
      MORNING: '08:00',
      NOON: '12:00',
      AFTERNOON: '14:00',
      EVENING: '18:00',
      NIGHT: '22:00',
      BEDTIME: '23:00'
    };

    return timesOfDay
      .split(',')
      .map((t) => timeMap[t.trim()] || '08:00');
  }

  // ==================== Calendar (Global Intakes) ====================

  prevMonth(): void {
    const d = new Date(this.viewMonth);
    d.setMonth(d.getMonth() - 1);
    this.viewMonth = this.startOfMonth(d);
    this.buildCalendarGrid();
    this.loadCalendarIntakes();
  }

  nextMonth(): void {
    const d = new Date(this.viewMonth);
    d.setMonth(d.getMonth() + 1);
    this.viewMonth = this.startOfMonth(d);
    this.buildCalendarGrid();
    this.loadCalendarIntakes();
  }

  get viewMonthLabel(): string {
    return this.viewMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  }

  get selectedDayLabel(): string {
    if (!this.selectedDayDate) return '';
    return this.selectedDayDate.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }

  openDay(cell: CalendarDayCell): void {
    if (cell.isDisabled) return;
    this.selectedDayKey = cell.dateKey;
    this.selectedDayDate = cell.date;
    this.selectedDayGroups = this.buildDayGroups(cell.dateKey);
  }

  closeDayModal(): void {
    this.selectedDayKey = null;
    this.selectedDayDate = null;
    this.selectedDayGroups = [];
  }

  formatTime(dateString: string): string {
    const d = new Date(dateString);
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }

  getSegmentClass(status: IntakeStatus): string {
    switch (status) {
      case IntakeStatus.TAKEN:
        return 'bg-success';
      case IntakeStatus.DELAYED:
        return 'bg-warning';
      case IntakeStatus.MISSED:
      case IntakeStatus.REFUSED:
        return 'bg-danger';
      case IntakeStatus.PENDING:
      default:
        return 'bg-gray-200';
    }
  }

  private getIntakeItemId(intake: MedicationIntake): number | null {
    const raw = (intake.item as any)?.id ?? (intake as any)?.itemId;
    const normalized = typeof raw === 'string' ? Number(raw) : raw;
    if (typeof normalized !== 'number' || Number.isNaN(normalized)) return null;
    return normalized;
  }

  private isFutureDayIntake(intake: MedicationIntake): boolean {
    const scheduledKey = this.toDateKey(new Date(intake.scheduledAt));
    return scheduledKey > this.todayKey;
  }

  // Business rule: unchanged
  canPatientConfirm(plan: MedicationPlan): boolean {
    return plan.autonomyLevel === MedicationAutonomyLevel.INDEPENDENT;
  }

  private canConfirmIntakeByAutonomy(intake: MedicationIntake): boolean {
    const itemId = this.getIntakeItemId(intake);
    if (!itemId) return false;
    const plan = this.planByItemId.get(itemId);
    return !!plan && this.canPatientConfirm(plan);
  }

  canConfirmIntake(intake: MedicationIntake): boolean {
    if (this.isFutureDayIntake(intake)) return false;
    return this.canConfirmIntakeByAutonomy(intake);
  }

  getConfirmButtonTitle(intake: MedicationIntake): string {
    if (this.isFutureDayIntake(intake)) {
      return 'You can only confirm an intake on its scheduled day.';
    }
    if (!this.canConfirmIntakeByAutonomy(intake)) {
      return 'Confirmation requires INDEPENDENT autonomy level';
    }
    return 'Confirm medication taken';
  }

  confirmIntake(intake: MedicationIntake): void {
    if (!this.selectedDayKey) return;

    const intakeId = intake.id;
    if (!intakeId) {
      this.toastService.show('Unable to confirm: intake id is missing.', 'error');
      return;
    }

    if (this.isFutureDayIntake(intake)) {
      this.toastService.show('You can only confirm an intake on its scheduled day.', 'warning');
      return;
    }

    if (!this.canConfirmIntakeByAutonomy(intake)) {
      this.toastService.show('Confirmation requires INDEPENDENT autonomy level.', 'warning');
      return;
    }

    if (intake.status !== IntakeStatus.PENDING) return;

    this.confirmingIntakeIds.add(intakeId);
    this.medicalService.confirmMedicationIntake(intakeId).subscribe({
      next: () => {
        intake.status = IntakeStatus.TAKEN;
        this.toastService.show('Medication confirmed.', 'success');
        this.recomputeCalendarSummaries();
        if (this.selectedDayKey) {
          this.selectedDayGroups = this.buildDayGroups(this.selectedDayKey);
        }
        this.confirmingIntakeIds.delete(intakeId);
      },
      error: (err: unknown) => {
        this.toastService.show('Failed to confirm medication intake. Please try again.', 'error');
        this.confirmingIntakeIds.delete(intakeId);
      }
    });
  }

  isConfirming(intake: MedicationIntake): boolean {
    return !!intake.id && this.confirmingIntakeIds.has(intake.id);
  }

  isDisplayOnlyIntake(intake: MedicationIntake): boolean {
    return !!(intake as any).__displayOnly;
  }

  trackByDateKey(index: number, cell: CalendarDayCell): string {
    return cell.dateKey;
  }

  trackByGroupKey(index: number, group: DayIntakeGroup): string {
    return group.groupKey;
  }

  trackByIntakeId(index: number, intake: MedicationIntake): number | string {
    return intake.id ?? intake.scheduledAt;
  }

  private buildCalendarGrid(): void {
    const firstOfMonth = this.startOfMonth(this.viewMonth);
    const start = this.startOfWeekMonday(firstOfMonth);

    const days: CalendarDayCell[] = [];
    for (let i = 0; i < 42; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      const dateKey = this.toDateKey(date);

      const isInTreatment = this.isDateKeyInTreatment(dateKey);
      days.push({
        date,
        dateKey,
        dayNumber: date.getDate(),
        isCurrentMonth: date.getMonth() === this.viewMonth.getMonth(),
        isToday: dateKey === this.todayKey,
        isInTreatment,
        isDisabled: !isInTreatment,
        totalCount: 0,
        completedCount: 0,
        segments: []
      });
    }

    this.calendarDays = days;
    this.recomputeCalendarSummaries();
  }

  private loadCalendarIntakes(): void {
    if (!this.patientId || this.calendarDays.length === 0) return;

    const rangeStart = this.startOfDay(this.calendarDays[0].date);
    const rangeEnd = this.endOfDay(this.calendarDays[this.calendarDays.length - 1].date);

    this.calendarLoading = true;
    this.calendarError = null;

    this.medicalService
      .getMedicationIntakesByDateRange(this.patientId, rangeStart.toISOString(), rangeEnd.toISOString())
      .subscribe({
        next: (intakes) => {
          const normalized = (intakes ?? []).map((i) => this.attachItemIfMissing(i));
          this.autoMarkMissedOverdueIntakes(normalized).subscribe((processedIntakes) => {
            this.indexIntakesByDay(processedIntakes);
            this.updateTreatmentRangeFromIntakes(processedIntakes);
            this.recomputeCalendarSummaries();
            this.calendarLoading = false;

            if (this.selectedDayKey) {
              this.selectedDayGroups = this.buildDayGroups(this.selectedDayKey);
            }
          });
        },
        error: (err) => {
          this.calendarError = 'Unable to load intakes for this month.';
          this.calendarLoading = false;
        }
      });
  }

  private autoMarkMissedOverdueIntakes(intakes: MedicationIntake[]): Observable<MedicationIntake[]> {
    const overdueIntakes = intakes.filter((intake) =>
      !!intake.id &&
      intake.status === IntakeStatus.PENDING &&
      this.isMoreThanOneHourPast(intake.scheduledAt)
    );

    if (!overdueIntakes.length) {
      return of(intakes);
    }

    const requests = overdueIntakes.map((intake) =>
      this.medicalService
        .markMedicationIntakeAsMissed(
          intake.id!,
          this.patientId,
          ValidatorRole.SYSTEM,
          'Automatically marked as missed after 1 hour'
        )
        .pipe(
          map((updated) => this.attachItemIfMissing(updated)),
          catchError(() => of(intake))
        )
    );

    return forkJoin(requests).pipe(
      map((updatedIntakes) => {
        const updatesById = new Map<number, MedicationIntake>();
        for (const intake of updatedIntakes) {
          if (intake.id) {
            updatesById.set(intake.id, intake);
          }
        }

        return intakes.map((intake) => {
          if (!intake.id) return intake;
          return updatesById.get(intake.id) ?? intake;
        });
      })
    );
  }

  private indexIntakesByDay(intakes: MedicationIntake[]): void {
    const mapByDay = new Map<string, MedicationIntake[]>();

    for (const intake of intakes) {
      const key = this.toDateKey(new Date(intake.scheduledAt));
      const bucket = mapByDay.get(key) ?? [];
      bucket.push(intake);
      mapByDay.set(key, bucket);
    }

    for (const [key, bucket] of mapByDay.entries()) {
      bucket.sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
      mapByDay.set(key, bucket);
    }

    this.intakesByDay = mapByDay;
  }

  private recomputeCalendarSummaries(): void {
    this.calendarDays = this.calendarDays.map((cell) => {
      const dayIntakes = this.intakesByDay.get(cell.dateKey) ?? [];
      const completedCount = dayIntakes.filter((i) => i.status === IntakeStatus.TAKEN).length;
      const isInTreatment = this.isDateKeyInTreatment(cell.dateKey);

      return {
        ...cell,
        isInTreatment,
        isDisabled: !isInTreatment,
        totalCount: dayIntakes.length,
        completedCount,
        segments: dayIntakes.map((i) => i.status)
      };
    });
  }

  private buildDayGroups(dateKey: string): DayIntakeGroup[] {
    const dayIntakes = (this.intakesByDay.get(dateKey) ?? []).slice();
    const groups = new Map<string, DayIntakeGroup>();

    for (const plan of this.medicationPlans) {
      if (!this.isPlanActiveOnDate(plan, dateKey)) continue;

      for (const item of plan.items ?? []) {
        const groupKey = `item-${item.id}`;
        if (!groups.has(groupKey)) {
          groups.set(groupKey, {
            groupKey,
            name: item.name,
            dosage: item.dosage,
            planTitle: plan.title,
            autonomyLevel: plan.autonomyLevel,
            intakes: []
          });
        }

        const group = groups.get(groupKey)!;
        const configuredTimes = this.parseTimesOfDay(item.timesOfDay);
        for (const time of configuredTimes) {
          group.intakes.push(this.buildDisplayOnlyIntake(dateKey, time, item));
        }
      }
    }

      for (const intake of dayIntakes) {
        const intakeItemId = this.getIntakeItemId(intake);
        const item = intake.item ?? (intakeItemId ? this.itemById.get(intakeItemId) : undefined);
        const normalizedItemId = typeof intakeItemId === 'number' && !Number.isNaN(intakeItemId) ? intakeItemId : null;

        // Skip unresolved generic entries so the modal only shows real medication groups.
        if (!item || normalizedItemId === null) {
          continue;
        }

        const name = item.name;
        const dosage = item.dosage;
        const plan = normalizedItemId ? this.planByItemId.get(normalizedItemId) : undefined;

        const groupKey = `item-${normalizedItemId}`;

        if (!groups.has(groupKey)) {
          groups.set(groupKey, {
            groupKey,
          name,
          dosage,
          planTitle: plan?.title,
          autonomyLevel: plan?.autonomyLevel,
          intakes: []
        });
      }

      const group = groups.get(groupKey)!;
      const intakeTime = this.getTimeKey(intake.scheduledAt);
      const existingIndex = group.intakes.findIndex(
        (candidate) => this.getTimeKey(candidate.scheduledAt) === intakeTime
      );

      if (existingIndex >= 0) {
        group.intakes[existingIndex] = intake;
      } else {
        group.intakes.push(intake);
      }
    }

    const result = Array.from(groups.values());
    for (const g of result) {
      g.intakes.sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
    }

    result.sort((a, b) => {
      const at = a.intakes[0]?.scheduledAt ? new Date(a.intakes[0].scheduledAt).getTime() : 0;
      const bt = b.intakes[0]?.scheduledAt ? new Date(b.intakes[0].scheduledAt).getTime() : 0;
      return at - bt;
    });

    return result;
  }

  private rebuildItemMaps(): void {
    this.itemById.clear();
    this.planByItemId.clear();

    for (const plan of this.medicationPlans) {
      for (const item of plan.items ?? []) {
        this.itemById.set(item.id, item);
        this.planByItemId.set(item.id, plan);
      }
    }
  }

  private updateTreatmentRangeFromPlans(): void {
    const startKeys: string[] = [];
    const endKeys: string[] = [];

    this.openEndedTreatment = false;

    for (const plan of this.medicationPlans) {
      if (plan.startDate) startKeys.push(this.toDateKey(this.parseDateOnly(plan.startDate)));
      if (plan.endDate) {
        endKeys.push(this.toDateKey(this.parseDateOnly(plan.endDate)));
      } else {
        this.openEndedTreatment = true;
      }
    }

    this.treatmentStartKey = startKeys.length ? startKeys.sort()[0] : undefined;
    this.treatmentEndKey = this.openEndedTreatment ? undefined : endKeys.length ? endKeys.sort().slice(-1)[0] : undefined;
  }

  private updateTreatmentRangeFromIntakes(intakes: MedicationIntake[]): void {
    if (!intakes.length) return;

    const intakeKeys = intakes.map((i) => this.toDateKey(new Date(i.scheduledAt))).sort();
    const minIntakeKey = intakeKeys[0];
    const maxIntakeKey = intakeKeys[intakeKeys.length - 1];

    if (!this.treatmentStartKey || minIntakeKey < this.treatmentStartKey) {
      this.treatmentStartKey = minIntakeKey;
    }

    if (!this.openEndedTreatment) {
      if (!this.treatmentEndKey || maxIntakeKey > this.treatmentEndKey) {
        this.treatmentEndKey = maxIntakeKey;
      }
    }
  }

  private isDateKeyInTreatment(dateKey: string): boolean {
    if (!this.treatmentStartKey) return true;
    if (dateKey < this.treatmentStartKey) return false;
    if (this.openEndedTreatment) return true;
    if (!this.treatmentEndKey) return true;
    return dateKey <= this.treatmentEndKey;
  }

  private isPlanActiveOnDate(plan: MedicationPlan, dateKey: string): boolean {
    const startKey = this.toDateKey(this.parseDateOnly(plan.startDate));
    const endKey = plan.endDate ? this.toDateKey(this.parseDateOnly(plan.endDate)) : undefined;

    if (dateKey < startKey) return false;
    if (endKey && dateKey > endKey) return false;
    return true;
  }

  private getTimeKey(scheduledAt: string): string {
    const date = new Date(scheduledAt);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  private buildDisplayOnlyIntake(dateKey: string, time: string, item: MedicationItem): MedicationIntake {
    const scheduledAt = this.buildScheduledAt(dateKey, time);
    return {
      itemId: item.id,
      item,
      scheduledAt,
      status: this.isMoreThanOneHourPast(scheduledAt) ? IntakeStatus.MISSED : IntakeStatus.PENDING,
      ...( { __displayOnly: true } as any )
    };
  }

  private buildScheduledAt(dateKey: string, time: string): string {
    const [year, month, day] = dateKey.split('-').map(Number);
    const [hours, minutes] = time.split(':').map(Number);
    return new Date(year, (month || 1) - 1, day || 1, hours || 0, minutes || 0, 0, 0).toISOString();
  }

  private isMoreThanOneHourPast(scheduledAt: string): boolean {
    return Date.now() - new Date(scheduledAt).getTime() >= 60 * 60 * 1000;
  }

  private attachItemIfMissing(intake: MedicationIntake): MedicationIntake {
    if (intake.item) return intake;

    const rawItemId = (intake as any).itemId;
    const itemId = typeof rawItemId === 'string' ? Number(rawItemId) : rawItemId;
    const item = itemId ? this.itemById.get(itemId) : undefined;
    if (!item) return intake;

    return { ...intake, item };
  }

  private startOfMonth(date: Date): Date {
    const d = new Date(date);
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  private startOfWeekMonday(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay(); // 0 = Sun ... 6 = Sat
    const mondayOffset = (day + 6) % 7; // Mon=0 ... Sun=6
    d.setDate(d.getDate() - mondayOffset);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  private startOfDay(date: Date): Date {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  private endOfDay(date: Date): Date {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    return d;
  }

  private toDateKey(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  private parseDateOnly(value: string): Date {
    const part = value.includes('T') ? value.split('T')[0] : value;
    const [y, m, d] = part.split('-').map((x) => Number(x));
    const date = new Date();
    date.setFullYear(y, (m || 1) - 1, d || 1);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }

  getPlanStatusClass(status: PlanStatus): string {
    const classes: Record<PlanStatus, string> = {
      [PlanStatus.ACTIVE]: 'bg-green-100 text-green-800',
      [PlanStatus.SUSPENDED]: 'bg-yellow-100 text-yellow-800',
      [PlanStatus.STOPPED]: 'bg-red-100 text-red-800',
      [PlanStatus.COMPLETED]: 'bg-emerald-100 text-emerald-800'
    };
    return classes[status];
  }

  getIntakeStatusClass(status: IntakeStatus): string {
    const classes: Record<IntakeStatus, string> = {
      [IntakeStatus.PENDING]: 'bg-gray-100 text-gray-600',
      [IntakeStatus.TAKEN]: 'bg-green-100 text-green-700',
      [IntakeStatus.DELAYED]: 'bg-yellow-100 text-yellow-700',
      [IntakeStatus.MISSED]: 'bg-red-100 text-red-700',
      [IntakeStatus.REFUSED]: 'bg-orange-100 text-orange-700'
    };
    return classes[status];
  }
}
