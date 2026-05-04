/// <reference types="jasmine" />

import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ApiService } from './api.service';
import { PatientProfile, PatientCreateRequest, PatientUpdateRequest, TokenResponse, GenderEnum, LanguageEnum } from '../models/api.model';

describe('ApiService', () => {
  let service: ApiService;
  let httpMock: HttpTestingController;

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

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Authentication', () => {
    it('should login with Keycloak OAuth2', () => {
      const mockResponse: TokenResponse = {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        expires_in: 300,
        refresh_expires_in: 1800,
        token_type: 'Bearer'
      };

      service.login('doctor@example.com', 'Password123!').subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne('/realms/alzcare/protocol/openid-connect/token');
      expect(req.request.method).toBe('POST');
      expect(req.request.headers.get('Content-Type')).toBe('application/x-www-form-urlencoded');
      expect(req.request.body).toContain('grant_type=password');
      expect(req.request.body).toContain('username=doctor@example.com');
      expect(req.request.body).toContain('password=Password123!');

      req.flush(mockResponse);
    });

    it('should check authentication from localStorage', () => {
      spyOn(localStorage, 'getItem').and.returnValue('some-token');
      expect(service.isAuthenticated()).toBeTrue();
    });

    it('should return false when not authenticated', () => {
      spyOn(localStorage, 'getItem').and.returnValue(null);
      expect(service.isAuthenticated()).toBeFalse();
    });
  });

  describe('Patient Profiles', () => {
    it('should create a patient', () => {
      const mockPatient: PatientProfile = {
        id: 'patient-1',
        keycloakId: 'kc-1',
        userId: 'user-1',
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: '1980-01-01',
        gender: GenderEnum.MALE,
        preferredLanguage: LanguageEnum.ENGLISH,
        isActive: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };

      const request: PatientCreateRequest = {
        keycloakId: 'kc-1',
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: '1980-01-01',
        gender: GenderEnum.MALE
      };

      service.createPatient(request).subscribe(patient => {
        expect(patient).toEqual(mockPatient);
      });

      const req = httpMock.expectOne('/api/v1/patients');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(request);

      req.flush(mockPatient);
    });

    it('should get patient by Keycloak ID', () => {
      const mockPatient: PatientProfile = {
        id: 'patient-1',
        keycloakId: 'keycloak-123',
        userId: 'user-1',
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: '1980-01-01',
        gender: GenderEnum.MALE,
        preferredLanguage: LanguageEnum.ENGLISH,
        isActive: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };

      service.getPatientByKeycloakId('keycloak-123').subscribe(patient => {
        expect(patient).toEqual(mockPatient);
      });

      const req = httpMock.expectOne('/api/v1/patients/keycloak-123');
      expect(req.request.method).toBe('GET');

      req.flush(mockPatient);
    });

    it('should get all patients with optional active filter', () => {
      const mockPatients: PatientProfile[] = [
        {
          id: 'patient-1',
          keycloakId: 'kc-1',
          userId: 'user-1',
          firstName: 'John',
          lastName: 'Doe',
          dateOfBirth: '1980-01-01',
          gender: GenderEnum.MALE,
          preferredLanguage: LanguageEnum.ENGLISH,
          isActive: true,
          createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
        }
      ];

      service.getPatients(true).subscribe(patients => {
        expect(patients).toEqual(mockPatients);
      });

      const req = httpMock.expectOne('/api/v1/patients?isActive=true');
      expect(req.request.method).toBe('GET');

      req.flush(mockPatients);
    });

    it('should update a patient profile', () => {
      const mockPatient: PatientProfile = {
        id: 'patient-1',
        keycloakId: 'kc-1',
        userId: 'user-1',
        firstName: 'John',
        lastName: 'Updated',
        dateOfBirth: '1980-01-01',
        gender: GenderEnum.MALE,
        preferredLanguage: LanguageEnum.ENGLISH,
        isActive: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };

      const updateRequest: PatientUpdateRequest = {
        firstName: 'John',
        lastName: 'Updated',
        dateOfBirth: '1980-01-01',
        gender: GenderEnum.MALE,
        isActive: true
      };

      service.updatePatient('patient-1', updateRequest).subscribe(patient => {
        expect(patient.lastName).toBe('Updated');
      });

      const req = httpMock.expectOne('/api/v1/patients/patient-1');
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(updateRequest);

      req.flush(mockPatient);
    });
  });

  describe('Doctor Profiles', () => {
    it('should get doctor by user ID from API', () => {
      const mockDoctor = {
        id: 'doc-1',
        userId: 'user-doc-1',
        firstName: 'Michael',
        lastName: 'Smith',
        speciality: 'General Practice',
        isAvailable: true
      };

      service.getDoctorByUserId('user-doc-1').subscribe(doctor => {
        expect(doctor.firstName).toBe('Michael');
      });

      const req = httpMock.expectOne('/api/v1/doctors/user/user-doc-1');
      expect(req.request.method).toBe('GET');

      req.flush(mockDoctor);
    });

    it('should return mock doctor for special user IDs', () => {
      service.getDoctorByUserId('doctor-user').subscribe(doctor => {
        expect(doctor.firstName).toBe('Michael');
        expect(doctor.speciality).toBe('General Practice');
      });

      // No HTTP request should be made for the special case
      httpMock.expectNone('/api/v1/doctors/user/doctor-user');
    });
  });
});
