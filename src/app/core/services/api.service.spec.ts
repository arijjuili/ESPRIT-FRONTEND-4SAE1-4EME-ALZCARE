import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ApiService } from './api.service';
import { environment } from '../../../environments/environment';
import { HealthRecordCreateRequest, RecordType, GameActivityCreateRequest, MemoryItemCreateRequest, MemoryCategory } from '../models/api.model';

describe('ApiService - Cognitive Memory APIs', () => {
  let service: ApiService;
  let httpMock: HttpTestingController;
  const cognitiveBaseUrl = `${environment.apiUrl}/v1/cognitive`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ApiService]
    });
    service = TestBed.inject(ApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  // ==================== HEALTH RECORDS ====================

  describe('Health Records', () => {
    it('should create a health record', () => {
      const request: HealthRecordCreateRequest = {
        patientId: 'patient-123',
        recordType: RecordType.ASSESSMENT,
        date: '2024-01-15'
      };
      const mockResponse = { id: 'hr-1', patientId: 'patient-123', recordType: RecordType.ASSESSMENT } as any;

      service.createHealthRecord(request).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${cognitiveBaseUrl}/health-records`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(request);
      req.flush(mockResponse);
    });

    it('should get daily check-in status', () => {
      const patientId = 'patient-123';
      const mockResponse = { patientId, completedToday: false, missedDays: 0 } as any;

      service.getDailyCheckInStatus(patientId).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${cognitiveBaseUrl}/health-records/daily-checkin-status?patientId=${patientId}`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('should submit patient daily check-in', () => {
      const request = { patientId: 'patient-123', mood: 5, sleep: 7, appetite: 8 };
      const mockResponse = { id: 'hr-2', patientId: 'patient-123' } as any;

      service.submitPatientDailyCheckIn(request as any).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${cognitiveBaseUrl}/health-records/daily-checkin/patient`);
      expect(req.request.method).toBe('POST');
      req.flush(mockResponse);
    });

    it('should submit caregiver daily check-in', () => {
      const request = { patientId: 'patient-123', caregiverUserId: 'cg-1', confusion: 2, memory: 3 };
      const mockResponse = { id: 'hr-3', patientId: 'patient-123' } as any;

      service.submitCaregiverDailyCheckIn(request as any).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${cognitiveBaseUrl}/health-records/daily-checkin/caregiver`);
      expect(req.request.method).toBe('POST');
      req.flush(mockResponse);
    });

    it('should get health records with filters', () => {
      const mockResponse = [{ id: 'hr-1' }] as any;
      service.getHealthRecords('patient-123', 'doctor-1', RecordType.ASSESSMENT).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${cognitiveBaseUrl}/health-records?patientId=patient-123&doctorUserId=doctor-1&recordType=ASSESSMENT`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('should delete a health record', () => {
      const id = 'hr-1';
      service.deleteHealthRecord(id).subscribe(response => {
        expect(response).toBeNull();
      });

      const req = httpMock.expectOne(`${cognitiveBaseUrl}/health-records/${id}`);
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
    });
  });

  // ==================== GAME ACTIVITIES ====================

  describe('Game Activities', () => {
    it('should get game catalog', () => {
      const mockResponse = [{ gameType: 'MEMORY_MATCH', name: 'Memory Match' }] as any;
      service.getGameCatalog().subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${cognitiveBaseUrl}/game-activities/catalog`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('should get game activities filtered by patientId', () => {
      const patientId = 'patient-123';
      const mockResponse = [{ id: 'ga-1', patientId }] as any;
      service.getGameActivities(patientId).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${cognitiveBaseUrl}/game-activities?patientId=${patientId}`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('should create a game activity', () => {
      const request: GameActivityCreateRequest = {
        patientId: 'patient-123',
        gameType: 'MEMORY_MATCH',
        difficulty: 'EASY',
        targetDomain: 'memory'
      };
      const mockResponse = { id: 'ga-1', ...request } as any;

      service.createGameActivity(request).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${cognitiveBaseUrl}/game-activities`);
      expect(req.request.method).toBe('POST');
      req.flush(mockResponse);
    });

    it('should get game adaptation profile', () => {
      const patientId = 'patient-123';
      const gameType = 'MEMORY_MATCH';
      const mockResponse = { patientId, gameType, recommendedDifficulty: 'EASY' } as any;

      service.getGameAdaptation(patientId, gameType as any).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${cognitiveBaseUrl}/game-activities/adaptation?patientId=${patientId}&gameType=${gameType}`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });
  });

  // ==================== MEMORY ITEMS ====================

  describe('Memory Items', () => {
    it('should get memory items', () => {
      const mockResponse = [{ id: 'mi-1', title: 'Vacation' }] as any;
      service.getMemoryItems().subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${cognitiveBaseUrl}/memory-items`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('should create a memory item', () => {
      const request: MemoryItemCreateRequest = {
        patientId: 'patient-123',
        title: 'Vacation',
        description: 'Trip to Paris',
        memoryCategory: MemoryCategory.FAMILY,
        yearTaken: 2020,
        createdAt: new Date().toISOString()
      };
      const mockResponse = { id: 'mi-1', ...request } as any;

      service.createMemoryItem(request).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${cognitiveBaseUrl}/memory-items`);
      expect(req.request.method).toBe('POST');
      req.flush(mockResponse);
    });

    it('should delete a memory item', () => {
      const id = 'mi-1';
      service.deleteMemoryItem(id).subscribe(response => {
        expect(response).toBeNull();
      });

      const req = httpMock.expectOne(`${cognitiveBaseUrl}/memory-items/${id}`);
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
    });
  });

  // ==================== GAMIFICATION ====================

  describe('Gamification', () => {
    it('should get gamification summary', () => {
      const patientId = 'patient-123';
      const mockResponse = { patientId, totalPoints: 100, level: 2 } as any;

      service.getGamificationSummary(patientId).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${cognitiveBaseUrl}/gamification/summary?patientId=${patientId}`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('should get recent badges', () => {
      const patientId = 'patient-123';
      const mockResponse = [{ badgeEarned: 'DAILY_FOCUS', earnedAt: '2024-01-15T10:00:00Z' }] as any;

      service.getRecentBadges(patientId, 5).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${cognitiveBaseUrl}/gamification/recent-badges?patientId=${patientId}&limit=5`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });
  });
});
