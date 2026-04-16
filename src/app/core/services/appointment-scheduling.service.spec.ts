import { TestBed } from '@angular/core/testing';
import {
  AppointmentSchedulingService,
  AvailabilitySource
} from './appointment-scheduling.service';
import {
  Appointment,
  AppointmentStatus,
  AppointmentType,
  AppointmentPriority,
  AppointmentMode
} from '../models/medical-followup.model';

describe('AppointmentSchedulingService', () => {
  let service: AppointmentSchedulingService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AppointmentSchedulingService]
    });
    service = TestBed.inject(AppointmentSchedulingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Date/Time Parsing', () => {
    it('should parse local datetime string correctly', () => {
      const date = service.parseLocalDateTime('2024-06-15T10:30:00');
      expect(date).not.toBeNull();
      expect(date!.getFullYear()).toBe(2024);
      expect(date!.getMonth()).toBe(5); // June = 5
      expect(date!.getDate()).toBe(15);
      expect(date!.getHours()).toBe(10);
      expect(date!.getMinutes()).toBe(30);
    });

    it('should return null for invalid datetime strings', () => {
      expect(service.parseLocalDateTime('')).toBeNull();
      expect(service.parseLocalDateTime('not-a-date')).toBeNull();
      expect(service.parseLocalDateTime('2024-06-15')).toBeNull();
    });

    it('should convert Date to local datetime string', () => {
      const date = new Date(2024, 5, 15, 9, 5, 7);
      expect(service.toLocalDateTimeString(date)).toBe('2024-06-15T09:05:07');
    });

    it('should normalize datetime strings without seconds', () => {
      expect(service.normalizeLocalDateTime('2024-06-15T10:30')).toBe('2024-06-15T10:30:00');
    });

    it('should strip trailing Z during normalization', () => {
      expect(service.normalizeLocalDateTime('2024-06-15T10:30:00Z')).toBe('2024-06-15T10:30:00');
    });
  });

  describe('Blocking Status', () => {
    it('should return false for CANCELLED and REJECTED statuses', () => {
      expect(service.isBlockingStatus(AppointmentStatus.CANCELLED)).toBeFalse();
      expect(service.isBlockingStatus(AppointmentStatus.REJECTED)).toBeFalse();
    });

    it('should return true for other statuses', () => {
      expect(service.isBlockingStatus(AppointmentStatus.CONFIRMED)).toBeTrue();
      expect(service.isBlockingStatus(AppointmentStatus.COMPLETED)).toBeTrue();
      expect(service.isBlockingStatus(AppointmentStatus.REQUESTED)).toBeTrue();
      expect(service.isBlockingStatus(AppointmentStatus.ACCEPTED)).toBeTrue();
    });
  });

  describe('Priority & Urgency', () => {
    it('should detect urgent appointments', () => {
      expect(service.isUrgentAppointment({ type: AppointmentType.EMERGENCY, priority: AppointmentPriority.NORMAL })).toBeTrue();
      expect(service.isUrgentAppointment({ type: AppointmentType.ROUTINE, priority: AppointmentPriority.CRITICAL })).toBeTrue();
    });

    it('should detect routine appointments', () => {
      expect(service.isRoutineAppointment({ type: AppointmentType.ROUTINE, priority: AppointmentPriority.NORMAL })).toBeTrue();
      expect(service.isRoutineAppointment({ type: AppointmentType.EMERGENCY, priority: AppointmentPriority.CRITICAL })).toBeFalse();
    });

    it('should return correct priority rank', () => {
      expect(service.getPriorityRank(AppointmentPriority.CRITICAL)).toBe(4);
      expect(service.getPriorityRank(AppointmentPriority.HIGH)).toBe(3);
      expect(service.getPriorityRank(AppointmentPriority.NORMAL)).toBe(2);
      expect(service.getPriorityRank(AppointmentPriority.LOW)).toBe(1);
      expect(service.getPriorityRank(undefined)).toBe(1);
    });
  });

  describe('Overlap Detection', () => {
    it('should detect overlapping time ranges', () => {
      const pStart = new Date(2024, 5, 15, 10, 0);
      const pEnd = new Date(2024, 5, 15, 11, 0);
      const eStart = new Date(2024, 5, 15, 10, 30);
      const eEnd = new Date(2024, 5, 15, 11, 30);

      expect(service.overlaps(pStart, pEnd, eStart, eEnd)).toBeTrue();
    });

    it('should return false for non-overlapping ranges', () => {
      const pStart = new Date(2024, 5, 15, 10, 0);
      const pEnd = new Date(2024, 5, 15, 11, 0);
      const eStart = new Date(2024, 5, 15, 11, 0);
      const eEnd = new Date(2024, 5, 15, 12, 0);

      expect(service.overlaps(pStart, pEnd, eStart, eEnd)).toBeFalse();
    });

    it('should respect buffer minutes', () => {
      const pStart = new Date(2024, 5, 15, 11, 0);
      const pEnd = new Date(2024, 5, 15, 12, 0);
      const eStart = new Date(2024, 5, 15, 12, 10);
      const eEnd = new Date(2024, 5, 15, 13, 0);

      // 10 min gap, 15 min buffer -> overlaps because buffer extends existing
      expect(service.overlaps(pStart, pEnd, eStart, eEnd, 15)).toBeTrue();
      // 10 min gap, 5 min buffer -> no overlap
      expect(service.overlaps(pStart, pEnd, eStart, eEnd, 5)).toBeFalse();
    });
  });

  describe('Conflict Analysis', () => {
    it('should return empty conflicts when no overlap', () => {
      const proposed = { startAt: '2024-06-15T10:00:00', endAt: '2024-06-15T11:00:00', type: AppointmentType.ROUTINE, priority: AppointmentPriority.NORMAL };
      const existing: Appointment = {
        id: 1, patientId: 'p1', doctorId: 'd1', type: AppointmentType.ROUTINE, priority: AppointmentPriority.NORMAL,
        mode: AppointmentMode.ONSITE, status: AppointmentStatus.CONFIRMED,
        startAt: '2024-06-15T12:00:00', endAt: '2024-06-15T13:00:00', createdAt: '', updatedAt: ''
      };
      const source: AvailabilitySource = { party: 'DOCTOR', appointments: [existing] };

      const analysis = service.analyzeConflicts(proposed, [source]);
      expect(analysis.conflicts.length).toBe(0);
      expect(analysis.canProceed).toBeTrue();
    });

    it('should detect blocking conflict for overlapping routine appointments', () => {
      const proposed = { startAt: '2024-06-15T10:00:00', endAt: '2024-06-15T11:00:00', type: AppointmentType.ROUTINE, priority: AppointmentPriority.NORMAL };
      const existing: Appointment = {
        id: 1, patientId: 'p1', doctorId: 'd1', type: AppointmentType.ROUTINE, priority: AppointmentPriority.NORMAL,
        mode: AppointmentMode.ONSITE, status: AppointmentStatus.CONFIRMED,
        startAt: '2024-06-15T10:30:00', endAt: '2024-06-15T11:30:00', createdAt: '', updatedAt: ''
      };
      const source: AvailabilitySource = { party: 'DOCTOR', appointments: [existing] };

      const analysis = service.analyzeConflicts(proposed, [source]);
      expect(analysis.conflicts.length).toBe(1);
      expect(analysis.blockingConflicts.length).toBe(1);
      expect(analysis.canProceed).toBeFalse();
    });

    it('should detect preemptible conflict when urgent overlaps routine', () => {
      const proposed = { startAt: '2024-06-15T10:00:00', endAt: '2024-06-15T11:00:00', type: AppointmentType.EMERGENCY, priority: AppointmentPriority.CRITICAL };
      const existing: Appointment = {
        id: 1, patientId: 'p1', doctorId: 'd1', type: AppointmentType.ROUTINE, priority: AppointmentPriority.NORMAL,
        mode: AppointmentMode.ONSITE, status: AppointmentStatus.CONFIRMED,
        startAt: '2024-06-15T10:30:00', endAt: '2024-06-15T11:30:00', createdAt: '', updatedAt: ''
      };
      const source: AvailabilitySource = { party: 'DOCTOR', appointments: [existing] };

      const analysis = service.analyzeConflicts(proposed, [source]);
      expect(analysis.conflicts.length).toBe(1);
      expect(analysis.preemptibleConflicts.length).toBe(1);
      expect(analysis.blockingConflicts.length).toBe(0);
      expect(analysis.canProceed).toBeTrue();
      expect(analysis.hasPriorityOverride).toBeTrue();
    });

    it('should skip cancelled or rejected appointments', () => {
      const proposed = { startAt: '2024-06-15T10:00:00', endAt: '2024-06-15T11:00:00', type: AppointmentType.ROUTINE, priority: AppointmentPriority.NORMAL };
      const cancelled: Appointment = {
        id: 1, patientId: 'p1', doctorId: 'd1', type: AppointmentType.ROUTINE, priority: AppointmentPriority.NORMAL,
        mode: AppointmentMode.ONSITE, status: AppointmentStatus.CANCELLED,
        startAt: '2024-06-15T10:30:00', endAt: '2024-06-15T11:30:00', createdAt: '', updatedAt: ''
      };
      const source: AvailabilitySource = { party: 'DOCTOR', appointments: [cancelled] };

      const analysis = service.analyzeConflicts(proposed, [source]);
      expect(analysis.conflicts.length).toBe(0);
    });

    it('should return canProceed false for invalid proposed dates', () => {
      const analysis = service.analyzeConflicts(
        { startAt: 'invalid', endAt: 'invalid', type: AppointmentType.ROUTINE, priority: AppointmentPriority.NORMAL },
        []
      );
      expect(analysis.canProceed).toBeFalse();
      expect(analysis.conflicts.length).toBe(0);
    });
  });

  describe('Find Conflicts', () => {
    it('should wrap analyzeConflicts for simple conflict lookup', () => {
      const existing: Appointment = {
        id: 1, patientId: 'p1', doctorId: 'd1', type: AppointmentType.ROUTINE, priority: AppointmentPriority.NORMAL,
        mode: AppointmentMode.ONSITE, status: AppointmentStatus.CONFIRMED,
        startAt: '2024-06-15T10:30:00', endAt: '2024-06-15T11:30:00', createdAt: '', updatedAt: ''
      };
      const source: AvailabilitySource = { party: 'DOCTOR', appointments: [existing] };

      const conflicts = service.findConflicts('2024-06-15T10:00:00', '2024-06-15T11:00:00', [source]);
      expect(conflicts.length).toBe(1);
    });
  });

  describe('Suggest Slots', () => {
    it('should suggest available slots without conflicts', () => {
      // Start search on a Monday at 08:00
      const monday = new Date(2024, 5, 10, 8, 0, 0); // June 10, 2024 is Monday
      const startSearchAt = service.toLocalDateTimeString(monday);

      const slots = service.suggestSlots({
        startSearchAt,
        durationMinutes: 30,
        sources: [], // no existing appointments
        type: AppointmentType.ROUTINE,
        priority: AppointmentPriority.NORMAL,
        mode: AppointmentMode.ONSITE,
        maxSuggestions: 3
      });

      expect(slots.length).toBe(3);
      expect(slots[0].startAt).toBe('2024-06-10T09:00:00');
      expect(slots[0].endAt).toBe('2024-06-10T09:30:00');
    });

    it('should skip weekends when skipWeekends is true', () => {
      // Start search on a Saturday
      const saturday = new Date(2024, 5, 15, 8, 0, 0); // June 15, 2024 is Saturday
      const startSearchAt = service.toLocalDateTimeString(saturday);

      const slots = service.suggestSlots({
        startSearchAt,
        durationMinutes: 30,
        sources: [],
        type: AppointmentType.ROUTINE,
        priority: AppointmentPriority.NORMAL,
        mode: AppointmentMode.ONSITE,
        maxSuggestions: 2,
        skipWeekends: true
      });

      // Should jump to Monday
      expect(slots.length).toBe(2);
      expect(slots[0].startAt).toContain('06-17'); // Monday June 17
    });

    it('should include preemptible note for urgent slots', () => {
      const monday = new Date(2024, 5, 10, 8, 0, 0);
      const startSearchAt = service.toLocalDateTimeString(monday);

      const existing: Appointment = {
        id: 1, patientId: 'p1', doctorId: 'd1', type: AppointmentType.ROUTINE, priority: AppointmentPriority.NORMAL,
        mode: AppointmentMode.ONSITE, status: AppointmentStatus.CONFIRMED,
        startAt: '2024-06-10T09:00:00', endAt: '2024-06-10T09:30:00', createdAt: '', updatedAt: ''
      };
      const source: AvailabilitySource = { party: 'DOCTOR', appointments: [existing] };

      const slots = service.suggestSlots({
        startSearchAt,
        durationMinutes: 30,
        sources: [source],
        type: AppointmentType.EMERGENCY,
        priority: AppointmentPriority.CRITICAL,
        mode: AppointmentMode.ONSITE,
        maxSuggestions: 2
      });

      // The 09:00 slot should be suggested because emergency can preempt routine
      expect(slots.length).toBeGreaterThan(0);
      const preemptedSlot = slots.find(s => s.startAt === '2024-06-10T09:00:00');
      expect(preemptedSlot).toBeTruthy();
      expect(preemptedSlot!.note).toContain('Urgent visit can preempt routine appointments');
    });

    it('should return empty array for invalid startSearchAt', () => {
      const slots = service.suggestSlots({
        startSearchAt: 'invalid-datetime',
        durationMinutes: 30,
        sources: [],
        type: AppointmentType.ROUTINE,
        priority: AppointmentPriority.NORMAL,
        mode: AppointmentMode.ONSITE
      });

      expect(slots).toEqual([]);
    });
  });
});
