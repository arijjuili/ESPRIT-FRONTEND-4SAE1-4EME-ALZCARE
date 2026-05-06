import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { PatientMedicationsComponent } from './patient-medications.component';
import { AuthService } from '../../../core/services/auth.service';
import { MedicalFollowupService } from '../../../core/services/medical-followup.service';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { MedicationPlan, MedicationItem, MedicationIntake, IntakeStatus, PlanStatus, MedicationAutonomyLevel, FrequencyType } from '../../../core/models/medical-followup.model';
import { of, throwError } from 'rxjs';

describe('PatientMedicationsComponent', () => {
  let component: PatientMedicationsComponent;
  let fixture: ComponentFixture<PatientMedicationsComponent>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let medicalServiceSpy: jasmine.SpyObj<MedicalFollowupService>;
  let toastServiceSpy: jasmine.SpyObj<ToastService>;

  const mockItem: MedicationItem = {
    id: 1,
    planId: 1,
    name: 'Aspirin',
    dosage: '100mg',
    frequency: FrequencyType.DAILY,
    timesOfDay: '08:00',
    isHighRisk: false,
    stockQuantity: 30,
    lowThreshold: 5,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  };

  const mockPlan: MedicationPlan = {
    id: 1,
    patientId: 'patient-1',
    doctorId: 'doctor-1',
    title: 'Test Plan',
    notes: 'Test notes',
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    autonomyLevel: MedicationAutonomyLevel.INDEPENDENT,
    status: PlanStatus.ACTIVE,
    version: 1,
    lastRiskLevel: 'LOW' as any,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    items: [mockItem]
  };

  beforeEach(async () => {
    authServiceSpy = jasmine.createSpyObj('AuthService', ['getCurrentUser']);
    medicalServiceSpy = jasmine.createSpyObj('MedicalFollowupService', [
      'getPatientMedicationPlans',
      'getMedicationItems',
      'getMedicationIntakesByDateRange',
      'confirmMedicationIntake',
      'markMedicationIntakeAsMissed'
    ]);
    toastServiceSpy = jasmine.createSpyObj('ToastService', ['show', 'success', 'error', 'warning', 'info']);

    await TestBed.configureTestingModule({
      imports: [PatientMedicationsComponent],
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: MedicalFollowupService, useValue: medicalServiceSpy },
        { provide: ToastService, useValue: toastServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PatientMedicationsComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    authServiceSpy.getCurrentUser.and.returnValue({ id: 'patient-1', name: 'John', email: 'john@example.com', role: 'patient', token: 'token' });
    medicalServiceSpy.getPatientMedicationPlans.and.returnValue(of([mockPlan]));
    medicalServiceSpy.getMedicationIntakesByDateRange.and.returnValue(of([]));
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should show error when no user is authenticated', () => {
    authServiceSpy.getCurrentUser.and.returnValue(null);
    fixture.detectChanges();
    expect(component.error).toBe('No authenticated user found');
    expect(toastServiceSpy.show).toHaveBeenCalledWith('Please sign in again to view your medications.', 'error');
  });

  it('should load medication plans on init', fakeAsync(() => {
    authServiceSpy.getCurrentUser.and.returnValue({ id: 'patient-1', name: 'John', email: 'john@example.com', role: 'patient', token: 'token' });
    medicalServiceSpy.getPatientMedicationPlans.and.returnValue(of([mockPlan]));
    medicalServiceSpy.getMedicationIntakesByDateRange.and.returnValue(of([]));
    fixture.detectChanges();
    tick();

    expect(component.patientId).toBe('patient-1');
    expect(component.medicationPlans.length).toBe(1);
    expect(component.totalPlans).toBe(1);
    expect(component.activePlans).toBe(1);
    expect(component.loading).toBeFalse();
  }));

  it('should handle error loading medication plans', fakeAsync(() => {
    authServiceSpy.getCurrentUser.and.returnValue({ id: 'patient-1', name: 'John', email: 'john@example.com', role: 'patient', token: 'token' });
    medicalServiceSpy.getPatientMedicationPlans.and.returnValue(throwError(() => new Error('Network error')));
    medicalServiceSpy.getMedicationIntakesByDateRange.and.returnValue(of([]));
    fixture.detectChanges();
    tick();

    expect(component.error).toBe('Unable to load medications from server');
    expect(toastServiceSpy.show).toHaveBeenCalledWith('Unable to load medications from server.', 'error');
    expect(component.loading).toBeFalse();
  }));

  it('should hydrate plan items when empty', fakeAsync(() => {
    authServiceSpy.getCurrentUser.and.returnValue({ id: 'patient-1', name: 'John', email: 'john@example.com', role: 'patient', token: 'token' });
    const planWithoutItems = { ...mockPlan, items: undefined as any };
    medicalServiceSpy.getPatientMedicationPlans.and.returnValue(of([planWithoutItems]));
    medicalServiceSpy.getMedicationItems.and.returnValue(of([mockItem]));
    medicalServiceSpy.getMedicationIntakesByDateRange.and.returnValue(of([]));
    fixture.detectChanges();
    tick();

    expect(component.medicationPlans[0].items).toEqual([mockItem]);
  }));

  it('should calculate stats', () => {
    authServiceSpy.getCurrentUser.and.returnValue({ id: 'patient-1', name: 'John', email: 'john@example.com', role: 'patient', token: 'token' });
    medicalServiceSpy.getPatientMedicationPlans.and.returnValue(of([
      { ...mockPlan, items: [{ ...mockItem, isHighRisk: true }] }
    ]));
    medicalServiceSpy.getMedicationIntakesByDateRange.and.returnValue(of([]));
    fixture.detectChanges();

    expect(component.highRiskItems).toBe(1);
  });

  it('should get all medication items', () => {
    authServiceSpy.getCurrentUser.and.returnValue({ id: 'patient-1', name: 'John', email: 'john@example.com', role: 'patient', token: 'token' });
    medicalServiceSpy.getPatientMedicationPlans.and.returnValue(of([mockPlan]));
    medicalServiceSpy.getMedicationIntakesByDateRange.and.returnValue(of([]));
    fixture.detectChanges();

    expect(component.allMedicationItems.length).toBe(1);
  });

  it('should check low stock', () => {
    expect(component.isLowStock({ ...mockItem, stockQuantity: 3, lowThreshold: 5 })).toBeTrue();
    expect(component.isLowStock({ ...mockItem, stockQuantity: 10, lowThreshold: 5 })).toBeFalse();
  });

  it('should parse times of day', () => {
    expect(component.parseTimesOfDay('08:00,20:00')).toEqual(['08:00', '20:00']);
    expect(component.parseTimesOfDay('MORNING,EVENING')).toEqual(['08:00', '18:00']);
    expect(component.parseTimesOfDay('')).toEqual([]);
  });

  it('should navigate months', () => {
    authServiceSpy.getCurrentUser.and.returnValue({ id: 'patient-1', name: 'John', email: 'john@example.com', role: 'patient', token: 'token' });
    medicalServiceSpy.getPatientMedicationPlans.and.returnValue(of([mockPlan]));
    medicalServiceSpy.getMedicationIntakesByDateRange.and.returnValue(of([]));
    fixture.detectChanges();

    const initialMonth = component.viewMonth.getMonth();
    component.prevMonth();
    expect(component.viewMonth.getMonth()).toBe((initialMonth - 1 + 12) % 12);
    component.nextMonth();
    expect(component.viewMonth.getMonth()).toBe(initialMonth);
  });

  it('should open and close day modal', () => {
    authServiceSpy.getCurrentUser.and.returnValue({ id: 'patient-1', name: 'John', email: 'john@example.com', role: 'patient', token: 'token' });
    const todayPlan = { ...mockPlan, startDate: new Date().toISOString().split('T')[0], endDate: undefined };
    medicalServiceSpy.getPatientMedicationPlans.and.returnValue(of([todayPlan]));
    medicalServiceSpy.getMedicationIntakesByDateRange.and.returnValue(of([]));
    fixture.detectChanges();

    const cell = component.calendarDays.find((c: any) => c.isToday)!;
    expect(cell).toBeTruthy();
    component.openDay(cell);
    expect(component.selectedDayKey).toBe(cell.dateKey);
    expect(component.selectedDayDate).toEqual(cell.date);

    component.closeDayModal();
    expect(component.selectedDayKey).toBeNull();
  });

  it('should format time', () => {
    expect(component.formatTime('2024-01-15T08:30:00')).toContain('8');
  });

  it('should get segment class', () => {
    expect(component.getSegmentClass(IntakeStatus.TAKEN)).toBe('bg-success');
    expect(component.getSegmentClass(IntakeStatus.PENDING)).toBe('bg-gray-200');
    expect(component.getSegmentClass(IntakeStatus.MISSED)).toBe('bg-danger');
  });

  it('should check if patient can confirm', () => {
    expect(component.canPatientConfirm({ autonomyLevel: MedicationAutonomyLevel.INDEPENDENT } as any)).toBeTrue();
    expect(component.canPatientConfirm({ autonomyLevel: MedicationAutonomyLevel.ASSISTED } as any)).toBeFalse();
  });

  it('should get confirm button title', () => {
    authServiceSpy.getCurrentUser.and.returnValue({ id: 'patient-1', name: 'John', email: 'john@example.com', role: 'patient', token: 'token' });
    medicalServiceSpy.getPatientMedicationPlans.and.returnValue(of([mockPlan]));
    medicalServiceSpy.getMedicationIntakesByDateRange.and.returnValue(of([]));
    fixture.detectChanges();

    const futureIntake = { scheduledAt: new Date(Date.now() + 86400000).toISOString() } as MedicationIntake;
    expect(component.getConfirmButtonTitle(futureIntake)).toContain('only confirm');
  });

  it('should not confirm future intake', () => {
    authServiceSpy.getCurrentUser.and.returnValue({ id: 'patient-1', name: 'John', email: 'john@example.com', role: 'patient', token: 'token' });
    medicalServiceSpy.getPatientMedicationPlans.and.returnValue(of([mockPlan]));
    medicalServiceSpy.getMedicationIntakesByDateRange.and.returnValue(of([]));
    fixture.detectChanges();

    component.selectedDayKey = component['toDateKey'](new Date());
    const futureIntake = { id: 1, scheduledAt: new Date(Date.now() + 86400000).toISOString(), status: IntakeStatus.PENDING } as MedicationIntake;
    component.confirmIntake(futureIntake);
    expect(toastServiceSpy.show).toHaveBeenCalledWith('You can only confirm an intake on its scheduled day.', 'warning');
  });

  it('should confirm intake', fakeAsync(() => {
    authServiceSpy.getCurrentUser.and.returnValue({ id: 'patient-1', name: 'John', email: 'john@example.com', role: 'patient', token: 'token' });
    medicalServiceSpy.getPatientMedicationPlans.and.returnValue(of([mockPlan]));
    medicalServiceSpy.getMedicationIntakesByDateRange.and.returnValue(of([]));
    medicalServiceSpy.confirmMedicationIntake.and.returnValue(of({ id: 1, status: IntakeStatus.TAKEN } as any));
    fixture.detectChanges();

    const todayIntake = { id: 1, itemId: 1, scheduledAt: new Date().toISOString(), status: IntakeStatus.PENDING } as MedicationIntake;
    component.selectedDayKey = component['toDateKey'](new Date());
    component.confirmIntake(todayIntake);
    tick();

    expect(medicalServiceSpy.confirmMedicationIntake).toHaveBeenCalledWith(1);
    expect(toastServiceSpy.show).toHaveBeenCalledWith('Medication confirmed.', 'success');
  }));

  it('should check if confirming', () => {
    const intake = { id: 1 } as MedicationIntake;
    expect(component.isConfirming(intake)).toBeFalse();
    component.confirmingIntakeIds.add(1);
    expect(component.isConfirming(intake)).toBeTrue();
  });

  it('should check display only intake', () => {
    expect(component.isDisplayOnlyIntake({} as any)).toBeFalse();
    expect(component.isDisplayOnlyIntake({ __displayOnly: true } as any)).toBeTrue();
  });

  it('should track by date key', () => {
    expect(component.trackByDateKey(0, { dateKey: '2024-01-15' } as any)).toBe('2024-01-15');
  });

  it('should track by group key', () => {
    expect(component.trackByGroupKey(0, { groupKey: 'group-1' } as any)).toBe('group-1');
  });

  it('should track by intake id', () => {
    expect(component.trackByIntakeId(0, { id: 1 } as any)).toBe(1);
    expect(component.trackByIntakeId(0, { scheduledAt: '2024-01-15' } as any)).toBe('2024-01-15');
  });

  it('should format date', () => {
    expect(component.formatDate('2024-01-15')).toContain('15');
  });

  it('should get plan status class', () => {
    expect(component.getPlanStatusClass(PlanStatus.ACTIVE)).toContain('green');
    expect(component.getPlanStatusClass(PlanStatus.STOPPED)).toContain('red');
  });

  it('should get intake status class', () => {
    expect(component.getIntakeStatusClass(IntakeStatus.TAKEN)).toContain('green');
    expect(component.getIntakeStatusClass(IntakeStatus.MISSED)).toContain('red');
  });
});
