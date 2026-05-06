import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { BehaviorSubject, of, throwError, Subject } from 'rxjs';

import { CaregiverDashboardComponent } from './caregiver-dashboard.component';
import { AuthService } from '../../../core/services/auth.service';
import { ApiService } from '../../../core/services/api.service';
import { DataService } from '../../../core/services/data.service';
import { MedicalFollowupService } from '../../../core/services/medical-followup.service';
import { SafetyAlertService } from '../../../core/services/safety-alert.service';
import { DailyCareService } from '../../../core/services/daily-care.service';
import { PatientService, PatientProfileResponse } from '../../../core/services/patient.service';
import { CareTeamService } from '../../../core/services/care-team.service';
import { CaregiverPatientContextService } from '../../../core/services/caregiver-patient-context.service';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { AlertPollingService } from '../../../core/services/alert-polling.service';
import { NotificationService } from '../../../core/services/notification.service';
import { Router, ActivatedRoute, Event } from '@angular/router';

import { AuthUser, CareTask } from '../../../core/models/user.model';
import { CaregiverRole, AssignmentStatus, CaregiverAssignment } from '../../../core/models/care-team.model';
import { DailyCheckInStatus, HealthRecord, RecordType } from '../../../core/models/api.model';
import { AutonomySuggestion } from '../../../core/models/daily-care.model';

describe('CaregiverDashboardComponent', () => {
  let component: CaregiverDashboardComponent;
  let fixture: ComponentFixture<CaregiverDashboardComponent>;

  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let apiServiceSpy: jasmine.SpyObj<ApiService>;
  let dataServiceSpy: jasmine.SpyObj<DataService>;
  let medicalServiceSpy: jasmine.SpyObj<MedicalFollowupService>;
  let safetyAlertServiceSpy: jasmine.SpyObj<SafetyAlertService>;
  let dailyCareServiceSpy: jasmine.SpyObj<DailyCareService>;
  let patientServiceSpy: jasmine.SpyObj<PatientService>;
  let careTeamServiceSpy: jasmine.SpyObj<CareTeamService>;
  let caregiverPatientContextSpy: jasmine.SpyObj<CaregiverPatientContextService>;
  let toastServiceSpy: jasmine.SpyObj<ToastService>;
  let alertPollingSpy: jasmine.SpyObj<AlertPollingService>;
  let notificationServiceSpy: jasmine.SpyObj<NotificationService>;
  let routerSpy: any;

  const mockUser: AuthUser = {
    id: 'cg-1',
    name: 'Test Caregiver',
    email: 'caregiver@example.com',
    role: 'caregiver',
    token: 'mock-token'
  };

  const mockPatient: PatientProfileResponse = {
    id: 'p1',
    userId: 'u1',
    firstName: 'John',
    lastName: 'Doe'
  };

  beforeEach(async () => {
    authServiceSpy = jasmine.createSpyObj('AuthService', ['getCurrentUser']);
    (authServiceSpy as any).currentUser$ = new BehaviorSubject(null).asObservable();

    apiServiceSpy = jasmine.createSpyObj('ApiService', [
      'getHealthRecords',
      'getDailyCheckInStatus',
      'submitCaregiverDailyCheckIn',
      'getGameActivities'
    ]);

    dataServiceSpy = jasmine.createSpyObj('DataService', ['getTasksForCaregiver', 'updateTaskStatus']);

    medicalServiceSpy = jasmine.createSpyObj('MedicalFollowupService', [
      'getPatientAppointments',
      'createAppointment',
      'getDoctorAppointments'
    ]);

    safetyAlertServiceSpy = jasmine.createSpyObj('SafetyAlertService', [
      'getBehaviorLogsByPatient',
      'resolveAlert',
      'getPendingValidations',
      'validateBehavior',
      'createManualBehaviorLog'
    ]);

    dailyCareServiceSpy = jasmine.createSpyObj('DailyCareService', [
      'getAllHabits',
      'assignHabitToPatient',
      'unassignHabitFromPatient',
      'getAssignedHabitsForPatient',
      'generateAutonomySuggestion',
      'submitAutonomySuggestion'
    ]);

    patientServiceSpy = jasmine.createSpyObj('PatientService', ['getPatientProfile']);

    careTeamServiceSpy = jasmine.createSpyObj('CareTeamService', [
      'getCaregiverAssignments',
      'acceptInvite',
      'getPatientDoctor'
    ]);

    caregiverPatientContextSpy = jasmine.createSpyObj('CaregiverPatientContextService', [
      'getActiveAssignments',
      'getAssignedPatients',
      'invalidate'
    ]);

    toastServiceSpy = jasmine.createSpyObj('ToastService', ['success', 'error', 'info', 'show']);

    alertPollingSpy = jasmine.createSpyObj('AlertPollingService', ['refresh']);
    (alertPollingSpy as any).alerts$ = new BehaviorSubject([]).asObservable();
    (alertPollingSpy as any).alertCount$ = new BehaviorSubject(0).asObservable();
    (alertPollingSpy as any).criticalCount$ = new BehaviorSubject(0).asObservable();

    notificationServiceSpy = jasmine.createSpyObj('NotificationService', [
      'markAsRead',
      'getUserNotifications',
      'getUnreadCount'
    ]);
    (notificationServiceSpy as any).notifications$ = new BehaviorSubject([]).asObservable();
    (notificationServiceSpy as any).unreadCount$ = new BehaviorSubject(0).asObservable();

    routerSpy = {
      navigate: jasmine.createSpy('navigate'),
      navigateByUrl: jasmine.createSpy('navigateByUrl'),
      createUrlTree: jasmine.createSpy('createUrlTree').and.returnValue({}),
      serializeUrl: jasmine.createSpy('serializeUrl').and.returnValue(''),
      events: of({} as Event),
      url: '/'
    };

    // Set default return values so detectChanges() doesn't crash
    authServiceSpy.getCurrentUser.and.returnValue(mockUser);
    dataServiceSpy.getTasksForCaregiver.and.returnValue([]);
    caregiverPatientContextSpy.getActiveAssignments.and.returnValue(of([]));
    caregiverPatientContextSpy.getAssignedPatients.and.returnValue(of([]));
    apiServiceSpy.getHealthRecords.and.returnValue(of([]));
    apiServiceSpy.getDailyCheckInStatus.and.returnValue(of({
      patientId: '',
      checkInFrequencyHours: 24,
      currentStreak: 0,
      missedDays: 0,
      completedToday: false,
      dueNow: false
    } as DailyCheckInStatus));
    apiServiceSpy.submitCaregiverDailyCheckIn.and.returnValue(of({
      id: '',
      patientId: '',
      recordType: RecordType.DAILY_CHECKIN,
      date: new Date().toISOString()
    } as HealthRecord));
    apiServiceSpy.getGameActivities.and.returnValue(of([]));
    medicalServiceSpy.getPatientAppointments.and.returnValue(of([]));
    medicalServiceSpy.createAppointment.and.returnValue(of({} as any));
    medicalServiceSpy.getDoctorAppointments.and.returnValue(of([]));
    safetyAlertServiceSpy.getBehaviorLogsByPatient.and.returnValue(of([]));
    safetyAlertServiceSpy.resolveAlert.and.returnValue(of(undefined));
    safetyAlertServiceSpy.getPendingValidations.and.returnValue(of([]));
    safetyAlertServiceSpy.validateBehavior.and.returnValue(of({} as any));
    safetyAlertServiceSpy.createManualBehaviorLog.and.returnValue(of({} as any));
    dailyCareServiceSpy.getAllHabits.and.returnValue(of([]));
    dailyCareServiceSpy.assignHabitToPatient.and.returnValue(of({} as any));
    dailyCareServiceSpy.unassignHabitFromPatient.and.returnValue(of(undefined));
    dailyCareServiceSpy.getAssignedHabitsForPatient.and.returnValue(of([]));
    dailyCareServiceSpy.generateAutonomySuggestion.and.returnValue(of({} as any));
    dailyCareServiceSpy.submitAutonomySuggestion.and.returnValue(of({
      id: 1,
      patientId: '',
      mobilityLevel: 'INDEPENDENT' as any,
      hygieneLevel: 'INDEPENDENT' as any,
      medicationLevel: 'INDEPENDENT' as any,
      decisionMakingLevel: 'INDEPENDENT' as any
    } as AutonomySuggestion));
    careTeamServiceSpy.getCaregiverAssignments.and.returnValue(of([]));
    careTeamServiceSpy.acceptInvite.and.returnValue(of({} as any));
    careTeamServiceSpy.getPatientDoctor.and.returnValue(of({} as any));
    notificationServiceSpy.markAsRead.and.returnValue(of(undefined));
    notificationServiceSpy.getUserNotifications.and.returnValue(of({
      content: [],
      totalElements: 0,
      totalPages: 0,
      size: 10,
      number: 0,
      first: true,
      last: true
    } as any));
    notificationServiceSpy.getUnreadCount.and.returnValue(of(0));

    await TestBed.configureTestingModule({
      imports: [CaregiverDashboardComponent],
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: ApiService, useValue: apiServiceSpy },
        { provide: DataService, useValue: dataServiceSpy },
        { provide: MedicalFollowupService, useValue: medicalServiceSpy },
        { provide: SafetyAlertService, useValue: safetyAlertServiceSpy },
        { provide: DailyCareService, useValue: dailyCareServiceSpy },
        { provide: PatientService, useValue: patientServiceSpy },
        { provide: CareTeamService, useValue: careTeamServiceSpy },
        { provide: CaregiverPatientContextService, useValue: caregiverPatientContextSpy },
        { provide: ToastService, useValue: toastServiceSpy },
        { provide: AlertPollingService, useValue: alertPollingSpy },
        { provide: NotificationService, useValue: notificationServiceSpy },
        { provide: Router, useValue: routerSpy as any },
        { provide: ActivatedRoute, useValue: { params: new Subject().asObservable() } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CaregiverDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load user and patients on init', () => {
    expect(authServiceSpy.getCurrentUser).toHaveBeenCalled();
    expect(component.caregiverName).toBe('Test Caregiver');
    expect(component.caregiverId).toBe('cg-1');
    expect(caregiverPatientContextSpy.getActiveAssignments).toHaveBeenCalled();
    expect(caregiverPatientContextSpy.getAssignedPatients).toHaveBeenCalled();
    expect(component.patients).toEqual([]);
    expect(component.caregiverAssignments).toEqual([]);
    expect(component.allTasks).toEqual([]);
  });

  describe('getPatientName', () => {
    it('should return full name when patient is found', () => {
      component.patients = [mockPatient];
      expect(component.getPatientName('p1')).toBe('John Doe');
    });

    it('should return full name when matched by userId', () => {
      component.patients = [mockPatient];
      expect(component.getPatientName('u1')).toBe('John Doe');
    });

    it('should return Unknown when patient is not found', () => {
      component.patients = [];
      expect(component.getPatientName('unknown')).toBe('Unknown');
    });
  });

  describe('getRoleBadgeClass', () => {
    it('should return primary role badge class', () => {
      expect(component.getRoleBadgeClass(CaregiverRole.PRIMARY))
        .toBe('bg-emerald-100 text-emerald-800 border-emerald-200');
    });

    it('should return family role badge class', () => {
      expect(component.getRoleBadgeClass(CaregiverRole.FAMILY))
        .toBe('bg-blue-100 text-blue-800 border-blue-200');
    });

    it('should return emergency role badge class', () => {
      expect(component.getRoleBadgeClass(CaregiverRole.EMERGENCY))
        .toBe('bg-rose-100 text-rose-800 border-rose-200');
    });

    it('should return gray class when role is undefined', () => {
      expect(component.getRoleBadgeClass(undefined))
        .toBe('bg-gray-100 text-gray-800');
    });
  });

  describe('getRoleLabel', () => {
    it('should return PRIMARY for primary role', () => {
      expect(component.getRoleLabel(CaregiverRole.PRIMARY)).toBe('PRIMARY');
    });

    it('should return FAMILY for family role', () => {
      expect(component.getRoleLabel(CaregiverRole.FAMILY)).toBe('FAMILY');
    });

    it('should return EMERGENCY for emergency role', () => {
      expect(component.getRoleLabel(CaregiverRole.EMERGENCY)).toBe('EMERGENCY');
    });

    it('should return Unknown when role is undefined', () => {
      expect(component.getRoleLabel(undefined)).toBe('Unknown');
    });
  });

  describe('toggleTask', () => {
    it('should toggle task completion and call updateTaskStatus', () => {
      component.allTasks = [
        { id: 't1', title: 'Task 1', completed: false } as CareTask
      ];
      component.toggleTask('t1');
      expect(component.allTasks[0].completed).toBeTrue();
      expect(dataServiceSpy.updateTaskStatus).toHaveBeenCalledWith('t1', true);
    });

    it('should toggle task back to incomplete', () => {
      component.allTasks = [
        { id: 't1', title: 'Task 1', completed: true } as CareTask
      ];
      component.toggleTask('t1');
      expect(component.allTasks[0].completed).toBeFalse();
      expect(dataServiceSpy.updateTaskStatus).toHaveBeenCalledWith('t1', false);
    });

    it('should do nothing when task id is not found', () => {
      component.allTasks = [];
      component.toggleTask('missing');
      expect(dataServiceSpy.updateTaskStatus).not.toHaveBeenCalled();
    });
  });

  describe('alertSeverityClass', () => {
    it('should return class for CRITICAL severity', () => {
      expect(component.alertSeverityClass('CRITICAL'))
        .toBe('bg-red-100 text-red-800 border-red-200');
    });

    it('should return class for HIGH severity', () => {
      expect(component.alertSeverityClass('HIGH'))
        .toBe('bg-orange-100 text-orange-800 border-orange-200');
    });

    it('should return class for MEDIUM severity', () => {
      expect(component.alertSeverityClass('MEDIUM'))
        .toBe('bg-yellow-100 text-yellow-800 border-yellow-200');
    });

    it('should return class for LOW severity', () => {
      expect(component.alertSeverityClass('LOW'))
        .toBe('bg-green-100 text-green-800 border-green-200');
    });

    it('should return default class for unknown severity', () => {
      expect(component.alertSeverityClass('UNKNOWN'))
        .toBe('bg-gray-100 text-gray-700 border-gray-200');
    });
  });
});
