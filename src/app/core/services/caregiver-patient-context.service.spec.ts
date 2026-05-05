import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { CaregiverPatientContextService } from './caregiver-patient-context.service';
import { AuthService } from './auth.service';
import { CareTeamService } from './care-team.service';
import { PatientService } from './patient.service';

describe('CaregiverPatientContextService', () => {
  let service: CaregiverPatientContextService;
  let httpMock: HttpTestingController;
  let authService: jasmine.SpyObj<AuthService>;

  const mockCaregiverUser = { id: 'cg-1', role: 'caregiver' as const, name: 'Caregiver', token: 'tkn', email: 'cg@example.com' };
  const mockAssignment = { id: 'a1', patientId: 'p1', caregiverId: 'cg-1', status: 'ACTIVE', patientFirstName: 'John', patientLastName: 'Doe' };
  const mockPatient = { id: 'p1', userId: 'user-p1', firstName: 'John', lastName: 'Doe' };

  beforeEach(() => {
    authService = jasmine.createSpyObj('AuthService', ['getCurrentUser']);
    authService.getCurrentUser.and.returnValue(mockCaregiverUser);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        CaregiverPatientContextService,
        CareTeamService,
        PatientService,
        { provide: AuthService, useValue: authService }
      ]
    });

    service = TestBed.inject(CaregiverPatientContextService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    service.invalidate();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should return empty array when not a caregiver', (done) => {
    authService.getCurrentUser.and.returnValue({ id: 'doc-1', role: 'doctor' as const, name: 'Dr', token: 'tkn', email: 'dr@example.com' });
    service.getActiveAssignments().subscribe(assignments => {
      expect(assignments).toEqual([]);
      done();
    });
  });

  it('should fetch active caregiver assignments', (done) => {
    service.getActiveAssignments().subscribe(assignments => {
      expect(assignments.length).toBe(1);
      expect(assignments[0].patientId).toBe('p1');
      done();
    });

    const req = httpMock.expectOne((r) => r.url.includes('/caregivers/cg-1/assignments'));
    req.flush([mockAssignment, { ...mockAssignment, id: 'a2', status: 'PENDING' }]);
  });

  it('should use cached assignments when fresh', (done) => {
    service.getActiveAssignments().subscribe(() => {
      service.getActiveAssignments().subscribe(assignments => {
        expect(assignments.length).toBe(1);
        done();
      });
    });

    const req = httpMock.expectOne((r) => r.url.includes('/caregivers/cg-1/assignments'));
    req.flush([mockAssignment]);
  });

  it('should force refresh when requested', (done) => {
    service.getActiveAssignments().subscribe(() => {
      service.getActiveAssignments(true).subscribe(assignments => {
        expect(assignments.length).toBe(1);
        done();
      });

      const req2 = httpMock.expectOne((r) => r.url.includes('/caregivers/cg-1/assignments'));
      req2.flush([mockAssignment]);
    });

    const req1 = httpMock.expectOne((r) => r.url.includes('/caregivers/cg-1/assignments'));
    req1.flush([mockAssignment]);
  });

  it('should fetch assigned patients', (done) => {
    service.getAssignedPatients().subscribe(patients => {
      expect(patients.length).toBe(1);
      expect(patients[0].firstName).toBe('John');
      done();
    });

    const req1 = httpMock.expectOne((r) => r.url.includes('/caregivers/cg-1/assignments'));
    req1.flush([mockAssignment]);

    const req2 = httpMock.expectOne((r) => r.url.includes('/api/v1/patients/p1'));
    req2.flush(mockPatient);
  });

  it('should handle patient fetch errors gracefully', (done) => {
    service.getAssignedPatients().subscribe(patients => {
      expect(patients.length).toBe(1);
      expect(patients[0].firstName).toBe('John');
      done();
    });

    const req1 = httpMock.expectOne((r) => r.url.includes('/caregivers/cg-1/assignments'));
    req1.flush([mockAssignment]);

    const req2 = httpMock.expectOne((r) => r.url.includes('/api/v1/patients/p1'));
    req2.flush('Not found', { status: 404, statusText: 'Not Found' });

    // patientService.getPatientById falls back to getPatientByUserId on 404
    const req3 = httpMock.expectOne((r) => r.url.includes('/api/v1/patients/by-user/p1'));
    req3.flush('Not found', { status: 404, statusText: 'Not Found' });
  });

  it('should return empty patients when no assignments', (done) => {
    service.getAssignedPatients().subscribe(patients => {
      expect(patients).toEqual([]);
      done();
    });

    const req = httpMock.expectOne((r) => r.url.includes('/caregivers/cg-1/assignments'));
    req.flush([]);
  });

  it('should refresh assigned patients', (done) => {
    service.refreshAssignedPatients().subscribe(patients => {
      expect(patients.length).toBe(1);
      done();
    });

    const req1 = httpMock.expectOne((r) => r.url.includes('/caregivers/cg-1/assignments'));
    req1.flush([mockAssignment]);

    const req2 = httpMock.expectOne((r) => r.url.includes('/api/v1/patients/p1'));
    req2.flush(mockPatient);
  });

  it('should invalidate cache on user change', (done) => {
    service.getActiveAssignments().subscribe(() => {
      authService.getCurrentUser.and.returnValue({ id: 'cg-2', role: 'caregiver' as const, name: 'CG2', token: 'tkn', email: 'cg2@example.com' });
      service.getActiveAssignments().subscribe(assignments => {
        expect(assignments.length).toBe(1);
        done();
      });

      const req2 = httpMock.expectOne((r) => r.url.includes('/caregivers/cg-2/assignments'));
      req2.flush([mockAssignment]);
    });

    const req1 = httpMock.expectOne((r) => r.url.includes('/caregivers/cg-1/assignments'));
    req1.flush([mockAssignment]);
  });
});
