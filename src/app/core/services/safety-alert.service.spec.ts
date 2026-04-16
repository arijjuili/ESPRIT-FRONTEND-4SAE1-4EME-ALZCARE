import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { SafetyAlertService } from './safety-alert.service';
import {
  BehaviorLogResponse,
  AlertResponse,
  AlertHistoryResponse,
  CreateManualBehaviorLogRequest,
  UpdateBehaviorLogRequest,
  ValidateBehaviorRequest,
  AcknowledgeAlertRequest,
  ResolveAlertRequest
} from '../models/safety-alert.model';

describe('SafetyAlertService', () => {
  let service: SafetyAlertService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [SafetyAlertService]
    });

    service = TestBed.inject(SafetyAlertService);
    httpMock = TestBed.inject(HttpTestingController);

    spyOn(localStorage, 'getItem').and.returnValue('test-token');
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Behavior Logs', () => {
    it('should create a manual behavior log with severity enum conversion', () => {
      const request: CreateManualBehaviorLogRequest = {
        patientId: 'patient-1',
        type: 'FALL',
        severity: 4,
        description: 'Patient fell in bathroom',
        reportedBy: 'caregiver-1'
      };

      const mockResponse: BehaviorLogResponse = {
        id: 'log-1',
        patientId: 'patient-1',
        type: 'FALL',
        severity: 'FOUR',
        timestamp: '2024-01-01T10:00:00Z',
        source: 'MANUAL',
        validationStatus: 'PENDING',
        processedForAlert: false,
        imageUrls: []
      };

      service.createManualBehaviorLog(request).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne('/api/behavior-logs/manual');
      expect(req.request.method).toBe('POST');
      expect(req.request.body.severity).toBe('FOUR'); // numeric 4 converted to enum
      expect(req.request.headers.get('Authorization')).toBe('Bearer test-token');

      req.flush(mockResponse);
    });

    it('should get behavior logs by patient', () => {
      const mockLogs: BehaviorLogResponse[] = [
        {
          id: 'log-1',
          patientId: 'patient-1',
          type: 'WANDERING',
          severity: 'THREE',
          timestamp: '2024-01-01T10:00:00Z',
          source: 'AUTO',
          validationStatus: 'PENDING',
          processedForAlert: true,
          imageUrls: []
        }
      ];

      service.getBehaviorLogsByPatient('patient-1').subscribe(logs => {
        expect(logs.length).toBe(1);
        expect(logs[0].type).toBe('WANDERING');
      });

      const req = httpMock.expectOne('/api/behavior-logs/patient/patient-1');
      expect(req.request.method).toBe('GET');

      req.flush(mockLogs);
    });

    it('should get pending validations', () => {
      const mockLogs: BehaviorLogResponse[] = [
        {
          id: 'log-2',
          patientId: 'patient-2',
          type: 'AGITATION',
          severity: 'TWO',
          timestamp: '2024-01-02T14:00:00Z',
          source: 'AUTO',
          validationStatus: 'PENDING',
          processedForAlert: false,
          imageUrls: []
        }
      ];

      service.getPendingValidations().subscribe(logs => {
        expect(logs.length).toBe(1);
        expect(logs[0].validationStatus).toBe('PENDING');
      });

      const req = httpMock.expectOne('/api/behavior-logs/pending');
      expect(req.request.method).toBe('GET');

      req.flush(mockLogs);
    });

    it('should validate a behavior log', () => {
      const request: ValidateBehaviorRequest = {
        validationStatus: 'CONFIRMED',
        validatedBy: 'caregiver-1',
        validationNotes: 'Confirmed by video review'
      };

      const mockResponse: BehaviorLogResponse = {
        id: 'log-1',
        patientId: 'patient-1',
        type: 'FALL',
        severity: 'FOUR',
        timestamp: '2024-01-01T10:00:00Z',
        source: 'MANUAL',
        validationStatus: 'CONFIRMED',
        validatedBy: 'caregiver-1',
        validationNotes: 'Confirmed by video review',
        processedForAlert: false,
        imageUrls: []
      };

      service.validateBehavior('log-1', request).subscribe(response => {
        expect(response.validationStatus).toBe('CONFIRMED');
      });

      const req = httpMock.expectOne('/api/behavior-logs/log-1/validate');
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(request);

      req.flush(mockResponse);
    });

    it('should update a behavior log with severity conversion', () => {
      const request: UpdateBehaviorLogRequest = {
        type: 'AGGRESSION',
        severity: 5,
        description: 'Updated description'
      };

      const mockResponse: BehaviorLogResponse = {
        id: 'log-1',
        patientId: 'patient-1',
        type: 'AGGRESSION',
        severity: 'FIVE',
        timestamp: '2024-01-01T10:00:00Z',
        source: 'MANUAL',
        validationStatus: 'PENDING',
        description: 'Updated description',
        processedForAlert: false,
        imageUrls: []
      };

      service.updateBehaviorLog('log-1', request).subscribe(response => {
        expect(response.severity).toBe('FIVE');
        expect(response.description).toBe('Updated description');
      });

      const req = httpMock.expectOne('/api/behavior-logs/log-1');
      expect(req.request.method).toBe('PUT');
      expect(req.request.body.severity).toBe('FIVE');

      req.flush(mockResponse);
    });

    it('should delete a behavior log', () => {
      service.deleteBehaviorLog('log-1').subscribe(response => {
        expect(response).toBeNull();
      });

      const req = httpMock.expectOne('/api/behavior-logs/log-1');
      expect(req.request.method).toBe('DELETE');

      req.flush(null);
    });

    it('should get a single behavior log by id', () => {
      const mockResponse: BehaviorLogResponse = {
        id: 'log-1',
        patientId: 'patient-1',
        type: 'CONFUSION',
        severity: 'THREE',
        timestamp: '2024-01-01T10:00:00Z',
        source: 'MANUAL',
        validationStatus: 'FALSE_ALARM',
        processedForAlert: false,
        imageUrls: []
      };

      service.getBehaviorLogById('log-1').subscribe(response => {
        expect(response.id).toBe('log-1');
      });

      const req = httpMock.expectOne('/api/behavior-logs/log-1');
      expect(req.request.method).toBe('GET');

      req.flush(mockResponse);
    });
  });

  describe('Alerts', () => {
    it('should get active alerts', () => {
      const mockAlerts: AlertResponse[] = [
        {
          id: 'alert-1',
          patientId: 'patient-1',
          ruleCode: 'FALL_DETECTED',
          severity: 'HIGH',
          status: 'ACTIVE',
          triggeredAt: '2024-01-01T10:00:00Z',
          escalationDeadlineAt: '2024-01-01T10:30:00Z',
          isFalsePositive: false,
          currentLevel: 'L1',
          createdAt: '2024-01-01T10:00:00Z',
          isEscalationOverdue: false,
          escalationMinutesRemaining: 30
        }
      ];

      service.getActiveAlerts().subscribe(alerts => {
        expect(alerts.length).toBe(1);
        expect(alerts[0].severity).toBe('HIGH');
      });

      const req = httpMock.expectOne('/api/alerts/active');
      expect(req.request.method).toBe('GET');

      req.flush(mockAlerts);
    });

    it('should get overdue alerts', () => {
      const mockAlerts: AlertResponse[] = [
        {
          id: 'alert-2',
          patientId: 'patient-2',
          ruleCode: 'NO_MOTION',
          severity: 'CRITICAL',
          status: 'ACTIVE',
          triggeredAt: '2024-01-01T08:00:00Z',
          escalationDeadlineAt: '2024-01-01T08:15:00Z',
          isFalsePositive: false,
          currentLevel: 'L2',
          createdAt: '2024-01-01T08:00:00Z',
          isEscalationOverdue: true,
          escalationMinutesRemaining: -10
        }
      ];

      service.getOverdueAlerts().subscribe(alerts => {
        expect(alerts[0].isEscalationOverdue).toBeTrue();
      });

      const req = httpMock.expectOne('/api/alerts/overdue');
      expect(req.request.method).toBe('GET');

      req.flush(mockAlerts);
    });

    it('should acknowledge an alert', () => {
      const request: AcknowledgeAlertRequest = {
        userId: 'caregiver-1',
        notes: 'Acknowledged via mobile app'
      };

      service.acknowledgeAlert('alert-1', request).subscribe(response => {
        expect(response).toBeNull();
      });

      const req = httpMock.expectOne('/api/alerts/alert-1/acknowledge');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(request);

      req.flush(null);
    });

    it('should resolve an alert', () => {
      const request: ResolveAlertRequest = {
        resolutionType: 'CHECKED_OK',
        isFalsePositive: false,
        resolvedBy: 'caregiver-1',
        resolutionNotes: 'Patient is safe'
      };

      service.resolveAlert('alert-1', request).subscribe(response => {
        expect(response).toBeNull();
      });

      const req = httpMock.expectOne('/api/alerts/alert-1/resolve');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(request);

      req.flush(null);
    });

    it('should escalate an alert', () => {
      service.escalateAlert('alert-1', 'doctor-1', 'Needs immediate attention').subscribe(response => {
        expect(response).toBeNull();
      });

      const req = httpMock.expectOne('/api/alerts/alert-1/escalate');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ userId: 'doctor-1', notes: 'Needs immediate attention' });

      req.flush(null);
    });

    it('should get alert history', () => {
      const mockHistory: AlertHistoryResponse[] = [
        {
          id: 'hist-1',
          alertId: 'alert-1',
          actionType: 'ACKNOWLEDGED',
          performedAt: '2024-01-01T10:05:00Z',
          performedBy: 'caregiver-1',
          notes: 'Acknowledged',
          isSystemAction: false
        },
        {
          id: 'hist-2',
          alertId: 'alert-1',
          actionType: 'ESCALATED',
          performedAt: '2024-01-01T10:10:00Z',
          performedBy: 'caregiver-1',
          notes: 'Escalated to doctor',
          isSystemAction: false
        }
      ];

      service.getAlertHistory('alert-1').subscribe(history => {
        expect(history.length).toBe(2);
        expect(history[0].actionType).toBe('ACKNOWLEDGED');
        expect(history[1].actionType).toBe('ESCALATED');
      });

      const req = httpMock.expectOne('/api/alerts/alert-1/history');
      expect(req.request.method).toBe('GET');

      req.flush(mockHistory);
    });
  });
});
