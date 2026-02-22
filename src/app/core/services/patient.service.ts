import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

/**
 * Patient Profile Response from identity-service
 */
export interface PatientProfileResponse {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  gender?: string;
  phoneNumber?: string;
  address?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  alzheimerStage?: string;
  diagnosisDate?: string;
  caregiverId?: string;
  doctorId?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Patient Service
 * 
 * Handles communication with the identity-service for patient data.
 */
@Injectable({
  providedIn: 'root'
})
export class PatientService {
  private baseUrl = '/api/v1';

  constructor(private http: HttpClient) { }

  /**
   * Get Authorization headers with Bearer token from localStorage
   */
  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('access_token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  /**
   * Get all patients accessible to the current user
   */
  getPatients(): Observable<PatientProfileResponse[]> {
    return this.http.get<PatientProfileResponse[]>(`${this.baseUrl}/patients`, {
      headers: this.getAuthHeaders()
    });
  }

  /**
   * Get a specific patient by ID
   */
  getPatientById(patientId: string): Observable<PatientProfileResponse> {
    return this.http.get<PatientProfileResponse>(`${this.baseUrl}/patients/${patientId}`, {
      headers: this.getAuthHeaders()
    });
  }
}
