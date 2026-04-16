import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ActivityEventService } from './activity-event.service';
import { ActivityEvent } from '../models/activity-event.model';

describe('ActivityEventService', () => {
  let service: ActivityEventService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ActivityEventService]
    });

    service = TestBed.inject(ActivityEventService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should fetch activity events by patient', () => {
    const mockEvents: ActivityEvent[] = [
      {
        id: 'evt-1',
        patientId: 'patient-1',
        deviceId: 'cam-001',
        timestamp: '2024-01-15T08:30:00Z',
        motionIntensity: 0.75,
        duration: 12,
        zone: 'LIVING_ROOM',
        snapshotUrl: 'https://res.cloudinary.com/demo/image.jpg',
        processedForBehavior: false
      },
      {
        id: 'evt-2',
        patientId: 'patient-1',
        deviceId: 'cam-001',
        timestamp: '2024-01-15T09:15:00Z',
        motionIntensity: 0.4,
        duration: 5,
        zone: 'KITCHEN',
        processedForBehavior: true
      }
    ];

    service.getEventsByPatient('patient-1').subscribe(events => {
      expect(events.length).toBe(2);
      expect(events[0].zone).toBe('LIVING_ROOM');
      expect(events[1].zone).toBe('KITCHEN');
      expect(events[0].snapshotUrl).toBe('https://res.cloudinary.com/demo/image.jpg');
    });

    const req = httpMock.expectOne('/api/events/patient/patient-1');
    expect(req.request.method).toBe('GET');

    req.flush(mockEvents);
  });

  it('should propagate errors when fetching events fails', () => {
    service.getEventsByPatient('patient-404').subscribe({
      next: () => fail('should have failed'),
      error: (err) => {
        expect(err.status).toBe(500);
      }
    });

    const req = httpMock.expectOne('/api/events/patient/patient-404');
    req.flush('Server error', { status: 500, statusText: 'Internal Server Error' });
  });
});
