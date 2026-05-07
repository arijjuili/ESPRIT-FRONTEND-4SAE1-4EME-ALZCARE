import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AlertPollingService } from './alert-polling.service';
import { SafetyAlertService } from './safety-alert.service';
import { ToastService } from '../../shared/components/toast/toast.service';
import { AlertResponse } from '../models/safety-alert.model';

function createMockAlert(overrides: Partial<AlertResponse> = {}): AlertResponse {
  return {
    id: 'alert-1',
    patientId: 'patient-1',
    ruleCode: 'FALL_DETECTED',
    severity: 'HIGH',
    status: 'ACTIVE',
    triggeredAt: '2024-01-01T00:00:00Z',
    escalationDeadlineAt: '2024-01-01T00:30:00Z',
    isFalsePositive: false,
    currentLevel: 'LEVEL_1',
    createdAt: '2024-01-01T00:00:00Z',
    isEscalationOverdue: false,
    escalationMinutesRemaining: 30,
    ...overrides
  };
}

describe('AlertPollingService', () => {
  let service: AlertPollingService;
  let httpMock: HttpTestingController;
  let toastService: jasmine.SpyObj<ToastService>;

  beforeEach(() => {
    toastService = jasmine.createSpyObj('ToastService', ['show']);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        AlertPollingService,
        SafetyAlertService,
        { provide: ToastService, useValue: toastService }
      ]
    });

    service = TestBed.inject(AlertPollingService);
    httpMock = TestBed.inject(HttpTestingController);
    spyOn(localStorage, 'getItem').and.returnValue('test-token');

    // The constructor calls startPolling() which fires an immediate request.
    // We must consume it here before any test runs.
    httpMock.expectOne('/api/alerts/active').flush([]);
  });

  afterEach(() => {
    service.ngOnDestroy();
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should emit alerts on refresh', () => {
    const mockAlerts: AlertResponse[] = [createMockAlert()];

    let emittedAlerts: AlertResponse[] = [];
    service.alerts$.subscribe(alerts => {
      emittedAlerts = alerts;
    });

    service.refresh();

    const req = httpMock.expectOne('/api/alerts/active');
    req.flush(mockAlerts);

    expect(emittedAlerts.length).toBe(1);
    expect(emittedAlerts[0].id).toBe('alert-1');
  });

  it('should count alerts correctly', () => {
    const mockAlerts: AlertResponse[] = [
      createMockAlert({ severity: 'CRITICAL' }),
      createMockAlert({ id: 'alert-2', severity: 'HIGH', ruleCode: 'NO_MOVEMENT' })
    ];

    let alertCount = 0;
    let criticalCount = 0;

    service.alertCount$.subscribe(c => alertCount = c);
    service.criticalCount$.subscribe(c => criticalCount = c);

    service.refresh();

    const req = httpMock.expectOne('/api/alerts/active');
    req.flush(mockAlerts);

    expect(alertCount).toBe(2);
    expect(criticalCount).toBe(1);
  });

  it('should handle HTTP errors gracefully', () => {
    let emittedAlerts: AlertResponse[] = [];
    service.alerts$.subscribe(alerts => {
      emittedAlerts = alerts;
    });

    service.refresh();

    const req = httpMock.expectOne('/api/alerts/active');
    req.error(new ErrorEvent('Network error'), { status: 500 });

    expect(emittedAlerts.length).toBe(0);
  });

  it('should stop polling on destroy without throwing', () => {
    expect(() => service.ngOnDestroy()).not.toThrow();
  });

  it('should toast on new critical alert after initial load', () => {
    // First load - establish baseline (no toast because initial load)
    service.refresh();
    const req1 = httpMock.expectOne('/api/alerts/active');
    req1.flush([createMockAlert({ severity: 'MEDIUM', id: 'alert-base' })]);

    // Second load with new CRITICAL alert - should toast
    service.refresh();
    const req2 = httpMock.expectOne('/api/alerts/active');
    req2.flush([
      createMockAlert({ severity: 'MEDIUM', id: 'alert-base' }),
      createMockAlert({ severity: 'CRITICAL', id: 'alert-new' })
    ]);

    expect(toastService.show).toHaveBeenCalled();
  });

  it('should toast on new high alert after initial load', () => {
    service.refresh();
    const req1 = httpMock.expectOne('/api/alerts/active');
    req1.flush([createMockAlert({ severity: 'MEDIUM', id: 'alert-base' })]);

    service.refresh();
    const req2 = httpMock.expectOne('/api/alerts/active');
    req2.flush([
      createMockAlert({ severity: 'MEDIUM', id: 'alert-base' }),
      createMockAlert({ severity: 'HIGH', id: 'alert-high' })
    ]);

    expect(toastService.show).toHaveBeenCalled();
  });

  it('should not toast on new low-severity alert after initial load', () => {
    service.refresh();
    const req1 = httpMock.expectOne('/api/alerts/active');
    req1.flush([createMockAlert({ severity: 'MEDIUM', id: 'alert-base' })]);

    service.refresh();
    const req2 = httpMock.expectOne('/api/alerts/active');
    req2.flush([
      createMockAlert({ severity: 'MEDIUM', id: 'alert-base' }),
      createMockAlert({ severity: 'LOW', id: 'alert-low' })
    ]);

    expect(toastService.show).not.toHaveBeenCalled();
  });

  it('should be usable after construction', () => {
    service.refresh();
    const req = httpMock.expectOne('/api/alerts/active');
    req.flush([]);
    expect(req.request.method).toBe('GET');
  });
});
