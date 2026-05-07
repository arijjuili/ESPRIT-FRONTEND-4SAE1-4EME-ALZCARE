import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { ChangeDetectorRef } from '@angular/core';
import { of, throwError, Subject } from 'rxjs';

import { DoctorAppointmentsComponent } from './doctor-appointments.component';
import { MedicalFollowupService } from '../../../core/services/medical-followup.service';
import { DoctorPatientContextService } from '../../../core/services/doctor-patient-context.service';
import { AuthService } from '../../../core/services/auth.service';
import { ApiService } from '../../../core/services/api.service';
import { CareTeamService } from '../../../core/services/care-team.service';
import { AppointmentSchedulingService } from '../../../core/services/appointment-scheduling.service';
import { PatientProfileResponse } from '../../../core/services/patient.service';
import { AuthUser } from '../../../core/models/user.model';
import {
  Appointment,
  AppointmentStatus,
  AppointmentType,
  AppointmentPriority,
  AppointmentMode,
  AttendanceStatus,
  PresenceConfirmationStatus,
  OutcomeType
} from '../../../core/models/medical-followup.model';
import { CaregiverAssignment, AssignmentStatus, CaregiverRole } from '../../../core/models/care-team.model';

describe('DoctorAppointmentsComponent', () => {
  let component: DoctorAppointmentsComponent;
  let fixture: ComponentFixture<DoctorAppointmentsComponent>;

  let medicalServiceSpy: jasmine.SpyObj<MedicalFollowupService>;
  let doctorPatientContextSpy: jasmine.SpyObj<DoctorPatientContextService>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let apiServiceSpy: jasmine.SpyObj<ApiService>;
  let careTeamServiceSpy: jasmine.SpyObj<CareTeamService>;
  let schedulingServiceSpy: jasmine.SpyObj<AppointmentSchedulingService>;
  let cdrSpy: jasmine.SpyObj<ChangeDetectorRef>;

  const mockDoctorUser: AuthUser = {
    id: 'doc-1',
    name: 'Dr. Michael',
    email: 'doctor@example.com',
    role: 'doctor',
    token: 'token'
  };

  const mockPatient: PatientProfileResponse = {
    id: 'patient-1',
    userId: 'user-patient-1',
    firstName: 'John',
    lastName: 'Doe'
  };

  const mockAppointment: Appointment = {
    id: 1,
    patientId: 'patient-1',
    doctorId: 'doc-1',
    type: AppointmentType.ROUTINE,
    priority: AppointmentPriority.NORMAL,
    mode: AppointmentMode.ONSITE,
    status: AppointmentStatus.CONFIRMED,
    startAt: '2024-06-15T10:00:00',
    endAt: '2024-06-15T10:30:00',
    createdAt: '2024-06-01T00:00:00Z',
    updatedAt: '2024-06-01T00:00:00Z',
    attendanceStatus: AttendanceStatus.PENDING,
    presenceConfirmationStatus: PresenceConfirmationStatus.PENDING
  };

  const mockCaregiverAssignment: CaregiverAssignment = {
    id: 'assign-1',
    caregiverId: 'cg-1',
    patientId: 'patient-1',
    role: CaregiverRole.PRIMARY,
    status: AssignmentStatus.ACTIVE,
    assignedAt: '2024-01-01T00:00:00Z',
    caregiverFirstName: 'Jane',
    caregiverLastName: 'Smith'
  };

  let routeParamsSubject: Subject<any>;

  beforeEach(async () => {
    routeParamsSubject = new Subject<any>();

    medicalServiceSpy = jasmine.createSpyObj('MedicalFollowupService', [
      'getDoctorAppointments',
      'createAppointment',
      'updateAppointment',
      'changeAppointmentStatus',
      'getPatientAppointments',
      'listAppointments',
      'regenerateTeleconsultationLink',
      'getAppointment',
      'markAppointmentAttended',
      'markAppointmentNoShow'
    ]);

    doctorPatientContextSpy = jasmine.createSpyObj('DoctorPatientContextService', ['getAssignedPatients']);
    authServiceSpy = jasmine.createSpyObj('AuthService', ['getCurrentUser']);
    apiServiceSpy = jasmine.createSpyObj('ApiService', ['getCaregiverByUserId']);
    careTeamServiceSpy = jasmine.createSpyObj('CareTeamService', ['getPatientCaregivers']);

    schedulingServiceSpy = jasmine.createSpyObj('AppointmentSchedulingService', [
      'parseLocalDateTime',
      'normalizeLocalDateTime',
      'isUrgentAppointment',
      'getPriorityRank',
      'analyzeConflicts',
      'toLocalDateTimeString',
      'suggestSlots'
    ]);

    cdrSpy = jasmine.createSpyObj('ChangeDetectorRef', ['detectChanges']);

    await TestBed.configureTestingModule({
      imports: [DoctorAppointmentsComponent],
      providers: [
        { provide: MedicalFollowupService, useValue: medicalServiceSpy },
        { provide: DoctorPatientContextService, useValue: doctorPatientContextSpy },
        { provide: AuthService, useValue: authServiceSpy },
        { provide: ApiService, useValue: apiServiceSpy },
        { provide: CareTeamService, useValue: careTeamServiceSpy },
        { provide: AppointmentSchedulingService, useValue: schedulingServiceSpy },
        { provide: ChangeDetectorRef, useValue: cdrSpy },
        { provide: ActivatedRoute, useValue: { params: routeParamsSubject.asObservable() } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DoctorAppointmentsComponent);
    component = fixture.componentInstance;
  });

  function setupDefaultSpies(): void {
    authServiceSpy.getCurrentUser.and.returnValue(mockDoctorUser);
    medicalServiceSpy.getDoctorAppointments.and.returnValue(of([mockAppointment]));
    doctorPatientContextSpy.getAssignedPatients.and.returnValue(of([mockPatient]));
    schedulingServiceSpy.parseLocalDateTime.and.callFake((value: string) => {
      if (!value || value.length < 16) return null;
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? null : date;
    });
    schedulingServiceSpy.normalizeLocalDateTime.and.callFake((value: string) => {
      if (!value) return '';
      return value.endsWith('Z') ? value.slice(0, -1) : value;
    });
    schedulingServiceSpy.isUrgentAppointment.and.returnValue(false);
    schedulingServiceSpy.getPriorityRank.and.returnValue(2);
    schedulingServiceSpy.analyzeConflicts.and.returnValue({
      conflicts: [],
      blockingConflicts: [],
      preemptibleConflicts: [],
      canProceed: true,
      hasPriorityOverride: false
    });
    schedulingServiceSpy.toLocalDateTimeString.and.callFake((date: Date) => {
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const dd = String(date.getDate()).padStart(2, '0');
      const hh = String(date.getHours()).padStart(2, '0');
      const min = String(date.getMinutes()).padStart(2, '0');
      const ss = String(date.getSeconds()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}T${hh}:${min}:${ss}`;
    });
    careTeamServiceSpy.getPatientCaregivers.and.returnValue(of([mockCaregiverAssignment]));
    apiServiceSpy.getCaregiverByUserId.and.returnValue(of({
      id: 'cg-1',
      userId: 'user-cg-1',
      firstName: 'Jane',
      lastName: 'Smith',
      phone: '1234567890',
      isAvailable: true,
      isProfessional: true,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    }));
    medicalServiceSpy.getPatientAppointments.and.returnValue(of([]));
    medicalServiceSpy.listAppointments.and.returnValue(of([]));
    medicalServiceSpy.regenerateTeleconsultationLink.and.returnValue(of({ meetingUrl: 'https://meet.test/123' }));
    medicalServiceSpy.getAppointment.and.returnValue(of(mockAppointment));
    medicalServiceSpy.markAppointmentAttended.and.returnValue(of(mockAppointment));
    medicalServiceSpy.markAppointmentNoShow.and.returnValue(of(mockAppointment));
    schedulingServiceSpy.suggestSlots.and.returnValue([]);
  }

  it('should create', () => {
    setupDefaultSpies();
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('should load current user, appointments and assigned patients on init', fakeAsync(() => {
      setupDefaultSpies();
      fixture.detectChanges();
      tick();

      expect(authServiceSpy.getCurrentUser).toHaveBeenCalled();
      expect(component.currentUser).toEqual(mockDoctorUser);
      expect(component.doctorId).toBe('doc-1');
      expect(medicalServiceSpy.getDoctorAppointments).toHaveBeenCalledWith(
        'doc-1',
        jasmine.any(String),
        jasmine.any(String)
      );
      expect(component.appointments.length).toBe(1);
      expect(component.appointments[0].id).toBe(1);
      expect(doctorPatientContextSpy.getAssignedPatients).toHaveBeenCalled();
      expect(component.assignedPatients.length).toBe(1);
      expect(component.assignedPatients[0].firstName).toBe('John');
    }));

    it('should handle route param patient id', fakeAsync(() => {
      setupDefaultSpies();
      fixture.detectChanges();
      tick();

      routeParamsSubject.next({ id: 'patient-1' });
      tick();

      expect(component.routePatientId).toBe('patient-1');
    }));

    it('should handle error loading appointments', fakeAsync(() => {
      authServiceSpy.getCurrentUser.and.returnValue(mockDoctorUser);
      medicalServiceSpy.getDoctorAppointments.and.returnValue(throwError(() => new Error('Network error')));
      doctorPatientContextSpy.getAssignedPatients.and.returnValue(of([mockPatient]));

      fixture.detectChanges();
      tick();

      expect(component.error).toBe('Error loading appointments');
      expect(component.loading).toBeFalse();
    }));

    it('should handle error loading assigned patients', fakeAsync(() => {
      authServiceSpy.getCurrentUser.and.returnValue(mockDoctorUser);
      medicalServiceSpy.getDoctorAppointments.and.returnValue(of([mockAppointment]));
      doctorPatientContextSpy.getAssignedPatients.and.returnValue(throwError(() => new Error('Failed')));

      fixture.detectChanges();
      tick();

      expect(component.loadingPatients).toBeFalse();
      expect(component.assignedPatients).toEqual([]);
    }));
  });

  describe('loadCurrentUser', () => {
    it('should set doctorId from current user when role is doctor', () => {
      authServiceSpy.getCurrentUser.and.returnValue(mockDoctorUser);
      component.loadCurrentUser();
      expect(component.currentUser).toEqual(mockDoctorUser);
      expect(component.doctorId).toBe('doc-1');
    });

    it('should fallback to doctorId 1 when user is not a doctor', () => {
      authServiceSpy.getCurrentUser.and.returnValue({
        id: 'admin-1',
        name: 'Admin',
        email: 'admin@example.com',
        role: 'admin',
        token: 'token'
      });
      component.loadCurrentUser();
      expect(component.doctorId).toBe('1');
    });

    it('should fallback to doctorId 1 when no user is authenticated', () => {
      authServiceSpy.getCurrentUser.and.returnValue(null);
      component.loadCurrentUser();
      expect(component.doctorId).toBe('1');
    });
  });

  describe('initializeDateFilters', () => {
    it('should set filterFrom to 30 days ago and filterTo to 90 days ahead', () => {
      const now = new Date();
      component.initializeDateFilters();

      const expectedFirstDay = new Date(now);
      expectedFirstDay.setDate(expectedFirstDay.getDate() - 30);

      const expectedLastDay = new Date(now);
      expectedLastDay.setDate(expectedLastDay.getDate() + 90);
      expectedLastDay.setHours(23, 59, 59, 0);

      expect(component.filterFrom).toContain(`${expectedFirstDay.getFullYear()}`);
      expect(component.filterTo).toContain(`${expectedLastDay.getFullYear()}`);
      expect(component.filterTo).toContain('T23:59');
      expect(component.filterDay).toBe('');
    });
  });

  describe('getDurationMinutes', () => {
    it('should return 30 minutes for a 30-minute appointment', () => {
      const start = '2024-06-15T10:00:00';
      const end = '2024-06-15T10:30:00';
      expect(component.getDurationMinutes(start, end)).toBe(30);
    });

    it('should return 60 minutes for a 1-hour appointment', () => {
      const start = '2024-06-15T10:00:00';
      const end = '2024-06-15T11:00:00';
      expect(component.getDurationMinutes(start, end)).toBe(60);
    });

    it('should return 0 when start and end are the same', () => {
      const start = '2024-06-15T10:00:00';
      const end = '2024-06-15T10:00:00';
      expect(component.getDurationMinutes(start, end)).toBe(0);
    });
  });

  describe('getPatientDisplayName', () => {
    it('should return full name when first and last name are available', () => {
      const patient: PatientProfileResponse = {
        id: 'p1',
        userId: 'u1',
        firstName: 'John',
        lastName: 'Doe'
      };
      expect(component.getPatientDisplayName(patient)).toBe('John Doe');
    });

    it('should return username when name is empty', () => {
      const patient: PatientProfileResponse = {
        id: 'p1',
        userId: 'u1',
        firstName: '',
        lastName: '',
        username: 'johndoe'
      } as any;
      expect(component.getPatientDisplayName(patient)).toBe('johndoe');
    });

    it('should return email when name and username are empty', () => {
      const patient: PatientProfileResponse = {
        id: 'p1',
        userId: 'u1',
        firstName: '',
        lastName: '',
        email: 'john@example.com'
      } as any;
      expect(component.getPatientDisplayName(patient)).toBe('john@example.com');
    });

    it('should return Unknown when all fields are empty', () => {
      const patient: PatientProfileResponse = {
        id: 'p1',
        userId: 'u1',
        firstName: '',
        lastName: ''
      };
      expect(component.getPatientDisplayName(patient)).toBe('Unknown');
    });

    it('should return Unknown when patient is null', () => {
      expect(component.getPatientDisplayName(null as any)).toBe('Unknown');
    });
  });

  describe('form helpers', () => {
    it('should calculate end date from start date and duration', () => {
      component.appointmentDuration = 30;
      component.newAppointment.startAt = '2024-06-15T10:00';
      schedulingServiceSpy.parseLocalDateTime.and.returnValue(new Date('2024-06-15T10:00:00'));
      schedulingServiceSpy.normalizeLocalDateTime.and.returnValue('2024-06-15T10:00:00');

      component.calculateEndDate();

      expect(component.newAppointment.endAt).toContain('2024-06-15T10:30');
    });

    it('should reset end date when start date is invalid', () => {
      component.newAppointment.startAt = '';
      schedulingServiceSpy.parseLocalDateTime.and.returnValue(null);

      component.calculateEndDate();

      expect(component.newAppointment.endAt).toBe('');
    });

    it('should call calculateEndDate on duration change', () => {
      spyOn(component, 'calculateEndDate');
      component.onDurationChange();
      expect(component.calculateEndDate).toHaveBeenCalled();
    });

    it('should update mode constraints when mode changes to ONLINE', () => {
      component.newAppointment.mode = AppointmentMode.ONLINE;
      component.transportDependency = true;
      component.caregiverMustBeAvailable = true;
      component.onModeChange();
      expect(component.transportDependency).toBeFalse();
      expect(component.caregiverMustBeAvailable).toBeFalse();
    });

    it('should keep caregiver required when mode changes to ONSITE', () => {
      component.newAppointment.mode = AppointmentMode.ONSITE;
      component.transportDependency = false;
      component.caregiverMustBeAvailable = false;
      component.onModeChange();
      expect(component.caregiverMustBeAvailable).toBeTrue();
    });

    it('should reset availability on constraints change', () => {
      component.availabilityChecked = true;
      component.onConstraintsChange();
      expect(component.availabilityChecked).toBeFalse();
    });

    it('should clear patient selection', () => {
      component.selectedPatient = mockPatient;
      component.patientSearchQuery = 'John';
      component.newAppointment.patientId = 'patient-1';
      component.linkedCaregiverName = 'Jane';
      component.assignedPatients = [mockPatient];
      component.filteredPatients = [mockPatient];

      component.clearPatientSelection();

      expect(component.selectedPatient).toBeNull();
      expect(component.patientSearchQuery).toBe('');
      expect(component.newAppointment.patientId).toBe('');
      expect(component.linkedCaregiverName).toBeNull();
      expect(component.filteredPatients).toEqual([mockPatient]);
    });
  });

  describe('appointment getters', () => {
    it('should filter appointments by status', () => {
      component.appointments = [
        { ...mockAppointment, status: AppointmentStatus.CONFIRMED },
        { ...mockAppointment, id: 2, status: AppointmentStatus.CANCELLED }
      ];
      component.filterStatus = AppointmentStatus.CONFIRMED;
      expect(component.filteredAppointments.length).toBe(1);
      expect(component.filteredAppointments[0].status).toBe(AppointmentStatus.CONFIRMED);
    });

    it('should hide closed appointments when hideClosed is true', () => {
      component.appointments = [
        { ...mockAppointment, status: AppointmentStatus.CONFIRMED },
        { ...mockAppointment, id: 2, status: AppointmentStatus.CANCELLED },
        { ...mockAppointment, id: 3, status: AppointmentStatus.COMPLETED }
      ];
      component.filterStatus = 'ALL';
      component.hideClosed = true;
      expect(component.filteredAppointments.length).toBe(1);
    });

    it('should count appointments by status', () => {
      component.appointments = [
        { ...mockAppointment, status: AppointmentStatus.CONFIRMED },
        { ...mockAppointment, id: 2, status: AppointmentStatus.COMPLETED },
        { ...mockAppointment, id: 3, status: AppointmentStatus.CANCELLED }
      ];
      expect(component.confirmedCount).toBe(1);
      expect(component.completedCount).toBe(1);
      expect(component.cancelledCount).toBe(1);
    });
  });

  describe('day filter', () => {
    it('should apply day filter and load appointments', () => {
      setupDefaultSpies();
      component.applyDayFilter('2024-06-15');
      expect(component.filterDay).toBe('2024-06-15');
      expect(medicalServiceSpy.getDoctorAppointments).toHaveBeenCalled();
    });

    it('should return early for invalid day format', () => {
      component.applyDayFilter('invalid');
      expect(component.filterDay).toBe('');
    });

    it('should clear day filter and reload', () => {
      setupDefaultSpies();
      component.filterDay = '2024-06-15';
      component.clearDayFilter();
      expect(component.filterDay).toBe('');
      expect(medicalServiceSpy.getDoctorAppointments).toHaveBeenCalled();
    });
  });

  describe('patient search and selection', () => {
    it('should not search when patient is locked', () => {
      component.patientLocked = true;
      const event = { target: { value: 'John' } } as any;
      component.onPatientSearch(event);
      expect(component.patientSearchQuery).toBe('');
    });

    it('should filter patients by query', () => {
      component.assignedPatients = [mockPatient];
      component.patientLocked = false;
      const event = { target: { value: 'John' } } as any;
      component.onPatientSearch(event);
      expect(component.filteredPatients.length).toBe(1);
      expect(component.showPatientDropdown).toBeTrue();
    });

    it('should reset to all patients when query is empty', () => {
      component.assignedPatients = [mockPatient];
      component.patientLocked = false;
      const event = { target: { value: '' } } as any;
      component.onPatientSearch(event);
      expect(component.filteredPatients).toEqual([mockPatient]);
    });

    it('should select patient and load caregiver', fakeAsync(() => {
      setupDefaultSpies();
      component.assignedPatients = [mockPatient];
      component.selectPatient(mockPatient);
      tick();
      expect(component.selectedPatient).toEqual(mockPatient);
      expect(component.newAppointment.patientId).toBe('user-patient-1');
    }));
  });

  describe('modal and form', () => {
    it('should open and close modal', () => {
      component.openModal();
      expect(component.showModal).toBeTrue();
      component.closeModal();
      expect(component.showModal).toBeFalse();
      expect(component.patientLocked).toBeFalse();
    });

    it('should return correct modal title for reschedule', () => {
      component.modalMode = 'reschedule';
      expect(component.modalTitle).toBe('Reschedule Appointment');
    });

    it('should return correct modal title for followup', () => {
      component.modalMode = 'create';
      component.modalIntent = 'followup';
      expect(component.modalTitle).toBe('Suggested Follow-up');
    });

    it('should return submit label when loading', () => {
      component.loading = true;
      component.modalMode = 'create';
      expect(component.modalSubmitLabel).toBe('Creating...');
    });

    it('should return submit label for reschedule', () => {
      component.loading = false;
      component.availabilityLoading = false;
      component.modalMode = 'reschedule';
      expect(component.modalSubmitLabel).toBe('Save Reschedule');
    });
  });

  describe('appointment status actions', () => {
    it('should accept appointment', fakeAsync(() => {
      setupDefaultSpies();
      component.appointments = [{ ...mockAppointment, status: AppointmentStatus.REQUESTED }];
      medicalServiceSpy.changeAppointmentStatus.and.returnValue(of({ ...mockAppointment, status: AppointmentStatus.ACCEPTED }));
      component.acceptAppointment(1);
      tick();
      expect(component.appointments[0].status).toBe(AppointmentStatus.ACCEPTED);
    }));

    it('should confirm appointment', fakeAsync(() => {
      setupDefaultSpies();
      component.appointments = [mockAppointment];
      medicalServiceSpy.changeAppointmentStatus.and.returnValue(of({ ...mockAppointment, status: AppointmentStatus.CONFIRMED }));
      component.confirmAppointment(1);
      tick();
      expect(component.appointments[0].status).toBe(AppointmentStatus.CONFIRMED);
    }));

    it('should cancel appointment', fakeAsync(() => {
      setupDefaultSpies();
      spyOn(window, 'confirm').and.returnValue(true);
      component.appointments = [mockAppointment];
      medicalServiceSpy.changeAppointmentStatus.and.returnValue(of({ ...mockAppointment, status: AppointmentStatus.CANCELLED }));
      component.cancelAppointment(1);
      tick();
      expect(component.appointments[0].status).toBe(AppointmentStatus.CANCELLED);
    }));

    it('should complete appointment and open outcome modal', () => {
      component.appointments = [mockAppointment];
      component.completeAppointment(1);
      expect(component.showOutcomeModal).toBeTrue();
      expect(component.outcomeModalAppointment).not.toBeNull();
    });
  });

  describe('outcome modal', () => {
    it('should open and close outcome modal', () => {
      component.openOutcomeModal(mockAppointment);
      expect(component.showOutcomeModal).toBeTrue();
      component.closeOutcomeModal();
      expect(component.showOutcomeModal).toBeFalse();
    });

    it('should save outcome without completing', fakeAsync(() => {
      setupDefaultSpies();
      component.outcomeModalAppointment = mockAppointment;
      component.completeAfterOutcomeSave = false;
      component.outcomeAttendance = AttendanceStatus.CONFIRMED;
      component.outcomeType = OutcomeType.STABLE;
      medicalServiceSpy.updateAppointment.and.returnValue(of({ ...mockAppointment, outcomeType: OutcomeType.STABLE }));
      component.saveOutcomeAndMaybeComplete();
      tick();
      expect(component.showOutcomeModal).toBeFalse();
    }));

    it('should save outcome then complete', fakeAsync(() => {
      setupDefaultSpies();
      component.appointments = [mockAppointment];
      component.outcomeModalAppointment = mockAppointment;
      component.completeAfterOutcomeSave = true;
      component.outcomeAttendance = AttendanceStatus.CONFIRMED;
      component.outcomeType = OutcomeType.STABLE;
      medicalServiceSpy.updateAppointment.and.returnValue(of({ ...mockAppointment, outcomeType: OutcomeType.STABLE }));
      medicalServiceSpy.changeAppointmentStatus.and.returnValue(of({ ...mockAppointment, status: AppointmentStatus.COMPLETED }));
      component.saveOutcomeAndMaybeComplete();
      tick();
      expect(component.showOutcomeModal).toBeFalse();
    }));

    it('should handle save outcome error with backend message', fakeAsync(() => {
      setupDefaultSpies();
      component.outcomeModalAppointment = mockAppointment;
      component.outcomeSaving = true;
      medicalServiceSpy.updateAppointment.and.returnValue(throwError(() => ({ error: { message: 'Server error' } })));
      component.saveOutcomeAndMaybeComplete();
      tick();
      expect(component.error).toContain('Server error');
      expect(component.outcomeSaving).toBeFalse();
    }));

    it('should handle save outcome error with string body', fakeAsync(() => {
      setupDefaultSpies();
      component.outcomeModalAppointment = mockAppointment;
      component.outcomeSaving = true;
      medicalServiceSpy.updateAppointment.and.returnValue(throwError(() => ({ error: 'String error' })));
      component.saveOutcomeAndMaybeComplete();
      tick();
      expect(component.error).toContain('String error');
    }));

    it('should return null for follow-up preview when no appointment', () => {
      component.outcomeModalAppointment = null;
      expect(component.getOutcomeModalFollowUpPreviewStartAt()).toBeNull();
    });

    it('should return preview start at when appointment exists', () => {
      const appt = { ...mockAppointment, outcomeType: OutcomeType.FOLLOW_UP_NEEDED };
      component.outcomeModalAppointment = appt;
      component.outcomeType = OutcomeType.FOLLOW_UP_NEEDED;
      schedulingServiceSpy.parseLocalDateTime.and.returnValue(new Date('2024-06-15T10:00:00'));
      const result = component.getOutcomeModalFollowUpPreviewStartAt();
      expect(result).not.toBeNull();
    });
  });

  describe('availability check', () => {
    it('should show error when caregiver required but not linked for ONSITE', fakeAsync(() => {
      setupDefaultSpies();
      component.newAppointment = {
        patientId: 'patient-1',
        doctorId: 'doc-1',
        type: AppointmentType.ROUTINE,
        priority: AppointmentPriority.NORMAL,
        mode: AppointmentMode.ONSITE,
        startAt: '2024-06-15T10:00',
        endAt: '2024-06-15T10:30'
      };
      component.caregiverMustBeAvailable = true;
      component.linkedCaregiverId = null;
      component.appointmentDuration = 30;
      schedulingServiceSpy.parseLocalDateTime.and.returnValue(new Date('2024-06-15T10:00:00'));
      (component as any).runAvailabilityCheck();
      tick();
      expect(component.availabilityChecked).toBeTrue();
      expect(component.availabilityConflicts.length).toBeGreaterThan(0);
    }));

    it('should show invalid start date error', () => {
      component.newAppointment = { startAt: 'invalid', endAt: '' } as any;
      schedulingServiceSpy.normalizeLocalDateTime.and.returnValue('invalid');
      schedulingServiceSpy.parseLocalDateTime.and.returnValue(null);
      (component as any).runAvailabilityCheck();
      expect(component.availabilityError).toBe('Invalid start date/time.');
    });

    it('should call onAvailable when can proceed', fakeAsync(() => {
      setupDefaultSpies();
      component.newAppointment = {
        patientId: 'patient-1',
        doctorId: 'doc-1',
        type: AppointmentType.ROUTINE,
        priority: AppointmentPriority.NORMAL,
        mode: AppointmentMode.ONSITE,
        startAt: '2024-06-15T10:00',
        endAt: '2024-06-15T10:30'
      };
      component.caregiverMustBeAvailable = false;
      component.appointmentDuration = 30;
      schedulingServiceSpy.parseLocalDateTime.and.returnValue(new Date('2024-06-15T10:00:00'));
      const onAvailable = jasmine.createSpy('onAvailable');
      (component as any).runAvailabilityCheck(onAvailable);
      tick();
      expect(onAvailable).toHaveBeenCalled();
    }));

    it('should handle availability check error', fakeAsync(() => {
      setupDefaultSpies();
      component.newAppointment = {
        patientId: 'patient-1',
        doctorId: 'doc-1',
        type: AppointmentType.ROUTINE,
        priority: AppointmentPriority.NORMAL,
        mode: AppointmentMode.ONSITE,
        startAt: '2024-06-15T10:00',
        endAt: '2024-06-15T10:30'
      };
      component.caregiverMustBeAvailable = false;
      component.appointmentDuration = 30;
      schedulingServiceSpy.parseLocalDateTime.and.returnValue(new Date('2024-06-15T10:00:00'));
      medicalServiceSpy.getDoctorAppointments.and.returnValue(throwError(() => new Error('fail')));
      (component as any).runAvailabilityCheck();
      tick();
      expect(component.availabilityChecked).toBeTrue();
    }));
  });

  describe('create and reschedule', () => {
    it('should validate appointment with missing patient', () => {
      component.newAppointment.patientId = '';
      expect(component.validateAppointment()).toBeFalse();
      expect(component.error).toContain('select a patient');
    });

    it('should validate appointment with missing start', () => {
      component.newAppointment.patientId = 'p1';
      component.newAppointment.startAt = '';
      expect(component.validateAppointment()).toBeFalse();
    });

    it('should validate appointment with start in the past', () => {
      component.newAppointment.patientId = 'p1';
      component.newAppointment.startAt = '2020-01-01T00:00';
      component.newAppointment.endAt = '2020-01-01T01:00';
      schedulingServiceSpy.normalizeLocalDateTime.and.callFake((v: string) => v);
      schedulingServiceSpy.parseLocalDateTime.and.returnValue(new Date('2020-01-01T00:00'));
      expect(component.validateAppointment()).toBeFalse();
    });

    it('should validate appointment with end before start', () => {
      const future = new Date();
      future.setDate(future.getDate() + 1);
      const yyyy = future.getFullYear();
      const mm = String(future.getMonth() + 1).padStart(2, '0');
      const dd = String(future.getDate()).padStart(2, '0');
      component.newAppointment.patientId = 'p1';
      component.newAppointment.startAt = `${yyyy}-${mm}-${dd}T12:00`;
      component.newAppointment.endAt = `${yyyy}-${mm}-${dd}T10:00`;
      schedulingServiceSpy.normalizeLocalDateTime.and.callFake((v: string) => v);
      schedulingServiceSpy.parseLocalDateTime.and.callFake((v: string) => new Date(v));
      expect(component.validateAppointment()).toBeFalse();
    });

    it('should create appointment', fakeAsync(() => {
      setupDefaultSpies();
      const future = new Date();
      future.setDate(future.getDate() + 1);
      const yyyy = future.getFullYear();
      const mm = String(future.getMonth() + 1).padStart(2, '0');
      const dd = String(future.getDate()).padStart(2, '0');
      component.newAppointment = {
        patientId: 'patient-1',
        doctorId: 'doc-1',
        type: AppointmentType.ROUTINE,
        priority: AppointmentPriority.NORMAL,
        mode: AppointmentMode.ONSITE,
        startAt: `${yyyy}-${mm}-${dd}T10:00`,
        endAt: `${yyyy}-${mm}-${dd}T10:30`
      };
      component.appointmentDuration = 30;
      schedulingServiceSpy.parseLocalDateTime.and.callFake((v: string) => new Date(v));
      schedulingServiceSpy.normalizeLocalDateTime.and.callFake((v: string) => v);
      medicalServiceSpy.createAppointment.and.returnValue(of(mockAppointment));
      spyOn(component as any, 'runAvailabilityCheck').and.callFake((cb?: any) => { if (cb) cb(); });
      component.createAppointment();
      tick();
      expect(medicalServiceSpy.createAppointment).toHaveBeenCalled();
    }));

    it('should open reschedule modal', () => {
      setupDefaultSpies();
      component.appointments = [mockAppointment];
      schedulingServiceSpy.parseLocalDateTime.and.returnValue(new Date('2024-06-15T10:00:00'));
      schedulingServiceSpy.normalizeLocalDateTime.and.returnValue('2024-06-15T10:00:00');
      component.openRescheduleModal(mockAppointment);
      expect(component.showModal).toBeTrue();
      expect(component.modalMode).toBe('reschedule');
    });
  });

  describe('appointmentsByDay getter', () => {
    it('should group urgent appointments first when status is REQUESTED', () => {
      schedulingServiceSpy.isUrgentAppointment.and.returnValues(true, false);
      component.filterStatus = AppointmentStatus.REQUESTED;
      component.appointments = [
        { ...mockAppointment, id: 1, status: AppointmentStatus.REQUESTED, priority: AppointmentPriority.CRITICAL },
        { ...mockAppointment, id: 2, status: AppointmentStatus.REQUESTED, priority: AppointmentPriority.NORMAL }
      ];
      const groups = component.appointmentsByDay;
      expect(groups.length).toBeGreaterThan(0);
      expect(groups[0].dayKey).toBe('URGENT');
    });
  });

  describe('compareAppointments', () => {
    it('should sort by priority when same time', () => {
      schedulingServiceSpy.isUrgentAppointment.and.returnValue(false);
      schedulingServiceSpy.getPriorityRank.and.returnValue(1);
      const a = { ...mockAppointment, startAt: '2024-06-15T10:00', priority: AppointmentPriority.NORMAL };
      const b = { ...mockAppointment, id: 2, startAt: '2024-06-15T10:00', priority: AppointmentPriority.CRITICAL };
      const result = (component as any).compareAppointments(a, b);
      expect(typeof result).toBe('number');
    });
  });

  describe('teleconsultation', () => {
    it('should check if teleconsultation is active', () => {
      const appt = { ...mockAppointment, mode: AppointmentMode.ONLINE, status: AppointmentStatus.CONFIRMED, meetingUrl: 'https://meet.test' };
      expect(component.isTeleconsultationActive(appt)).toBeTrue();
    });

    it('should check if teleconsultation is pending', () => {
      const appt = { ...mockAppointment, mode: AppointmentMode.ONLINE, status: AppointmentStatus.REQUESTED };
      expect(component.isTeleconsultationPending(appt)).toBeTrue();
    });

    it('should check if appointment is cancelled', () => {
      const appt = { ...mockAppointment, status: AppointmentStatus.CANCELLED };
      expect(component.isAppointmentCancelled(appt)).toBeTrue();
    });
  });

  describe('meeting URL', () => {
    it('should fetch meeting URL via regenerate', fakeAsync(() => {
      setupDefaultSpies();
      component.currentUser = mockDoctorUser;
      component.appointments = [mockAppointment];
      component.fetchMeetingUrl(1);
      tick();
      expect(medicalServiceSpy.regenerateTeleconsultationLink).toHaveBeenCalled();
    }));

    it('should fallback to confirm then reload when regenerate fails', fakeAsync(() => {
      setupDefaultSpies();
      component.currentUser = mockDoctorUser;
      component.appointments = [mockAppointment];
      medicalServiceSpy.regenerateTeleconsultationLink.and.returnValue(throwError(() => new Error('fail')));
      medicalServiceSpy.changeAppointmentStatus.and.returnValue(of({ ...mockAppointment, meetingUrl: 'https://meet.test/123' }));
      component.fetchMeetingUrl(1);
      tick();
      expect(medicalServiceSpy.changeAppointmentStatus).toHaveBeenCalled();
    }));

    it('should alert when no current user on fetchMeetingUrl', () => {
      spyOn(window, 'alert');
      component.currentUser = null;
      component.fetchMeetingUrl(1);
      expect(window.alert).toHaveBeenCalledWith('User not authenticated');
    });

    it('should join valid meeting URL', () => {
      spyOn(window, 'open');
      component.joinMeeting('https://meet.test/123');
      expect(window.open).toHaveBeenCalled();
    });

    it('should alert for invalid meeting URL', () => {
      spyOn(window, 'alert');
      component.joinMeeting('javascript:alert(1)');
      expect(window.alert).toHaveBeenCalledWith('Invalid meeting URL. Please contact support.');
    });

    it('should copy meeting URL', () => {
      spyOn(navigator.clipboard, 'writeText').and.returnValue(Promise.resolve());
      spyOn(window, 'alert');
      component.copyMeetingUrl('https://meet.test/123');
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('https://meet.test/123');
    });

    it('should fallback copy when clipboard fails', fakeAsync(() => {
      spyOn(navigator.clipboard, 'writeText').and.returnValue(Promise.reject(new Error('fail')));
      spyOn(window, 'alert');
      component.copyMeetingUrl('https://meet.test/123');
      tick();
      expect(window.alert).toHaveBeenCalled();
    }));
  });

  describe('attendance actions', () => {
    it('should mark attendance confirmed', fakeAsync(() => {
      setupDefaultSpies();
      component.appointments = [mockAppointment];
      component.markAttendanceConfirmed(1);
      tick();
      expect(medicalServiceSpy.markAppointmentAttended).toHaveBeenCalled();
    }));

    it('should mark no-show', fakeAsync(() => {
      setupDefaultSpies();
      component.appointments = [mockAppointment];
      component.markNoShow(1);
      tick();
      expect(medicalServiceSpy.markAppointmentNoShow).toHaveBeenCalled();
    }));
  });

  describe('reload single appointment', () => {
    it('should reload appointment and update list', fakeAsync(() => {
      setupDefaultSpies();
      component.appointments = [mockAppointment];
      medicalServiceSpy.getAppointment.and.returnValue(of({ ...mockAppointment, meetingUrl: 'https://meet.test/updated' }));
      component.reloadSingleAppointment(1);
      tick();
      expect(medicalServiceSpy.getAppointment).toHaveBeenCalledWith(1);
    }));
  });

  describe('follow-up suggestions', () => {
    it('should suggest follow-up for completed with FOLLOW_UP_NEEDED', () => {
      const appt = { ...mockAppointment, status: AppointmentStatus.COMPLETED, outcomeType: OutcomeType.FOLLOW_UP_NEEDED };
      expect(component.shouldSuggestFollowUp(appt)).toBeTrue();
    });

    it('should get follow-up label for urgent', () => {
      const appt = { ...mockAppointment, outcomeType: OutcomeType.URGENT_FOLLOW_UP };
      expect(component.getFollowUpSuggestionLabel(appt)).toContain('urgent');
    });

    it('should get follow-up start date', () => {
      schedulingServiceSpy.parseLocalDateTime.and.returnValue(new Date('2024-06-15T10:00:00'));
      const appt = { ...mockAppointment, outcomeType: OutcomeType.FOLLOW_UP_NEEDED };
      const result = component.getSuggestedFollowUpStartAt(appt);
      expect(result).not.toBeNull();
    });

    it('should return null for invalid base date', () => {
      schedulingServiceSpy.parseLocalDateTime.and.returnValue(null);
      const appt = { ...mockAppointment, outcomeType: OutcomeType.FOLLOW_UP_NEEDED };
      expect(component.getSuggestedFollowUpStartAt(appt)).toBeNull();
    });
  });

  describe('badge classes', () => {
    it('should return status class for REQUESTED', () => {
      const result = component.getStatusClass(AppointmentStatus.REQUESTED);
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should return attendance status class for CONFIRMED', () => {
      expect(component.getAttendanceStatusClass(AttendanceStatus.CONFIRMED)).toContain('emerald');
    });

    it('should return attendance status class for NO_SHOW', () => {
      expect(component.getAttendanceStatusClass(AttendanceStatus.NO_SHOW)).toContain('rose');
    });

    it('should return presence status class for DECLINED', () => {
      expect(component.getPresenceStatusClass(PresenceConfirmationStatus.DECLINED)).toContain('rose');
    });
  });

  describe('utility methods', () => {
    it('should format date display', () => {
      const result = component.formatDateDisplay('2024-06-15T10:00:00');
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should get patient name by id', () => {
      component.assignedPatients = [mockPatient];
      expect(component.getPatientNameById('patient-1')).toContain('John');
    });

    it('should find patient by any id', () => {
      component.assignedPatients = [mockPatient];
      expect((component as any).findPatientByAnyId('user-patient-1')).toEqual(mockPatient);
    });

    it('should extract caregiver id from patient', () => {
      const patientWithCg = { ...mockPatient, caregiverId: 'cg-1' } as any;
      expect((component as any).extractCaregiverId(patientWithCg)).toBe('cg-1');
    });
  });

  describe('preselectPatientFromRoute', () => {
    it('should return early when no routePatientId', () => {
      component.routePatientId = null;
      component.preselectPatientFromRoute();
      expect(component.selectedPatient).toBeNull();
    });

    it('should return early when no assigned patients', () => {
      component.routePatientId = 'patient-1';
      component.assignedPatients = [];
      component.preselectPatientFromRoute();
      expect(component.selectedPatient).toBeNull();
    });
  });
});
