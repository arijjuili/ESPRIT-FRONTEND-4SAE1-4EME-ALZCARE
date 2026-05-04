import { TestBed, fakeAsync, tick } from '@angular/core/testing';
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
  });

  afterEach(() => {
    httpMock.verify();
    service.ngOnDestroy();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should start polling on construction', fakeAsync(() => {
    const req = httpMock.expectOne('/api/v1/safety-alerts/active');
    req.flush([]);
    tick(30000);
    httpMock.expectOne('/api/v1/safety-alerts/active').flush([]);
  }));

  it('should emit alerts on the alerts$ observable', fakeAsync(() => {
    const mockAlerts: AlertResponse[] = [createMockAlert()];

    let emittedAlerts: AlertResponse[] = [];
    service.alerts$.subscribe(alerts => {
      emittedAlerts = alerts;
    });

    const req = httpMock.expectOne('/api/v1/safety-alerts/active');
    req.flush(mockAlerts);

    expect(emittedAlerts.length).toBe(1);
    expect(emittedAlerts[0].id).toBe('alert-1');
  }));

  it('should count alerts correctly', fakeAsync(() => {
    const mockAlerts: AlertResponse[] = [
      createMockAlert({ severity: 'CRITICAL' }),
      createMockAlert({ id: 'alert-2', severity: 'HIGH', ruleCode: 'NO_MOVEMENT' })
    ];

    let alertCount = 0;
    let criticalCount = 0;

    service.alertCount$.subscribe(c => alertCount = c);
    service.criticalCount$.subscribe(c => criticalCount = c);

    const req = httpMock.expectOne('/api/v1/safety-alerts/active');
    req.flush(mockAlerts);

    expect(alertCount).toBe(2);
    expect(criticalCount).toBe(1);
  }));

  it('should stop polling on destroy', fakeAsync(() => {
    const req = httpMock.expectOne('/api/v1/safety-alerts/active');
    req.flush([]);

    service.ngOnDestroy();

    tick(30000);
    // No additional HTTP requests should be made after destroy
  }));

  it('should handle HTTP errors gracefully', fakeAsync(() => {
    let emittedAlerts: AlertResponse[] = [];
    service.alerts$.subscribe(alerts => {
      emittedAlerts = alerts;
    });

    const req = httpMock.expectOne('/api/v1/safety-alerts/active');
    req.error(new ErrorEvent('Network error'), { status: 500 });

    expect(emittedAlerts.length).toBe(0);
  }));

  it('should trigger refresh manually', fakeAsync(() => {
    // Consume initial request
    httpMock.expectOne('/api/v1/safety-alerts/active').flush([]);

    service.refresh();

    const req = httpMock.expectOne('/api/v1/safety-alerts/active');
    req.flush([createMockAlert()]);
  }));
});
