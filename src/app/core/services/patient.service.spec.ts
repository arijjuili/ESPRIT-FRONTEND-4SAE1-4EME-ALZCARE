import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { PatientService, PatientProfileResponse } from './patient.service';
import { AuthService } from './auth.service';

describe('PatientService', () => {
  let service: PatientService;
  let httpMock: HttpTestingController;
  let authService: jasmine.SpyObj<AuthService>;

  const mockPatient: PatientProfileResponse = {
    id: '1',
    userId: 'user-1',
    firstName: 'John',
    lastName: 'Doe'
  };

  beforeEach(() => {
    authService = jasmine.createSpyObj('AuthService', ['getCurrentUser']);
    authService.getCurrentUser.and.returnValue({ id: 'doc-1', role: 'doctor', name: 'Dr. Smith', token: 'tkn', email: 'dr@example.com' });
    spyOn(localStorage, 'getItem').and.returnValue('test-token');

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        PatientService,
        { provide: AuthService, useValue: authService }
      ]
    });

    service = TestBed.inject(PatientService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should get all patients', () => {
    service.getPatients().subscribe(patients => {
      expect(patients.length).toBe(1);
      expect(patients[0].firstName).toBe('John');
    });

    const req = httpMock.expectOne('/api/v1/patients');
    req.flush([mockPatient]);
  });

  it('should get patients for caregiver', () => {
    authService.getCurrentUser.and.returnValue({ id: 'cg-1', role: 'caregiver', name: 'Caregiver', token: 'tkn', email: 'cg@example.com' });

    service.getPatients().subscribe(patients => {
      expect(patients.length).toBe(1);
    });

    const req = httpMock.expectOne('/api/v1/caregivers/user/cg-1/patients');
    req.flush([mockPatient]);
  });

  it('should get patient by id', () => {
    service.getPatientById('1').subscribe(patient => {
      expect(patient.firstName).toBe('John');
    });

    const req = httpMock.expectOne('/api/v1/patients/1');
    req.flush(mockPatient);
  });

  it('should fallback to by-user lookup on 404', () => {
    service.getPatientById('user-1').subscribe(patient => {
      expect(patient.firstName).toBe('John');
    });

    const req1 = httpMock.expectOne('/api/v1/patients/user-1');
    req1.flush('Not found', { status: 404, statusText: 'Not Found' });

    const req2 = httpMock.expectOne('/api/v1/patients/by-user/user-1');
    req2.flush(mockPatient);
  });

  it('should update patient by user id', () => {
    const payload = { firstName: 'Jane', lastName: 'Doe', dateOfBirth: '1990-01-01', gender: 'F', isActive: true };
    service.updatePatientByUserId('user-1', payload).subscribe(patient => {
      expect(patient.firstName).toBe('Jane');
    });

    const req = httpMock.expectOne('/api/v1/patients/by-user/user-1');
    req.flush({ ...mockPatient, firstName: 'Jane' });
  });

  it('should change password by user id', () => {
    service.changePasswordByUserId('user-1', { newPassword: 'newpass123' }).subscribe(() => {
      expect(true).toBeTrue();
    });

    const req = httpMock.expectOne('/api/v1/patients/by-user/user-1/change-password');
    req.flush(null);
  });

  it('should return empty array for empty patient ids', () => {
    service.getPatientsByIds([]).subscribe(patients => {
      expect(patients.length).toBe(0);
    });
  });

  it('should get patients by ids', () => {
    service.getPatientsByIds(['1', '2']).subscribe(patients => {
      expect(patients.length).toBe(1);
    });

    const req = httpMock.expectOne('/api/v1/patients');
    req.flush([mockPatient]);
  });

  it('should get patient by user id', () => {
    service.getPatientByUserId('user-1').subscribe(patient => {
      expect(patient.firstName).toBe('John');
    });

    const req = httpMock.expectOne('/api/v1/patients/by-user/user-1');
    req.flush(mockPatient);
  });
});
