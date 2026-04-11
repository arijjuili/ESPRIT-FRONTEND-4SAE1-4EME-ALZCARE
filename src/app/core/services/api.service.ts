import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  PatientProfile,
  PatientCreateRequest,
  PatientUpdateRequest,
  DoctorProfile,
  CaregiverProfile,
  AutonomyAssessment,
  AutonomyAssessmentRequest,
  TokenResponse
} from '../models/api.model';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private apiBaseUrl = (() => {
    const apiUrl = environment.apiUrl.replace(/\/$/, '');
    return apiUrl.endsWith('/v1') ? apiUrl : `${apiUrl}/v1`;
  })();
  private keycloakUrl = environment.keycloak.url;
  private clientId = environment.keycloak.clientId;

  constructor(private http: HttpClient) {}

  // ==================== AUTHENTICATION ====================

  /**
   * Login with Keycloak OAuth2
   */
  login(username: string, password: string): Observable<TokenResponse> {
    const body = new HttpParams()
      .set('grant_type', 'password')
      .set('client_id', this.clientId)
      .set('username', username)
      .set('password', password);

    return this.http.post<TokenResponse>(this.keycloakUrl, body.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
  }

  /**
   * Logout - clear tokens from localStorage
   */
  logout(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('currentUser');
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!localStorage.getItem('access_token');
  }

  // ==================== PATIENT PROFILES ====================

  /**
   * Create a new patient profile
   */
  createPatient(data: PatientCreateRequest): Observable<PatientProfile> {
    return this.http.post<PatientProfile>(`${this.apiBaseUrl}/patients`, data);
  }

  /**
   * Get patient profile by Keycloak ID
   */
  getPatientByKeycloakId(keycloakId: string): Observable<PatientProfile> {
    return this.http.get<PatientProfile>(`${this.apiBaseUrl}/patients/${keycloakId}`);
  }

  /**
   * Update patient profile
   */
  updatePatient(id: string, data: PatientUpdateRequest): Observable<PatientProfile> {
    return this.http.put<PatientProfile>(`${this.apiBaseUrl}/patients/${id}`, data);
  }

  // ==================== DOCTOR PROFILES ====================

  /**
   * Get doctor profile by ID
   */
  getDoctorById(id: string): Observable<DoctorProfile> {
    return this.http.get<DoctorProfile>(`${this.apiBaseUrl}/doctors/${id}`);
  }

  /**
   * Get doctor profile by Keycloak user ID
   */
  getDoctorByUserId(userId: string): Observable<DoctorProfile> {
    return this.http.get<DoctorProfile>(`${this.apiBaseUrl}/doctors/user/${userId}`);
  }

  // ==================== CAREGIVER PROFILES ====================

  /**
   * Get caregiver profile by ID
   */
  getCaregiverById(id: string): Observable<CaregiverProfile> {
    return this.http.get<CaregiverProfile>(`${this.apiBaseUrl}/caregivers/${id}`);
  }

  /**
   * Get caregiver profile by Keycloak user ID
   */
  getCaregiverByUserId(userId: string): Observable<CaregiverProfile> {
    return this.http.get<CaregiverProfile>(`${this.apiBaseUrl}/caregivers/user/${userId}`);
  }

  // ==================== AUTONOMY ASSESSMENTS ====================

  /**
   * Create new autonomy assessment for a patient
   */
  createAutonomyAssessment(
    patientId: string,
    data: AutonomyAssessmentRequest
  ): Observable<AutonomyAssessment> {
    return this.http.post<AutonomyAssessment>(
      `${this.apiBaseUrl}/patients/${patientId}/autonomy`,
      data
    );
  }

  /**
   * Get latest autonomy assessment for a patient
   */
  getLatestAutonomyAssessment(patientId: string): Observable<AutonomyAssessment> {
    return this.http.get<AutonomyAssessment>(
      `${this.apiBaseUrl}/patients/${patientId}/autonomy`
    );
  }

  /**
   * Get autonomy assessment history for a patient
   */
  getAutonomyAssessmentHistory(patientId: string): Observable<AutonomyAssessment[]> {
    return this.http.get<AutonomyAssessment[]>(
      `${this.apiBaseUrl}/patients/${patientId}/autonomy/history`
    );
  }
}
