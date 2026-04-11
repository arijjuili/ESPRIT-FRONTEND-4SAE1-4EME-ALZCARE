import { Injectable } from '@angular/core';
import {
  Appointment,
  AppointmentPriority,
  AppointmentStatus,
  AppointmentType
} from '../models/medical-followup.model';

export type SchedulingParty = 'DOCTOR' | 'PATIENT' | 'CAREGIVER';
export type SchedulingConflictSeverity = 'BLOCKING' | 'PREEMPTIBLE';

export interface ProposedAppointmentWindow {
  startAt: string;
  endAt: string;
  type: AppointmentType | string;
  priority: AppointmentPriority | string;
}

export interface SchedulingConflict {
  party: SchedulingParty;
  withAppointment: Appointment;
  reason: string;
  severity: SchedulingConflictSeverity;
}

export interface SuggestedSlot {
  startAt: string; // LocalDateTime string: YYYY-MM-DDTHH:mm:ss
  endAt: string;   // LocalDateTime string: YYYY-MM-DDTHH:mm:ss
  note?: string;
}

export interface AvailabilitySource {
  party: SchedulingParty;
  appointments: Appointment[];
  bufferMinutes?: number;
}

export interface SuggestSlotsOptions {
  startSearchAt: string; // LocalDateTime
  durationMinutes: number;
  sources: AvailabilitySource[];
  type: AppointmentType | string;
  priority: AppointmentPriority | string;
  mode: 'ONSITE' | 'ONLINE';
  maxSuggestions?: number;
  daysToScan?: number;
  stepMinutes?: number;
  workingHours?: { startHour: number; endHour: number };
  skipWeekends?: boolean;
}

export interface SchedulingConflictAnalysis {
  conflicts: SchedulingConflict[];
  blockingConflicts: SchedulingConflict[];
  preemptibleConflicts: SchedulingConflict[];
  canProceed: boolean;
  hasPriorityOverride: boolean;
}

@Injectable({ providedIn: 'root' })
export class AppointmentSchedulingService {
  private readonly defaultWorkingHours = { startHour: 9, endHour: 17 };

  // Backend treats these as local datetimes (no timezone). We parse/build in local time explicitly.
  parseLocalDateTime(value: string): Date | null {
    if (!value) return null;
    const m = value.match(
      /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/
    );
    if (!m) return null;
    const [, y, mo, d, h, mi, s] = m;
    return new Date(
      Number(y),
      Number(mo) - 1,
      Number(d),
      Number(h),
      Number(mi),
      s ? Number(s) : 0,
      0
    );
  }

  toLocalDateTimeString(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return (
      `${date.getFullYear()}-` +
      `${pad(date.getMonth() + 1)}-` +
      `${pad(date.getDate())}T` +
      `${pad(date.getHours())}:` +
      `${pad(date.getMinutes())}:` +
      `${pad(date.getSeconds())}`
    );
  }

  isBlockingStatus(status: AppointmentStatus | string | undefined | null): boolean {
    // CANCELLED/REJECTED are treated as non-blocking; everything else blocks time.
    return status !== AppointmentStatus.CANCELLED && status !== AppointmentStatus.REJECTED;
  }

  isUrgentAppointment(appointment: Pick<ProposedAppointmentWindow, 'type' | 'priority'>): boolean {
    return (
      appointment.type === AppointmentType.EMERGENCY ||
      appointment.priority === AppointmentPriority.CRITICAL
    );
  }

  isRoutineAppointment(appointment: Pick<ProposedAppointmentWindow, 'type' | 'priority'>): boolean {
    return (
      appointment.type === AppointmentType.ROUTINE &&
      !this.isUrgentAppointment(appointment)
    );
  }

  getPriorityRank(priority: AppointmentPriority | string | undefined | null): number {
    switch (priority) {
      case AppointmentPriority.CRITICAL:
        return 4;
      case AppointmentPriority.HIGH:
        return 3;
      case AppointmentPriority.NORMAL:
        return 2;
      case AppointmentPriority.LOW:
      default:
        return 1;
    }
  }

  overlaps(
    proposedStart: Date,
    proposedEnd: Date,
    existingStart: Date,
    existingEnd: Date,
    bufferMinutes: number = 0
  ): boolean {
    const buf = Math.max(0, bufferMinutes) * 60_000;
    const pStart = proposedStart.getTime();
    const pEnd = proposedEnd.getTime();
    const eStart = existingStart.getTime() - buf;
    const eEnd = existingEnd.getTime() + buf;
    return pStart < eEnd && pEnd > eStart;
  }

  analyzeConflicts(
    proposed: ProposedAppointmentWindow,
    sources: AvailabilitySource[]
  ): SchedulingConflictAnalysis {
    const pStart = this.parseLocalDateTime(this.normalizeLocalDateTime(proposed.startAt));
    const pEnd = this.parseLocalDateTime(this.normalizeLocalDateTime(proposed.endAt));

    if (!pStart || !pEnd) {
      return {
        conflicts: [],
        blockingConflicts: [],
        preemptibleConflicts: [],
        canProceed: false,
        hasPriorityOverride: false
      };
    }

    const conflicts: SchedulingConflict[] = [];

    for (const source of sources) {
      const buffer = source.bufferMinutes ?? 0;
      for (const appt of source.appointments) {
        if (!this.isBlockingStatus(appt.status)) continue;

        const eStart = this.parseLocalDateTime(this.normalizeLocalDateTime(appt.startAt));
        const eEnd = this.parseLocalDateTime(this.normalizeLocalDateTime(appt.endAt));
        if (!eStart || !eEnd) continue;

        if (!this.overlaps(pStart, pEnd, eStart, eEnd, buffer)) {
          continue;
        }

        const severity = this.canPreempt(proposed, appt) ? 'PREEMPTIBLE' : 'BLOCKING';
        conflicts.push({
          party: source.party,
          withAppointment: appt,
          reason: this.buildConflictReason(severity, buffer),
          severity
        });
      }
    }

    const blockingConflicts = conflicts.filter(conflict => conflict.severity === 'BLOCKING');
    const preemptibleConflicts = conflicts.filter(conflict => conflict.severity === 'PREEMPTIBLE');

    return {
      conflicts,
      blockingConflicts,
      preemptibleConflicts,
      canProceed: blockingConflicts.length === 0,
      hasPriorityOverride: preemptibleConflicts.length > 0
    };
  }

  findConflicts(proposedStartAt: string, proposedEndAt: string, sources: AvailabilitySource[]): SchedulingConflict[] {
    return this.analyzeConflicts(
      {
        startAt: proposedStartAt,
        endAt: proposedEndAt,
        type: AppointmentType.ROUTINE,
        priority: AppointmentPriority.NORMAL
      },
      sources
    ).conflicts;
  }

  suggestSlots(options: SuggestSlotsOptions): SuggestedSlot[] {
    const {
      startSearchAt,
      durationMinutes,
      sources,
      type,
      priority,
      maxSuggestions = 8,
      daysToScan = 14,
      stepMinutes = 15,
      workingHours = this.defaultWorkingHours,
      skipWeekends = true
    } = options;

    const start = this.parseLocalDateTime(this.normalizeLocalDateTime(startSearchAt));
    if (!start) return [];

    const stepMs = Math.max(5, stepMinutes) * 60_000;
    const durationMs = Math.max(5, durationMinutes) * 60_000;

    const suggestions: SuggestedSlot[] = [];

    // Round up to next step to avoid suggesting "odd" minutes.
    let cursor = new Date(start.getTime());
    const rounded = Math.ceil(cursor.getTime() / stepMs) * stepMs;
    cursor = new Date(rounded);

    for (let day = 0; day <= daysToScan && suggestions.length < maxSuggestions; day++) {
      const dayStart = new Date(
        cursor.getFullYear(),
        cursor.getMonth(),
        cursor.getDate() + day,
        workingHours.startHour,
        0,
        0,
        0
      );
      const dayEnd = new Date(
        cursor.getFullYear(),
        cursor.getMonth(),
        cursor.getDate() + day,
        workingHours.endHour,
        0,
        0,
        0
      );

      if (skipWeekends) {
        const dow = dayStart.getDay(); // 0 Sun ... 6 Sat
        if (dow === 0 || dow === 6) {
          continue;
        }
      }

      // If we're scanning day 0, start at the cursor time; otherwise start at working hours.
      const scanStart = day === 0 ? new Date(Math.max(dayStart.getTime(), cursor.getTime())) : dayStart;

      for (let t = scanStart.getTime(); t + durationMs <= dayEnd.getTime(); t += stepMs) {
        const candidateStart = new Date(t);
        const candidateEnd = new Date(t + durationMs);

        const startStr = this.toLocalDateTimeString(candidateStart);
        const endStr = this.toLocalDateTimeString(candidateEnd);
        const analysis = this.analyzeConflicts(
          {
            startAt: startStr,
            endAt: endStr,
            type,
            priority
          },
          sources
        );

        if (analysis.blockingConflicts.length === 0) {
          suggestions.push({
            startAt: startStr,
            endAt: endStr,
            note: analysis.preemptibleConflicts.length > 0
              ? 'Urgent visit can preempt routine appointments in this slot.'
              : undefined
          });
          if (suggestions.length >= maxSuggestions) break;
        }
      }
    }

    return suggestions;
  }

  normalizeLocalDateTime(value: string): string {
    if (!value) return value;
    // Ensure seconds exist for consistent parsing.
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) {
      return `${value}:00`;
    }
    return value.replace(/Z$/, '');
  }

  private canPreempt(proposed: ProposedAppointmentWindow, existing: Appointment): boolean {
    return (
      this.isUrgentAppointment(proposed) &&
      this.isRoutineAppointment(existing) &&
      !this.isUrgentAppointment(existing) &&
      this.getPriorityRank(proposed.priority) > this.getPriorityRank(existing.priority)
    );
  }

  private buildConflictReason(severity: SchedulingConflictSeverity, bufferMinutes: number): string {
    const overlapMessage = bufferMinutes > 0
      ? `Overlaps with buffer (${bufferMinutes} min)`
      : 'Overlaps';

    if (severity === 'PREEMPTIBLE') {
      return `${overlapMessage}; urgent care may take precedence over this routine visit.`;
    }

    return overlapMessage;
  }
}
