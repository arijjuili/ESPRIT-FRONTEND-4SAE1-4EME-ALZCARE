import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { DoctorPatientContextService } from './doctor-patient-context.service';
import { AuthService } from './auth.service';
import { CareTeamService } from './care-team.service';
import { PatientService } from './patient.service';
import { of } from 'rxjs';

describe('DoctorPatientContextService', () => {
  let service: DoctorPatientContextService;
  let httpMock: HttpTestingController;
  let authService: jasmine.SpyObj<AuthService>;

  const mockDoctorUser = { id: 'doc-1', role: 'doctor' as const, name: 'Dr. Smith', token: 'tkn', email: 'dr@example.com' };
  const mockAssignment = { id: 'a1', patientId: 'p1', doctorId: 'doc-1', status: 'ACTIVE', patientFirstName: 'John', patientLastName: 'Doe' };
  const mockPatient = { id: 'p1', userId: 'user-p1', firstName: 'John', lastName: 'Doe' };

  beforeEach(() => {
    authService = jasmine.createSpyObj('AuthService', ['getCurrentUser']);
    authService.getCurrentUser.and.returnValue(mockDoctorUser);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        DoctorPatientContextService,
        CareTeamService,
        PatientService,
        { provide: AuthService, useValue: authService }
      ]
    });

    service = TestBed.inject(DoctorPatientContextService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    service.invalidate();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should return empty array when not a doctor', (done) => {
    authService.getCurrentUser.and.returnValue({ id: 'cg-1', role: 'caregiver' as const, name: 'CG', token: 'tkn', email: 'cg@example.com' });
    service.getActiveAssignments().subscribe(assignments => {
      expect(assignments).toEqual([]);
      done();
    });
  });

  it('should fetch active assignments', (done) => {
    service.getActiveAssignments().subscribe(assignments => {
      expect(assignments.length).toBe(1);
      expect(assignments[0].patientId).toBe('p1');
      done();
    });

    const req = httpMock.expectOne((r) => r.url.includes('/doctors/doc-1/patients'));
    req.flush([mockAssignment, { ...mockAssignment, id: 'a2', status: 'INACTIVE' }]);
  });

  it('should use cached assignments when fresh', (done) => {
    service.getActiveAssignments().subscribe(() => {
      service.getActiveAssignments().subscribe(assignments => {
        expect(assignments.length).toBe(1);
        done();
      });
    });

    const req = httpMock.expectOne((r) => r.url.includes('/doctors/doc-1/patients'));
    req.flush([mockAssignment]);
  });

  it('should force refresh when requested', (done) => {
    service.getActiveAssignments().subscribe(() => {
      service.getActiveAssignments(true).subscribe(assignments => {
        expect(assignments.length).toBe(1);
        done();
      });

      const req2 = httpMock.expectOne((r) => r.url.includes('/doctors/doc-1/patients'));
      req2.flush([mockAssignment]);
    });

    const req1 = httpMock.expectOne((r) => r.url.includes('/doctors/doc-1/patients'));
    req1.flush([mockAssignment]);
  });

  it('should fetch assigned patients', (done) => {
    service.getAssignedPatients().subscribe(patients => {
      expect(patients.length).toBe(1);
      expect(patients[0].firstName).toBe('John');
      done();
    });

    const req1 = httpMock.expectOne((r) => r.url.includes('/doctors/doc-1/patients'));
    req1.flush([mockAssignment]);

    const req2 = httpMock.expectOne((r) => r.url.includes('/api/v1/patients/by-user/p1'));
    req2.flush(mockPatient);
  });

  it('should handle patient fetch errors gracefully', (done) => {
    service.getAssignedPatients().subscribe(patients => {
      expect(patients.length).toBe(1);
      expect(patients[0].firstName).toBe('John');
      done();
    });

    const req1 = httpMock.expectOne((r) => r.url.includes('/doctors/doc-1/patients'));
    req1.flush([mockAssignment]);

    const req2 = httpMock.expectOne((r) => r.url.includes('/api/v1/patients/by-user/p1'));
    req2.flush('Not found', { status: 404, statusText: 'Not Found' });
  });

  it('should return empty patients when no assignments', (done) => {
    service.getAssignedPatients().subscribe(patients => {
      expect(patients).toEqual([]);
      done();
    });

    const req = httpMock.expectOne((r) => r.url.includes('/doctors/doc-1/patients'));
    req.flush([]);
  });

  it('should refresh assigned patients', (done) => {
    service.refreshAssignedPatients().subscribe(patients => {
      expect(patients.length).toBe(1);
      done();
    });

    const req1 = httpMock.expectOne((r) => r.url.includes('/doctors/doc-1/patients'));
    req1.flush([mockAssignment]);

    const req2 = httpMock.expectOne((r) => r.url.includes('/api/v1/patients/by-user/p1'));
    req2.flush(mockPatient);
  });

  it('should invalidate cache', (done) => {
    service.getActiveAssignments().subscribe(() => {
      service.invalidate();
      service.getActiveAssignments().subscribe(assignments => {
        expect(assignments.length).toBe(1);
        done();
      });

      const req2 = httpMock.expectOne((r) => r.url.includes('/doctors/doc-1/patients'));
      req2.flush([mockAssignment]);
    });

    const req1 = httpMock.expectOne((r) => r.url.includes('/doctors/doc-1/patients'));
    req1.flush([mockAssignment]);
  });

  it('should deduplicate patients', (done) => {
    const dupAssignment = { ...mockAssignment, patientId: 'p1' };
    service.getAssignedPatients().subscribe(patients => {
      expect(patients.length).toBe(1);
      done();
    });

    const req1 = httpMock.expectOne((r) => r.url.includes('/doctors/doc-1/patients'));
    req1.flush([dupAssignment, dupAssignment]);

    // forkJoin creates parallel requests for each assignment
    const reqs = httpMock.match((r) => r.url.includes('/api/v1/patients/by-user/p1'));
    expect(reqs.length).toBe(2);
    reqs.forEach(req => req.flush(mockPatient));
  });
});
