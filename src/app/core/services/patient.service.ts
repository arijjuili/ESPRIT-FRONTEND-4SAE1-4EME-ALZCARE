import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from './auth.service';
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

  constructor(private http: HttpClient, private authService: AuthService) { }

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
    const currentUser = this.authService.getCurrentUser();
    const path = currentUser?.role === 'caregiver' && currentUser.id
      ? `${this.baseUrl}/caregivers/user/${currentUser.id}/patients`
      : `${this.baseUrl}/patients`;
    return this.http.get<PatientProfileResponse[]>(path, {
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

  /**
   * Get multiple patients by their IDs
   * Fetches all patients and filters by the provided IDs
   */
  getPatientsByIds(patientIds: string[]): Observable<PatientProfileResponse[]> {
    if (patientIds.length === 0) {
      return new Observable(observer => {
        observer.next([]);
        observer.complete();
      });
    }
    
    return this.http.get<PatientProfileResponse[]>(`${this.baseUrl}/patients`, {
      headers: this.getAuthHeaders()
    });
  }

  /**
   * Get patient by user ID (Keycloak user ID)
   */
  getPatientByUserId(userId: string): Observable<PatientProfileResponse> {
    return this.http.get<PatientProfileResponse>(`${this.baseUrl}/patients/${userId}`, {
      headers: this.getAuthHeaders()
    });
  }
}
