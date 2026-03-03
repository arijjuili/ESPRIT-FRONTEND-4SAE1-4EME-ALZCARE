import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  PatientProfile,
  PatientCreateRequest,
  PatientUpdateRequest,
  DoctorProfile,
  CaregiverProfile,
  AutonomyAssessment,
  AutonomyAssessmentRequest,
  TokenResponse,
  RecordType,
  HealthRecord,
  HealthRecordCreateRequest,
  AssessmentSubmissionRequest,
  MemoryItem,
  MemoryItemCreateRequest,
  MemoryItemUpdateRequest,
  GameCatalogItem,
  GameType,
  GameActivity,
  GameAdaptationProfile,
  GameActivityCreateRequest,
  QuizAttempt,
  QuizAttemptCreateRequest,
  QuizAttemptAnswerRequest
} from '../models/api.model';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private apiBaseUrl = `${environment.apiUrl}/v1`;
  private keycloakUrl = environment.keycloak.url;
  private clientId = environment.keycloak.clientId;
  private cognitiveBaseUrl = `${environment.apiUrl}/v1/cognitive`;

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
   * Get all patient profiles (optionally filtered by active status)
   */
  getPatients(isActive?: boolean): Observable<PatientProfile[]> {
    const params = typeof isActive === 'boolean'
      ? new HttpParams().set('isActive', String(isActive))
      : undefined;
    return this.http.get<PatientProfile[]>(`${this.apiBaseUrl}/patients`, { params });
  }

  /**
   * Get caregiver patients by caregiver user ID (optionally filtered by active status)
   */
  getCaregiverPatients(caregiverUserId: string, isActive?: boolean): Observable<PatientProfile[]> {
    const params = typeof isActive === 'boolean'
      ? new HttpParams().set('isActive', String(isActive))
      : undefined;
    return this.http.get<PatientProfile[]>(
      `${this.apiBaseUrl}/caregivers/user/${caregiverUserId}/patients`,
      { params }
    );
  }

  /**
   * Get doctor patients by doctor user ID (optionally filtered by active status)
   */
  getDoctorPatients(doctorUserId: string, isActive?: boolean): Observable<PatientProfile[]> {
    const params = typeof isActive === 'boolean'
      ? new HttpParams().set('isActive', String(isActive))
      : undefined;
    return this.http.get<PatientProfile[]>(
      `${this.apiBaseUrl}/doctors/user/${doctorUserId}/patients`,
      { params }
    );
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

  // ==================== COGNITIVE MEMORY ====================

  /**
   * Create a health record (daily check-in or assessment)
   */
  createHealthRecord(request: HealthRecordCreateRequest): Observable<HealthRecord> {
    return this.http.post<HealthRecord>(`${this.cognitiveBaseUrl}/health-records`, request);
  }

  /**
   * List health records (optionally filtered)
   */
  getHealthRecords(patientId?: string, doctorUserId?: string, recordType?: RecordType): Observable<HealthRecord[]> {
    let params = new HttpParams();
    if (patientId) {
      params = params.set('patientId', patientId);
    }
    if (doctorUserId) {
      params = params.set('doctorUserId', doctorUserId);
    }
    if (recordType) {
      params = params.set('recordType', recordType);
    }
    return this.http.get<HealthRecord[]>(`${this.cognitiveBaseUrl}/health-records`, {
      params: params.keys().length ? params : undefined
    });
  }

  /**
   * Get health record by ID
   */
  getHealthRecordById(id: string): Observable<HealthRecord> {
    return this.http.get<HealthRecord>(`${this.cognitiveBaseUrl}/health-records/${id}`);
  }

  /**
   * Update a health record (doctor/admin)
   */
  updateHealthRecord(id: string, request: Partial<HealthRecordCreateRequest>): Observable<HealthRecord> {
    return this.http.put<HealthRecord>(`${this.cognitiveBaseUrl}/health-records/${id}`, request);
  }

  /**
   * Delete a health record
   */
  deleteHealthRecord(id: string): Observable<void> {
    return this.http.delete<void>(`${this.cognitiveBaseUrl}/health-records/${id}`);
  }

  /**
   * Submit assessment responses
   */
  submitAssessment(id: string, request: AssessmentSubmissionRequest): Observable<HealthRecord> {
    return this.http.post<HealthRecord>(`${this.cognitiveBaseUrl}/health-records/${id}/submit`, request);
  }

  /**
   * Get memory items (optionally filtered by patientId)
   */
  getMemoryItems(patientId?: string): Observable<MemoryItem[]> {
    const params = patientId ? new HttpParams().set('patientId', patientId) : undefined;
    return this.http.get<MemoryItem[]>(`${this.cognitiveBaseUrl}/memory-items`, { params });
  }

  /**
   * Get available games catalog
   */
  getGameCatalog(): Observable<GameCatalogItem[]> {
    return this.http.get<GameCatalogItem[]>(`${this.cognitiveBaseUrl}/game-activities/catalog`);
  }

  /**
   * List game activities (optionally filtered by patientId)
   */
  getGameActivities(patientId?: string): Observable<GameActivity[]> {
    const params = patientId ? new HttpParams().set('patientId', patientId) : undefined;
    return this.http.get<GameActivity[]>(`${this.cognitiveBaseUrl}/game-activities`, { params });
  }

  /**
   * Create a game activity
   */
  createGameActivity(request: GameActivityCreateRequest): Observable<GameActivity> {
    return this.http.post<GameActivity>(`${this.cognitiveBaseUrl}/game-activities`, request);
  }

  /**
   * Get adaptive profile for a patient and game
   */
  getGameAdaptation(patientId: string, gameType: GameType): Observable<GameAdaptationProfile> {
    const params = new HttpParams()
      .set('patientId', patientId)
      .set('gameType', gameType);
    return this.http.get<GameAdaptationProfile>(`${this.cognitiveBaseUrl}/game-activities/adaptation`, { params });
  }

  /**
   * Get available memory items for quiz (filtered server-side)
   */
  getAvailableMemoryItems(patientId: string): Observable<MemoryItem[]> {
    const params = new HttpParams().set('patientId', patientId);
    return this.http.get<MemoryItem[]>(`${this.cognitiveBaseUrl}/memory-items/available`, { params });
  }

  /**
   * Create a new memory item
   */
  createMemoryItem(request: MemoryItemCreateRequest): Observable<MemoryItem> {
    return this.http.post<MemoryItem>(`${this.cognitiveBaseUrl}/memory-items`, request);
  }

  /**
   * Update an existing memory item
   */
  updateMemoryItem(id: string, request: MemoryItemUpdateRequest): Observable<MemoryItem> {
    return this.http.put<MemoryItem>(`${this.cognitiveBaseUrl}/memory-items/${id}`, request);
  }

  /**
   * Delete a memory item
   */
  deleteMemoryItem(id: string): Observable<void> {
    return this.http.delete<void>(`${this.cognitiveBaseUrl}/memory-items/${id}`);
  }

  // ==================== QUIZ ATTEMPTS ====================

  /**
   * Create a quiz attempt
   */
  createQuizAttempt(request: QuizAttemptCreateRequest): Observable<QuizAttempt> {
    return this.http.post<QuizAttempt>(`${this.cognitiveBaseUrl}/quiz-attempts`, request);
  }

  /**
   * Get quiz attempts (optionally filtered by patientId or memoryItemId)
   */
  getQuizAttempts(patientId?: string, memoryItemId?: string): Observable<QuizAttempt[]> {
    let params = new HttpParams();
    if (patientId) {
      params = params.set('patientId', patientId);
    }
    if (memoryItemId) {
      params = params.set('memoryItemId', memoryItemId);
    }
    return this.http.get<QuizAttempt[]>(`${this.cognitiveBaseUrl}/quiz-attempts`, {
      params: params.keys().length ? params : undefined
    });
  }

  /**
   * Submit a quiz answer
   */
  submitQuizAnswer(attemptId: string, request: QuizAttemptAnswerRequest): Observable<QuizAttempt> {
    return this.http.patch<QuizAttempt>(`${this.cognitiveBaseUrl}/quiz-attempts/${attemptId}/answer`, request);
  }
}
