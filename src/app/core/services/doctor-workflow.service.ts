import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

/** PDF module 3.2 — doctor creates patient (identity + care-team assignment) */
export interface DoctorCreatePatientRequest {
  username: string;
  email: string;
  password?: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  phone?: string;
  address?: string;
  emergencyContact?: string;
  diagnosisStage?: string;
  emailVerified?: boolean;
}

export interface DoctorCreatesPatientResponse {
  patientUserId: string;
  doctorId: string;
  assignmentId: string | null;
  assignmentStatus: string | null;
  generatedPassword: string | null;
}

@Injectable({ providedIn: 'root' })
export class DoctorWorkflowService {
  private base = `${environment.apiUrl}/v1/doctors`;

  constructor(private http: HttpClient) {}

  createPatientAsDoctor(
    doctorId: string,
    body: DoctorCreatePatientRequest
  ): Observable<DoctorCreatesPatientResponse> {
    return this.http.post<DoctorCreatesPatientResponse>(
      `${this.base}/${doctorId}/patients/create`,
      body
    );
  }
}
