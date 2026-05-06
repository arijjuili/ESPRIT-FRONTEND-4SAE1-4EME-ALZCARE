import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { PatientAppointmentsComponent } from './patient-appointments.component';
import { AuthService } from '../../../core/services/auth.service';
import { MedicalFollowupService } from '../../../core/services/medical-followup.service';
import { Appointment, AppointmentStatus, AppointmentMode, PresenceConfirmationStatus, AttendanceStatus } from '../../../core/models/medical-followup.model';
import { of, throwError } from 'rxjs';

describe('PatientAppointmentsComponent', () => {
  let component: PatientAppointmentsComponent;
  let fixture: ComponentFixture<PatientAppointmentsComponent>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let medicalServiceSpy: jasmine.SpyObj<MedicalFollowupService>;

  const mockAppointment: Appointment = {
    id: 1,
    patientId: 'patient-1',
    doctorId: 'doctor-1',
    startAt: new Date(Date.now() + 86400000).toISOString(),
    endAt: new Date(Date.now() + 90000000).toISOString(),
    status: AppointmentStatus.CONFIRMED,
    mode: AppointmentMode.ONSITE,
    type: 'ROUTINE' as any,
    priority: 'NORMAL' as any,
    attendanceStatus: AttendanceStatus.PENDING,
    presenceConfirmationStatus: PresenceConfirmationStatus.PENDING,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  };

  beforeEach(async () => {
    authServiceSpy = jasmine.createSpyObj('AuthService', ['getCurrentUser']);
    medicalServiceSpy = jasmine.createSpyObj('MedicalFollowupService', [
      'getPatientAppointments',
      'confirmPresence',
      'declinePresence',
      'getAppointment',
      'getAppointmentSchedulingRecommendation'
    ]);

    await TestBed.configureTestingModule({
      imports: [PatientAppointmentsComponent],
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: MedicalFollowupService, useValue: medicalServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PatientAppointmentsComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    authServiceSpy.getCurrentUser.and.returnValue({ id: 'patient-1', name: 'John', email: 'john@example.com', role: 'patient', token: 'token' });
    medicalServiceSpy.getPatientAppointments.and.returnValue(of([]));
    medicalServiceSpy.getAppointmentSchedulingRecommendation.and.returnValue(of({} as any));
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should show error when no user is authenticated', () => {
    authServiceSpy.getCurrentUser.and.returnValue(null);
    fixture.detectChanges();
    expect(component.error).toBe('No authenticated user found');
    expect(component.loading).toBeFalse();
  });

  it('should load appointments on init', fakeAsync(() => {
    authServiceSpy.getCurrentUser.and.returnValue({ id: 'patient-1', name: 'John', email: 'john@example.com', role: 'patient', token: 'token' });
    medicalServiceSpy.getPatientAppointments.and.returnValue(of([mockAppointment]));
    medicalServiceSpy.getAppointmentSchedulingRecommendation.and.returnValue(of({ preferredWindow: 'MORNING' } as any));
    fixture.detectChanges();
    tick();

    expect(component.patientId).toBe('patient-1');
    expect(component.appointments.length).toBe(1);
    expect(component.loading).toBeFalse();
  }));

  it('should handle error loading appointments', fakeAsync(() => {
    authServiceSpy.getCurrentUser.and.returnValue({ id: 'patient-1', name: 'John', email: 'john@example.com', role: 'patient', token: 'token' });
    medicalServiceSpy.getPatientAppointments.and.returnValue(throwError(() => new Error('Network error')));
    medicalServiceSpy.getAppointmentSchedulingRecommendation.and.returnValue(of({} as any));
    fixture.detectChanges();
    tick();

    expect(component.error).toBe('Failed to load appointments');
    expect(component.loading).toBeFalse();
  }));

  it('should filter appointments by status', () => {
    authServiceSpy.getCurrentUser.and.returnValue({ id: 'patient-1', name: 'John', email: 'john@example.com', role: 'patient', token: 'token' });
    medicalServiceSpy.getPatientAppointments.and.returnValue(of([
      { ...mockAppointment, status: AppointmentStatus.CONFIRMED },
      { ...mockAppointment, id: 2, status: AppointmentStatus.CANCELLED }
    ]));
    medicalServiceSpy.getAppointmentSchedulingRecommendation.and.returnValue(of({} as any));
    fixture.detectChanges();

    component.setFilter('CONFIRMED');
    expect(component.filteredAppointments.length).toBe(1);
    expect(component.filteredAppointments[0].status).toBe(AppointmentStatus.CONFIRMED);

    component.setFilter('ALL');
    expect(component.filteredAppointments.length).toBe(2);
  });

  it('should get upcoming appointments', () => {
    authServiceSpy.getCurrentUser.and.returnValue({ id: 'patient-1', name: 'John', email: 'john@example.com', role: 'patient', token: 'token' });
    medicalServiceSpy.getPatientAppointments.and.returnValue(of([
      mockAppointment,
      { ...mockAppointment, id: 2, startAt: new Date(Date.now() - 86400000).toISOString() }
    ]));
    medicalServiceSpy.getAppointmentSchedulingRecommendation.and.returnValue(of({} as any));
    fixture.detectChanges();

    expect(component.upcomingAppointments.length).toBe(1);
    expect(component.pastAppointments.length).toBe(1);
  });

  it('should count online appointments', () => {
    authServiceSpy.getCurrentUser.and.returnValue({ id: 'patient-1', name: 'John', email: 'john@example.com', role: 'patient', token: 'token' });
    medicalServiceSpy.getPatientAppointments.and.returnValue(of([
      { ...mockAppointment, mode: AppointmentMode.ONLINE },
      { ...mockAppointment, id: 2, mode: AppointmentMode.ONSITE }
    ]));
    medicalServiceSpy.getAppointmentSchedulingRecommendation.and.returnValue(of({} as any));
    fixture.detectChanges();

    expect(component.onlineAppointmentsCount).toBe(1);
  });

  it('should confirm presence', fakeAsync(() => {
    authServiceSpy.getCurrentUser.and.returnValue({ id: 'patient-1', name: 'John', email: 'john@example.com', role: 'patient', token: 'token' });
    medicalServiceSpy.getPatientAppointments.and.returnValue(of([mockAppointment]));
    medicalServiceSpy.getAppointmentSchedulingRecommendation.and.returnValue(of({} as any));
    medicalServiceSpy.confirmPresence.and.returnValue(of({ ...mockAppointment, presenceConfirmationStatus: PresenceConfirmationStatus.CONFIRMED }));
    fixture.detectChanges();
    tick();

    component.confirmPresence(mockAppointment);
    tick();

    expect(medicalServiceSpy.confirmPresence).toHaveBeenCalledWith(1, 'patient-1');
    expect(component.successMessage).toBe('Your attendance has been confirmed.');
  }));

  it('should decline presence', fakeAsync(() => {
    authServiceSpy.getCurrentUser.and.returnValue({ id: 'patient-1', name: 'John', email: 'john@example.com', role: 'patient', token: 'token' });
    medicalServiceSpy.getPatientAppointments.and.returnValue(of([mockAppointment]));
    medicalServiceSpy.getAppointmentSchedulingRecommendation.and.returnValue(of({} as any));
    medicalServiceSpy.declinePresence.and.returnValue(of({ ...mockAppointment, presenceConfirmationStatus: PresenceConfirmationStatus.DECLINED }));
    fixture.detectChanges();
    tick();

    component.declinePresence(mockAppointment);
    tick();

    expect(medicalServiceSpy.declinePresence).toHaveBeenCalledWith(1, 'patient-1');
    expect(component.successMessage).toBe('Your absence has been recorded.');
  }));

  it('should check if action is loading', () => {
    expect(component.isActionLoading(1)).toBeFalse();
    component.actionAppointmentId = 1;
    expect(component.isActionLoading(1)).toBeTrue();
    expect(component.isActionLoading(2)).toBeFalse();
  });

  it('should determine if online appointment', () => {
    expect(component.isOnlineAppointment({ mode: AppointmentMode.ONLINE } as any)).toBeTrue();
    expect(component.isOnlineAppointment({ mode: AppointmentMode.ONSITE } as any)).toBeFalse();
  });

  it('should determine if teleconsultation is active', () => {
    expect(component.isTeleconsultationActive({
      mode: AppointmentMode.ONLINE,
      status: AppointmentStatus.CONFIRMED,
      meetingUrl: 'https://meet.test'
    } as any)).toBeTrue();
    expect(component.isTeleconsultationActive({
      mode: AppointmentMode.ONLINE,
      status: AppointmentStatus.CONFIRMED
    } as any)).toBeFalse();
  });

  it('should determine if teleconsultation is pending', () => {
    expect(component.isTeleconsultationPending({
      mode: AppointmentMode.ONLINE,
      status: AppointmentStatus.REQUESTED
    } as any)).toBeTrue();
    expect(component.isTeleconsultationPending({
      mode: AppointmentMode.ONLINE,
      status: AppointmentStatus.CONFIRMED
    } as any)).toBeFalse();
  });

  it('should check if appointment is cancelled', () => {
    expect(component.isAppointmentCancelled({ status: AppointmentStatus.CANCELLED } as any)).toBeTrue();
    expect(component.isAppointmentCancelled({ status: AppointmentStatus.CONFIRMED } as any)).toBeFalse();
  });

  it('should get mode badge class', () => {
    expect(component.getModeBadgeClass(AppointmentMode.ONLINE)).toContain('purple');
    expect(component.getModeBadgeClass(AppointmentMode.ONSITE)).toContain('blue');
  });

  it('should get mode icon', () => {
    expect(component.getModeIcon(AppointmentMode.ONLINE)).toBe('💻');
    expect(component.getModeIcon(AppointmentMode.ONSITE)).toBe('🏥');
  });

  it('should get appointment status class', () => {
    expect(component.getAppointmentStatusClass(AppointmentStatus.CONFIRMED)).toContain('green');
    expect(component.getAppointmentStatusClass(AppointmentStatus.CANCELLED)).toContain('gray');
  });

  it('should get status icon', () => {
    expect(component.getStatusIcon(AppointmentStatus.CONFIRMED)).toBe('✅');
    expect(component.getStatusIcon(AppointmentStatus.CANCELLED)).toBe('🚫');
  });

  it('should get presence status class', () => {
    expect(component.getPresenceStatusClass(PresenceConfirmationStatus.CONFIRMED)).toContain('emerald');
    expect(component.getPresenceStatusClass(PresenceConfirmationStatus.DECLINED)).toContain('rose');
    expect(component.getPresenceStatusClass(PresenceConfirmationStatus.PENDING)).toContain('amber');
  });

  it('should get attendance status class', () => {
    expect(component.getAttendanceStatusClass(AttendanceStatus.CONFIRMED)).toContain('emerald');
    expect(component.getAttendanceStatusClass(AttendanceStatus.NO_SHOW)).toContain('rose');
  });

  it('should format date time', () => {
    const result = component.formatDateTime('2024-01-15T10:30:00');
    expect(result).not.toBe('Not sent yet');
  });

  it('should return Not sent yet for empty date', () => {
    expect(component.formatDateTime(undefined)).toBe('Not sent yet');
  });

  it('should get preferred window label', () => {
    expect(component.getPreferredWindowLabel('AFTERNOON')).toBe('Afternoon recommended');
    expect(component.getPreferredWindowLabel('MORNING')).toBe('Morning recommended');
    expect(component.getPreferredWindowLabel(undefined)).toBe('Flexible schedule');
  });

  it('should format date', () => {
    const result = component.formatDate('2024-01-15');
    expect(result).toContain('15');
  });

  it('should format time', () => {
    const result = component.formatTime('2024-01-15T10:30:00');
    expect(result).toContain('10');
  });

  it('should get duration minutes', () => {
    const start = new Date('2024-01-15T10:00:00').toISOString();
    const end = new Date('2024-01-15T10:30:00').toISOString();
    expect(component.getDurationMinutes(start, end)).toBe(30);
  });

  it('should check if upcoming', () => {
    expect(component.isUpcoming(mockAppointment)).toBeTrue();
    expect(component.isUpcoming({ ...mockAppointment, startAt: new Date(Date.now() - 86400000).toISOString() })).toBeFalse();
  });
});
