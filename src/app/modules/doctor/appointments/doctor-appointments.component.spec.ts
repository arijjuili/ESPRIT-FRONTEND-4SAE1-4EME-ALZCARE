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
  PresenceConfirmationStatus
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
      'listAppointments'
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
      'toLocalDateTimeString'
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
});
