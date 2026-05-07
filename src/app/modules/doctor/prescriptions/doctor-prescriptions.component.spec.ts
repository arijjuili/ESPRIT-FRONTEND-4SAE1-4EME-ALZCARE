import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { DoctorPrescriptionsComponent } from './doctor-prescriptions.component';
import { MedicalFollowupService } from '../../../core/services/medical-followup.service';
import { DoctorPatientContextService } from '../../../core/services/doctor-patient-context.service';
import { OpenFdaDrugService } from '../../../core/services/open-fda-drug.service';
import { PatientProfileResponse } from '../../../core/services/patient.service';
import { ActivatedRoute, Router } from '@angular/router';
import { of, throwError, Subject } from 'rxjs';
import { MedicationPlan, MedicationItem, MedicationAutonomyLevel, FrequencyType, RiskLevel, PlanStatus } from '../../../core/models/medical-followup.model';

describe('DoctorPrescriptionsComponent', () => {
  let component: DoctorPrescriptionsComponent;
  let fixture: ComponentFixture<DoctorPrescriptionsComponent>;
  let medicalServiceSpy: jasmine.SpyObj<MedicalFollowupService>;
  let doctorPatientContextSpy: jasmine.SpyObj<DoctorPatientContextService>;
  let openFdaDrugServiceSpy: jasmine.SpyObj<OpenFdaDrugService>;
  let routerSpy: jasmine.SpyObj<Router>;
  let paramsSubject: Subject<any>;
  let queryParamsSubject: Subject<any>;

  const mockPatient: PatientProfileResponse = {
    id: 'patient-1',
    userId: 'patient-1',
    firstName: 'John',
    lastName: 'Doe',
    dateOfBirth: '1980-01-01',
    gender: 'MALE'
  };

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
    autonomyLevel: MedicationAutonomyLevel.ASSISTED,
    status: PlanStatus.ACTIVE,
    version: 1,
    lastRiskLevel: RiskLevel.LOW,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    items: [mockItem]
  };

  beforeEach(async () => {
    paramsSubject = new Subject();
    queryParamsSubject = new Subject();

    medicalServiceSpy = jasmine.createSpyObj('MedicalFollowupService', [
      'getAllMedicationPlans',
      'getPatientMedicationPlans',
      'createMedicationPlan',
      'replaceMedicationPlan',
      'addMedicationItem',
      'updateMedicationItem',
      'deleteMedicationItem',
      'deleteMedicationPlan',
      'updateMedicationPlan',
      'getMedicationItems'
    ]);

    doctorPatientContextSpy = jasmine.createSpyObj('DoctorPatientContextService', ['getAssignedPatients']);
    openFdaDrugServiceSpy = jasmine.createSpyObj('OpenFdaDrugService', ['search']);
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [DoctorPrescriptionsComponent],
      providers: [
        { provide: MedicalFollowupService, useValue: medicalServiceSpy },
        { provide: DoctorPatientContextService, useValue: doctorPatientContextSpy },
        { provide: OpenFdaDrugService, useValue: openFdaDrugServiceSpy },
        { provide: Router, useValue: routerSpy },
        {
          provide: ActivatedRoute,
          useValue: {
            params: paramsSubject.asObservable(),
            queryParams: queryParamsSubject.asObservable(),
            snapshot: { queryParams: {} }
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DoctorPrescriptionsComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    doctorPatientContextSpy.getAssignedPatients.and.returnValue(of([mockPatient]));
    medicalServiceSpy.getAllMedicationPlans.and.returnValue(of([mockPlan]));
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should initialize on ngOnInit', () => {
    doctorPatientContextSpy.getAssignedPatients.and.returnValue(of([mockPatient]));
    medicalServiceSpy.getAllMedicationPlans.and.returnValue(of([mockPlan]));
    fixture.detectChanges();

    expect(component.assignedPatients).toEqual([mockPatient]);
    expect(component.filteredPatients).toEqual([mockPatient]);
    expect(component.allPrescriptions.length).toBe(1);
    expect(component.filteredPrescriptions.length).toBe(1);
  });

  it('should handle route params on ngOnInit', fakeAsync(() => {
    doctorPatientContextSpy.getAssignedPatients.and.returnValue(of([mockPatient]));
    medicalServiceSpy.getAllMedicationPlans.and.returnValue(of([mockPlan]));
    fixture.detectChanges();

    paramsSubject.next({ id: 'patient-1' });
    tick();

    expect(component.routePatientId).toBe('patient-1');
  }));

  it('should handle error loading assigned patients', () => {
    doctorPatientContextSpy.getAssignedPatients.and.returnValue(throwError(() => new Error('Network error')));
    medicalServiceSpy.getAllMedicationPlans.and.returnValue(of([mockPlan]));
    fixture.detectChanges();

    expect(component.assignedPatients).toEqual([]);
    expect(component.filteredPatients).toEqual([]);
  });

  it('should get patient display name with full name', () => {
    expect(component.getPatientDisplayName(mockPatient)).toBe('John Doe');
  });

  it('should get patient display name with fallback to userId', () => {
    const patient = { ...mockPatient, firstName: '', lastName: '' };
    expect(component.getPatientDisplayName(patient)).toBe('patient-1');
  });

  it('should get patient display name with fallback to id', () => {
    const patient = { ...mockPatient, firstName: '', lastName: '', userId: '' };
    expect(component.getPatientDisplayName(patient)).toBe('patient-1');
  });

  it('should return Unknown for null patient', () => {
    expect(component.getPatientDisplayName(null as any)).toBe('Unknown');
  });

  it('should select a patient', () => {
    component.assignedPatients = [mockPatient];
    component.filteredPatients = [mockPatient];
    component.selectPatient(mockPatient);

    expect(component.selectedPatient).toEqual(mockPatient);
    expect(component.newPlan.patientId).toBe('patient-1');
    expect(component.patientSearchQuery).toBe('John Doe');
    expect(component.showPatientDropdown).toBeFalse();
  });

  it('should clear patient selection', () => {
    component.assignedPatients = [mockPatient];
    component.filteredPatients = [mockPatient];
    component.selectPatient(mockPatient);
    component.clearPatientSelection();

    expect(component.selectedPatient).toBeNull();
    expect(component.newPlan.patientId).toBe('');
    expect(component.patientSearchQuery).toBe('');
    expect(component.filteredPatients).toEqual([mockPatient]);
  });

  describe('prescription loading', () => {
    it('should load and filter recent prescriptions', fakeAsync(() => {
      const mockPlan: MedicationPlan = {
        id: 1,
        patientId: 'patient-1',
        title: 'Plan A',
        status: 'ACTIVE' as PlanStatus,
        createdAt: '2024-06-01T00:00:00Z',
        updatedAt: '2024-06-10T00:00:00Z',
        items: [],
        doctorId: 'd1',
        startDate: '2024-06-01',
        autonomyLevel: MedicationAutonomyLevel.INDEPENDENT,
        version: 1
      };
      const otherPlan: MedicationPlan = {
        id: 2,
        patientId: 'other-patient',
        title: 'Plan B',
        status: 'ACTIVE' as PlanStatus,
        createdAt: '2024-06-05T00:00:00Z',
        updatedAt: '2024-06-08T00:00:00Z',
        items: [],
        doctorId: 'd1',
        startDate: '2024-06-01',
        autonomyLevel: MedicationAutonomyLevel.INDEPENDENT,
        version: 1
      };
      medicalServiceSpy.getAllMedicationPlans.and.returnValue(of([mockPlan, otherPlan]));
      component.assignedPatients = [mockPatient];

      component.loadRecentPrescriptions();
      tick();

      expect(component.allPrescriptions.length).toBe(1);
      expect(component.allPrescriptions[0].patientId).toBe('patient-1');
      expect(component.filteredPrescriptions.length).toBe(1);
    }));

    it('should handle error loading prescriptions', fakeAsync(() => {
      medicalServiceSpy.getAllMedicationPlans.and.returnValue(throwError(() => new Error('fail')));
      component.assignedPatients = [mockPatient];

      component.loadRecentPrescriptions();
      tick();

      expect(component.allPrescriptions).toEqual([]);
      expect(component.filteredPrescriptions).toEqual([]);
      expect(component.loading).toBeFalse();
    }));

    it('should update displayed prescriptions for recent view', () => {
      const plans: MedicationPlan[] = [
        { id: 1, patientId: 'p1', title: 'P1', status: 'ACTIVE' as PlanStatus, createdAt: '2024-06-01T00:00:00Z', updatedAt: '2024-06-01T00:00:00Z', items: [], doctorId: 'd1', startDate: '2024-06-01', autonomyLevel: MedicationAutonomyLevel.INDEPENDENT, version: 1 },
        { id: 2, patientId: 'p2', title: 'P2', status: 'ACTIVE' as PlanStatus, createdAt: '2024-06-02T00:00:00Z', updatedAt: '2024-06-02T00:00:00Z', items: [], doctorId: 'd1', startDate: '2024-06-01', autonomyLevel: MedicationAutonomyLevel.INDEPENDENT, version: 1 },
        { id: 3, patientId: 'p3', title: 'P3', status: 'ACTIVE' as PlanStatus, createdAt: '2024-06-03T00:00:00Z', updatedAt: '2024-06-03T00:00:00Z', items: [], doctorId: 'd1', startDate: '2024-06-01', autonomyLevel: MedicationAutonomyLevel.INDEPENDENT, version: 1 },
        { id: 4, patientId: 'p4', title: 'P4', status: 'ACTIVE' as PlanStatus, createdAt: '2024-06-04T00:00:00Z', updatedAt: '2024-06-04T00:00:00Z', items: [], doctorId: 'd1', startDate: '2024-06-01', autonomyLevel: MedicationAutonomyLevel.INDEPENDENT, version: 1 },
        { id: 5, patientId: 'p5', title: 'P5', status: 'ACTIVE' as PlanStatus, createdAt: '2024-06-05T00:00:00Z', updatedAt: '2024-06-05T00:00:00Z', items: [], doctorId: 'd1', startDate: '2024-06-01', autonomyLevel: MedicationAutonomyLevel.INDEPENDENT, version: 1 },
        { id: 6, patientId: 'p6', title: 'P6', status: 'ACTIVE' as PlanStatus, createdAt: '2024-06-06T00:00:00Z', updatedAt: '2024-06-06T00:00:00Z', items: [], doctorId: 'd1', startDate: '2024-06-01', autonomyLevel: MedicationAutonomyLevel.INDEPENDENT, version: 1 },
        { id: 7, patientId: 'p7', title: 'P7', status: 'ACTIVE' as PlanStatus, createdAt: '2024-06-07T00:00:00Z', updatedAt: '2024-06-07T00:00:00Z', items: [], doctorId: 'd1', startDate: '2024-06-01', autonomyLevel: MedicationAutonomyLevel.INDEPENDENT, version: 1 },
        { id: 8, patientId: 'p8', title: 'P8', status: 'ACTIVE' as PlanStatus, createdAt: '2024-06-08T00:00:00Z', updatedAt: '2024-06-08T00:00:00Z', items: [], doctorId: 'd1', startDate: '2024-06-01', autonomyLevel: MedicationAutonomyLevel.INDEPENDENT, version: 1 }
      ];
      component.allPrescriptions = plans;
      component.viewMode = 'recent';
      (component as any).RECENT_LIMIT = 7;
      component.updateDisplayedPrescriptions();
      expect(component.filteredPrescriptions.length).toBe(7);
    });

    it('should update displayed prescriptions for all view', () => {
      component.allPrescriptions = [
        { id: 1, patientId: 'p1', title: 'P1', status: 'ACTIVE' as PlanStatus, createdAt: '2024-06-01T00:00:00Z', updatedAt: '2024-06-01T00:00:00Z', items: [], doctorId: 'd1', startDate: '2024-06-01', autonomyLevel: MedicationAutonomyLevel.INDEPENDENT, version: 1 }
      ];
      component.viewMode = 'all';
      component.updateDisplayedPrescriptions();
      expect(component.filteredPrescriptions.length).toBe(1);
    });

    it('should sort prescriptions by updatedAt descending', () => {
      const plans: MedicationPlan[] = [
        { id: 1, patientId: 'p1', title: 'Old', status: 'ACTIVE' as PlanStatus, createdAt: '2024-06-01T00:00:00Z', updatedAt: '2024-06-01T00:00:00Z', items: [], doctorId: 'd1', startDate: '2024-06-01', autonomyLevel: MedicationAutonomyLevel.INDEPENDENT, version: 1 },
        { id: 2, patientId: 'p2', title: 'New', status: 'ACTIVE' as PlanStatus, createdAt: '2024-06-01T00:00:00Z', updatedAt: '2024-06-10T00:00:00Z', items: [], doctorId: 'd1', startDate: '2024-06-01', autonomyLevel: MedicationAutonomyLevel.INDEPENDENT, version: 1 }
      ];
      const sorted = component.sortByLastUpdated(plans);
      expect(sorted[0].id).toBe(2);
    });

    it('should sort prescriptions by createdAt when updatedAt is missing', () => {
      const plans: MedicationPlan[] = [
        { id: 1, patientId: 'p1', title: 'Old', status: 'ACTIVE' as PlanStatus, createdAt: '2024-06-01T00:00:00Z', updatedAt: '2024-06-01T00:00:00Z', items: [], doctorId: 'd1', startDate: '2024-06-01', autonomyLevel: MedicationAutonomyLevel.INDEPENDENT, version: 1 },
        { id: 2, patientId: 'p2', title: 'New', status: 'ACTIVE' as PlanStatus, createdAt: '2024-06-10T00:00:00Z', updatedAt: '2024-06-10T00:00:00Z', items: [], doctorId: 'd1', startDate: '2024-06-01', autonomyLevel: MedicationAutonomyLevel.INDEPENDENT, version: 1 }
      ];
      const sorted = component.sortByLastUpdated(plans);
      expect(sorted[0].id).toBe(2);
    });

    it('should toggle view mode', () => {
      component.viewMode = 'recent';
      component.allPrescriptions = [];
      component.toggleViewMode();
      expect(component.viewMode).toBe('all');
    });

    it('should set view mode explicitly', () => {
      component.allPrescriptions = [];
      component.setViewMode('all');
      expect(component.viewMode).toBe('all');
    });

    it('should refresh prescriptions when patients already loaded', fakeAsync(() => {
      component.assignedPatients = [mockPatient];
      spyOn(component, 'loadRecentPrescriptions');
      component.refreshPrescriptions();
      tick();
      expect(component.loadRecentPrescriptions).toHaveBeenCalled();
    }));
  });
});
