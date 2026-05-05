import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AdjustPlanService, AdjustPlanFormData } from './adjust-plan.service';
import { FrequencyType, IntakeStatus, MedicationPlan, MedicationItem } from '../models/medical-followup.model';

describe('AdjustPlanService', () => {
  let service: AdjustPlanService;
  let httpMock: HttpTestingController;

  const mockPlan: MedicationPlan = {
    id: 1,
    patientId: 'p1',
    doctorId: 'doc-1',
    title: 'Test Plan',
    notes: 'Test notes',
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    autonomyLevel: 'ASSISTED' as any,
    status: 'ACTIVE' as any,
    version: 1,
    lastRiskLevel: 'LOW' as any,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    items: [
      {
        id: 1,
        planId: 1,
        name: 'Aspirin',
        dosage: '100mg',
        frequency: FrequencyType.DAILY,
        timesOfDay: '08:00',
        isHighRisk: false,
        stockQuantity: 30,
        lowThreshold: 5,
        createdAt: '2024-01-01T00:00:00Z'
      } as MedicationItem
    ]
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AdjustPlanService]
    });

    service = TestBed.inject(AdjustPlanService);
    httpMock = TestBed.inject(HttpTestingController);
    spyOn(localStorage, 'getItem').and.returnValue('test-token');
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should get default effective date as tomorrow', () => {
    const date = service.getDefaultEffectiveDate();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    expect(date.getTime()).toBe(tomorrow.getTime());
  });

  it('should validate missing effective date', () => {
    const formData: AdjustPlanFormData = { effectiveDate: null as any };
    const errors = service.validateInputs(formData);
    expect(errors.some(e => e.field === 'effectiveDate')).toBeTrue();
  });

  it('should validate past effective date', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const formData: AdjustPlanFormData = { effectiveDate: yesterday };
    const errors = service.validateInputs(formData);
    expect(errors.some(e => e.field === 'effectiveDate')).toBeTrue();
  });

  it('should validate empty dosage', () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const formData: AdjustPlanFormData = { effectiveDate: tomorrow, dosage: '   ' };
    const errors = service.validateInputs(formData);
    expect(errors.some(e => e.field === 'dosage')).toBeTrue();
  });

  it('should validate empty timesOfDay', () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const formData: AdjustPlanFormData = { effectiveDate: tomorrow, timesOfDay: [] };
    const errors = service.validateInputs(formData);
    expect(errors.some(e => e.field === 'timesOfDay')).toBeTrue();
  });

  it('should validate end date before effective date', () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const formData: AdjustPlanFormData = { effectiveDate: tomorrow, endDate: yesterday };
    const errors = service.validateInputs(formData);
    expect(errors.some(e => e.field === 'endDate')).toBeTrue();
  });

  it('should return no errors for valid input', () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const formData: AdjustPlanFormData = { effectiveDate: tomorrow, dosage: '200mg' };
    const errors = service.validateInputs(formData);
    expect(errors.length).toBe(0);
  });

  it('should identify future intakes', () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const items = [
      {
        id: 1,
        intakes: [
          { id: 1, itemId: 1, scheduledAt: tomorrow.toISOString(), status: IntakeStatus.PENDING },
          { id: 2, itemId: 1, scheduledAt: yesterday.toISOString(), status: IntakeStatus.TAKEN }
        ]
      }
    ] as MedicationItem[];

    const future = service.identifyFutureIntakes(items, new Date());
    expect(future.length).toBe(1);
    expect(future[0].id).toBe(1);
  });

  it('should cancel future intakes', () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const intakes = [
      { id: 1, itemId: 1, scheduledAt: tomorrow.toISOString(), status: IntakeStatus.PENDING }
    ];

    service.cancelFutureIntakes(intakes as any).subscribe(count => {
      expect(count).toBe(1);
    });

    const req = httpMock.expectOne('/api/v1/medications/intakes/1');
    req.flush(null);
  });

  it('should return 0 for empty intakes cancellation', () => {
    service.cancelFutureIntakes([]).subscribe(count => {
      expect(count).toBe(0);
    });
  });

  it('should apply adjustments with validation errors', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const formData: AdjustPlanFormData = { effectiveDate: yesterday };

    service.applyAdjustments(mockPlan, formData).subscribe(result => {
      expect(result.success).toBeFalse();
      expect(result.cancelledIntakes).toBe(0);
    });
  });
});
