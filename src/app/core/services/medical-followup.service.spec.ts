import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { MedicalFollowupService } from './medical-followup.service';
import { UserManagementService } from './user-management.service';
import { AppointmentStatus } from '../models/medical-followup.model';
import { of } from 'rxjs';

describe('MedicalFollowupService', () => {
  let service: MedicalFollowupService;
  let httpMock: HttpTestingController;
  let userServiceSpy: jasmine.SpyObj<UserManagementService>;

  beforeEach(() => {
    userServiceSpy = jasmine.createSpyObj('UserManagementService', ['getActivePatients']);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        MedicalFollowupService,
        { provide: UserManagementService, useValue: userServiceSpy }
      ]
    });

    service = TestBed.inject(MedicalFollowupService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Appointments', () => {
    it('should create an appointment', () => {
      const mockAppointment: any = { id: 1, patientId: 'p1', doctorId: 'd1', startAt: '2024-01-01T10:00:00', endAt: '2024-01-01T11:00:00', type: 'ROUTINE', priority: 'NORMAL', mode: 'ONSITE', status: 'CONFIRMED', createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' };
      service.createAppointment(mockAppointment as any).subscribe(appt => {
        expect(appt).toEqual(mockAppointment);
      });
      const req = httpMock.expectOne('/api/v1/appointments');
      expect(req.request.method).toBe('POST');
      req.flush(mockAppointment);
    });

    it('should get appointment by id', () => {
      const mockAppointment = { id: 1, patientId: 'p1', meetingUrl: 'https://meet.test' };
      service.getAppointment(1).subscribe(appt => {
        expect(appt.meetingUrl).toBe('https://meet.test');
      });
      const req = httpMock.expectOne('/api/v1/appointments/1');
      req.flush(mockAppointment);
    });

    it('should map meetingLink to meetingUrl', () => {
      const mockAppointment = { id: 1, patientId: 'p1', meetingLink: 'https://meet.link' };
      service.getAppointment(1).subscribe(appt => {
        expect(appt.meetingUrl).toBe('https://meet.link');
      });
      const req = httpMock.expectOne('/api/v1/appointments/1');
      req.flush(mockAppointment);
    });

    it('should list appointments', () => {
      const mockAppointments = [{ id: 1, patientId: 'p1' }];
      service.listAppointments({ from: '2024-01-01', to: '2024-12-31' }).subscribe(appts => {
        expect(appts.length).toBe(1);
      });
      const req = httpMock.expectOne(req => req.url === '/api/v1/appointments');
      req.flush(mockAppointments);
    });

    it('should get patient appointments', () => {
      service.getPatientAppointments('p1', '2024-01-01', '2024-12-31').subscribe();
      const req = httpMock.expectOne(req => req.url === '/api/v1/appointments');
      expect(req.request.params.get('patientId')).toBe('p1');
      req.flush([]);
    });

    it('should get doctor appointments', () => {
      service.getDoctorAppointments('d1', '2024-01-01', '2024-12-31').subscribe();
      const req = httpMock.expectOne(req => req.url === '/api/v1/appointments');
      expect(req.request.params.get('doctorId')).toBe('d1');
      req.flush([]);
    });

    it('should update appointment', () => {
      service.updateAppointment(1, { status: AppointmentStatus.CONFIRMED }).subscribe();
      const req = httpMock.expectOne('/api/v1/appointments/1');
      expect(req.request.method).toBe('PUT');
      req.flush({});
    });

    it('should delete appointment', () => {
      service.deleteAppointment(1).subscribe();
      const req = httpMock.expectOne('/api/v1/appointments/1');
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
    });

    it('should confirm appointment', () => {
      service.confirmAppointment(1).subscribe();
      const req = httpMock.expectOne(req => req.url === '/api/v1/appointments/1/status');
      expect(req.request.method).toBe('PATCH');
      req.flush({});
    });

    it('should cancel appointment', () => {
      service.cancelAppointment(1).subscribe();
      const req = httpMock.expectOne(req => req.url === '/api/v1/appointments/1/status');
      expect(req.request.method).toBe('PATCH');
      req.flush({});
    });

    it('should confirm presence', () => {
      service.confirmPresence(1, 'p1').subscribe();
      const req = httpMock.expectOne(req => req.url === '/api/v1/appointments/1/presence/confirm');
      expect(req.request.method).toBe('POST');
      req.flush({});
    });

    it('should decline presence', () => {
      service.declinePresence(1, 'p1').subscribe();
      const req = httpMock.expectOne(req => req.url === '/api/v1/appointments/1/presence/decline');
      expect(req.request.method).toBe('POST');
      req.flush({});
    });

    it('should mark no-show', () => {
      service.markAppointmentNoShow(1).subscribe();
      const req = httpMock.expectOne('/api/v1/appointments/1/presence/no-show');
      expect(req.request.method).toBe('POST');
      req.flush({});
    });

    it('should mark attended', () => {
      service.markAppointmentAttended(1).subscribe();
      const req = httpMock.expectOne('/api/v1/appointments/1/attendance/confirm');
      expect(req.request.method).toBe('POST');
      req.flush({});
    });

    it('should get scheduling recommendation', () => {
      service.getAppointmentSchedulingRecommendation('p1').subscribe(res => {
        expect(res).toBeTruthy();
      });
      const req = httpMock.expectOne('/api/v1/appointments/patient/p1/scheduling-recommendation');
      req.flush({});
    });

    it('should return error for invalid teleconsultation id', (done) => {
      service.getTeleconsultationLink(0, 'user1').subscribe({
        error: (err) => {
          expect(err.message).toBe('Invalid appointment ID');
          done();
        }
      });
    });

    it('should get teleconsultation link', () => {
      service.getTeleconsultationLink(1, 'user1').subscribe(res => {
        expect(res.meetingUrl).toBe('https://meet.test');
      });
      const req = httpMock.expectOne(req => req.url === '/api/v1/appointments/1/teleconsultation/link');
      req.flush({ meetingUrl: 'https://meet.test' });
    });

    it('should regenerate teleconsultation link', () => {
      service.regenerateTeleconsultationLink(1, 'd1').subscribe(res => {
        expect(res.meetingUrl).toBe('https://meet.test');
      });
      const req = httpMock.expectOne(req => req.url === '/api/v1/appointments/1/teleconsultation/regenerate');
      req.flush({ meetingUrl: 'https://meet.test' });
    });
  });

  describe('Medication Plans', () => {
    it('should create medication plan', () => {
      service.createMedicationPlan({ patientId: 'p1' } as any).subscribe();
      const req = httpMock.expectOne('/api/v1/medications/plans');
      expect(req.request.method).toBe('POST');
      req.flush({});
    });

    it('should replace medication plan', () => {
      service.replaceMedicationPlan('p1', { patientId: 'p1' } as any).subscribe();
      const req = httpMock.expectOne('/api/v1/medications/patients/p1/plans/replace');
      expect(req.request.method).toBe('POST');
      req.flush({});
    });

    it('should get medication plan', () => {
      service.getMedicationPlan(1).subscribe();
      const req = httpMock.expectOne('/api/v1/medications/plans/1');
      req.flush({});
    });

    it('should get patient medication plans', () => {
      service.getPatientMedicationPlans('p1').subscribe();
      const req = httpMock.expectOne(req => req.url === '/api/v1/medications/plans');
      expect(req.request.params.get('patientId')).toBe('p1');
      req.flush([]);
    });

    it('should search medication plans', () => {
      service.searchMedicationPlans('aspirin').subscribe();
      const req = httpMock.expectOne(req => req.url === '/api/v1/medications/plans/search');
      req.flush([]);
    });

    it('should handle search endpoint not found', () => {
      service.searchMedicationPlans('aspirin').subscribe(res => {
        expect(res).toEqual([]);
      });
      const req = httpMock.expectOne(req => req.url === '/api/v1/medications/plans/search');
      req.error(new ErrorEvent('404'), { status: 404 });
    });

    it('should get all medication plans', () => {
      userServiceSpy.getActivePatients.and.returnValue(of([
        { id: 'p1', userId: 'p1', username: 'u1', email: 'u1@test.com', role: 'PATIENT', status: 'ACTIVE', createdAt: '2024-01-01', updatedAt: '2024-01-01', enabled: true, emailVerified: true },
        { id: 'p2', keycloakId: 'p2', username: 'u2', email: 'u2@test.com', role: 'PATIENT', status: 'ACTIVE', createdAt: '2024-01-01', updatedAt: '2024-01-01', enabled: true, emailVerified: true }
      ]));
      service.getAllMedicationPlans().subscribe();
      const reqs = httpMock.match(req => req.url === '/api/v1/medications/plans');
      expect(reqs.length).toBe(2);
      reqs[0].flush([]);
      reqs[1].flush([]);
    });

    it('should return empty when no active patients', () => {
      userServiceSpy.getActivePatients.and.returnValue(of([]));
      service.getAllMedicationPlans().subscribe(res => {
        expect(res).toEqual([]);
      });
    });

    it('should update medication plan', () => {
      service.updateMedicationPlan(1, { notes: 'updated' }).subscribe();
      const req = httpMock.expectOne('/api/v1/medications/plans/1');
      expect(req.request.method).toBe('PUT');
      req.flush({});
    });

    it('should delete medication plan', () => {
      service.deleteMedicationPlan(1).subscribe();
      const req = httpMock.expectOne('/api/v1/medications/plans/1');
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
    });
  });

  describe('Medication Items', () => {
    it('should add medication item', () => {
      service.addMedicationItem(1, { name: 'Aspirin' } as any).subscribe();
      const req = httpMock.expectOne('/api/v1/medications/plans/1/items');
      expect(req.request.method).toBe('POST');
      req.flush({});
    });

    it('should get medication items', () => {
      service.getMedicationItems(1).subscribe();
      const req = httpMock.expectOne('/api/v1/medications/plans/1/items');
      req.flush([]);
    });

    it('should update medication item', () => {
      service.updateMedicationItem(1, { name: 'Aspirin' } as any).subscribe();
      const req = httpMock.expectOne('/api/v1/medications/items/1');
      expect(req.request.method).toBe('PUT');
      req.flush({});
    });

    it('should delete medication item', () => {
      service.deleteMedicationItem(1).subscribe();
      const req = httpMock.expectOne('/api/v1/medications/items/1');
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
    });
  });

  describe('Medication Intakes', () => {
    it('should add medication intake', () => {
      service.addMedicationIntake(1, { scheduledAt: '2024-01-01', status: 'PENDING' } as any).subscribe();
      const req = httpMock.expectOne('/api/v1/medications/items/1/intakes');
      expect(req.request.method).toBe('POST');
      req.flush({});
    });

    it('should get medication intakes', () => {
      service.getMedicationIntakes(1).subscribe();
      const req = httpMock.expectOne('/api/v1/medications/items/1/intakes');
      req.flush([]);
    });

    it('should get patient medication intakes', () => {
      service.getPatientMedicationIntakes('p1').subscribe();
      const req = httpMock.expectOne('/api/v1/medications/intakes/patient/p1');
      req.flush([]);
    });

    it('should get todays medication intakes', () => {
      service.getTodaysMedicationIntakes('p1').subscribe();
      const req = httpMock.expectOne('/api/v1/medications/intakes/patient/p1/today');
      req.flush([]);
    });

    it('should get intakes by date range', () => {
      service.getMedicationIntakesByDateRange('p1', '2024-01-01', '2024-12-31').subscribe();
      const req = httpMock.expectOne(req => req.url === '/api/v1/medications/intakes/patient/p1/range');
      req.flush([]);
    });

    it('should update medication intake', () => {
      service.updateMedicationIntake(1, { status: 'TAKEN' } as any).subscribe();
      const req = httpMock.expectOne('/api/v1/medications/intakes/1');
      expect(req.request.method).toBe('PUT');
      req.flush({});
    });

    it('should delete medication intake', () => {
      service.deleteMedicationIntake(1).subscribe();
      const req = httpMock.expectOne('/api/v1/medications/intakes/1');
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
    });

    it('should confirm medication intake', () => {
      service.confirmMedicationIntake(1).subscribe();
      const req = httpMock.expectOne('/api/v1/medications/intakes/1/confirm');
      expect(req.request.method).toBe('PATCH');
      req.flush({});
    });

    it('should confirm intake by patient with notes', () => {
      service.confirmMedicationIntakeByPatient(1, 'p1', 'taken on time').subscribe();
      const req = httpMock.expectOne('/api/v1/medications/intakes/1/confirm');
      expect(req.request.body).toEqual({ notes: 'taken on time' });
      req.flush({});
    });

    it('should confirm intake by caregiver', () => {
      service.confirmMedicationIntakeByCaregiver(1, 'c1', 'notes').subscribe();
      const req = httpMock.expectOne(req => req.url === '/api/v1/medications/intakes/1/confirm/caregiver');
      expect(req.request.params.get('caregiverId')).toBe('c1');
      expect(req.request.params.get('notes')).toBe('notes');
      req.flush({});
    });

    it('should mark intake as missed', () => {
      service.markMedicationIntakeAsMissed(1, 'v1', 'CAREGIVER' as any, 'forgot').subscribe();
      const req = httpMock.expectOne(req => req.url === '/api/v1/medications/intakes/1/miss');
      expect(req.request.params.get('validatorId')).toBe('v1');
      expect(req.request.params.get('role')).toBe('CAREGIVER');
      expect(req.request.params.get('reason')).toBe('forgot');
      req.flush({});
    });
  });

  describe('Dashboard Helpers', () => {
    it('should get patient medication stats', () => {
      service.getPatientMedicationStats('p1').subscribe();
      const req = httpMock.expectOne('/api/v1/medications/stats/patient/p1');
      req.flush({ totalPlans: 1, activePlans: 1, adherenceRate: 95, pendingIntakesToday: 2 });
    });

    it('should get all medication plans debug', () => {
      service.getAllMedicationPlansDebug().subscribe();
      const req = httpMock.expectOne('/api/v1/medications/plans/all');
      req.flush([]);
    });

    it('should return true on health check 200', () => {
      service.healthCheck().subscribe(result => {
        expect(result).toBeTrue();
      });
      const req = httpMock.expectOne(req => req.url === '/api/v1/medications/plans');
      req.flush({}, { status: 200, statusText: 'OK' });
    });

    it('should return false on health check 504', () => {
      service.healthCheck().subscribe(result => {
        expect(result).toBeFalse();
      });
      const req = httpMock.expectOne(req => req.url === '/api/v1/medications/plans');
      req.error(new ErrorEvent('Timeout'), { status: 504 });
    });

    it('should return true on health check 404', () => {
      service.healthCheck().subscribe(result => {
        expect(result).toBeTrue();
      });
      const req = httpMock.expectOne(req => req.url === '/api/v1/medications/plans');
      req.error(new ErrorEvent('Not found'), { status: 404 });
    });

    it('should get all appointments for patients', () => {
      service.getAllAppointments([{ id: 'p1' }, { id: 'p2', userId: 'u2' }], '2024-01-01', '2024-12-31').subscribe();
      const reqs = httpMock.match(req => req.url === '/api/v1/appointments');
      expect(reqs.length).toBe(2);
      reqs[0].flush([]);
      reqs[1].flush([]);
    });

    it('should return empty for no patients', () => {
      service.getAllAppointments([], '2024-01-01', '2024-12-31').subscribe(res => {
        expect(res).toEqual([]);
      });
    });

    it('should get today ISO', () => {
      const iso = service.getTodayISO();
      expect(new Date(iso).getDate()).toBe(new Date().getDate());
    });

    it('should get future date ISO', () => {
      const iso = service.getFutureDateISO(7);
      const future = new Date();
      future.setDate(future.getDate() + 7);
      expect(new Date(iso).getDate()).toBe(future.getDate());
    });

    it('should get past date ISO', () => {
      const iso = service.getPastDateISO(7);
      const past = new Date();
      past.setDate(past.getDate() - 7);
      expect(new Date(iso).getDate()).toBe(past.getDate());
    });
  });
});
