import { Injectable } from '@angular/core';
import { Appointment, AppointmentStatus } from '../models/medical-followup.model';

export type SchedulingParty = 'DOCTOR' | 'PATIENT' | 'CAREGIVER';

export interface SchedulingConflict {
  party: SchedulingParty;
  withAppointment: Appointment;
  reason: string;
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
  mode: 'ONSITE' | 'ONLINE';
  maxSuggestions?: number;
  daysToScan?: number;
  stepMinutes?: number;
  workingHours?: { startHour: number; endHour: number };
  skipWeekends?: boolean;
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

  findConflicts(proposedStartAt: string, proposedEndAt: string, sources: AvailabilitySource[]): SchedulingConflict[] {
    const pStart = this.parseLocalDateTime(proposedStartAt);
    const pEnd = this.parseLocalDateTime(proposedEndAt);
    if (!pStart || !pEnd) return [];

    const conflicts: SchedulingConflict[] = [];

    for (const source of sources) {
      const buffer = source.bufferMinutes ?? 0;
      for (const appt of source.appointments) {
        if (!this.isBlockingStatus(appt.status)) continue;

        const eStart = this.parseLocalDateTime(this.normalizeLocalDateTime(appt.startAt));
        const eEnd = this.parseLocalDateTime(this.normalizeLocalDateTime(appt.endAt));
        if (!eStart || !eEnd) continue;

        if (this.overlaps(pStart, pEnd, eStart, eEnd, buffer)) {
          conflicts.push({
            party: source.party,
            withAppointment: appt,
            reason: buffer > 0 ? `Overlaps with buffer (${buffer} min)` : 'Overlaps'
          });
        }
      }
    }

    return conflicts;
  }

  suggestSlots(options: SuggestSlotsOptions): SuggestedSlot[] {
    const {
      startSearchAt,
      durationMinutes,
      sources,
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
        const conflicts = this.findConflicts(startStr, endStr, sources);

        if (conflicts.length === 0) {
          suggestions.push({
            startAt: startStr,
            endAt: endStr
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
}

