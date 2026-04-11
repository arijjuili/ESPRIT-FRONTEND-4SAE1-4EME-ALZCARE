import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Observable, forkJoin, of, from, throwError } from 'rxjs';
import { map, switchMap, catchError, concatMap, toArray } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { UserManagementService } from './user-management.service';
import {
  // Appointment
  Appointment,
  AppointmentCreateRequest,
  AppointmentUpdateRequest,
  AppointmentQueryParams,
  AppointmentStatus,
  AppointmentSchedulingRecommendation,
  // Medication
  MedicationPlan,
  MedicationPlanCreateRequest,
  MedicationPlanUpdateRequest,
  MedicationItem,
  MedicationItemCreateRequest,
  MedicationItemUpdateRequest,
  MedicationIntake,
  MedicationIntakeCreateRequest,
  MedicationIntakeUpdateRequest,
  ValidatorRole,
  // Stats
  MedicationDashboardStats,
  AppointmentDashboardStats
} from '../models/medical-followup.model';

/**
 * Medical Follow-up Service
 * 
 * Connects to medical-followup-ms microservice for managing:
 * - Appointments
 * - Medication Plans
 * - Medication Items
 * - Medication Intakes
 */
@Injectable({
  providedIn: 'root'
})
export class MedicalFollowupService {
  private baseUrl = `${environment.apiUrl}`;

  constructor(
    private http: HttpClient,
    private userService: UserManagementService
  ) {}

  // ==================== APPOINTMENTS ====================

  /**
   * Create a new appointment
   */
  createAppointment(appointment: AppointmentCreateRequest): Observable<Appointment> {
    return this.http.post<Appointment>(`${this.baseUrl}/appointments`, appointment);
  }

  /**
   * Get appointment by ID
   * Maps backend fields to frontend model
   */
  getAppointment(id: number): Observable<Appointment> {
    return this.http.get<any>(`${this.baseUrl}/appointments/${id}`).pipe(
      map(appt => {
        console.log('[MedicalFollowupService] Get appointment response:', appt);
        console.log('[MedicalFollowupService] Raw fields - meetingUrl:', appt.meetingUrl, 'meetingLink:', appt.meetingLink);
        const mapped = {
          ...appt,
          meetingUrl: appt.meetingUrl || appt.meetingLink || null
        };
        console.log('[MedicalFollowupService] Mapped meetingUrl:', mapped.meetingUrl);
        return mapped;
      })
    );
  }

  /**
   * List appointments by doctor, patient, or caregiver with date range
   * Maps backend fields to frontend model (handles meetingLink -> meetingUrl conversion)
   */
  listAppointments(params: AppointmentQueryParams): Observable<Appointment[]> {
    let httpParams = new HttpParams()
      .set('from', params.from)
      .set('to', params.to);

    if (params.doctorId) {
      httpParams = httpParams.set('doctorId', params.doctorId);
    }
    if (params.patientId) {
      httpParams = httpParams.set('patientId', params.patientId);
    }
    if (params.caregiverId) {
      httpParams = httpParams.set('caregiverId', params.caregiverId);
    }

    return this.http.get<any[]>(`${this.baseUrl}/appointments`, { params: httpParams }).pipe(
      map(appointments => {
        console.log('[MedicalFollowupService] Raw appointments from backend:', appointments);
        return appointments.map(appt => {
          // Map backend fields to frontend model
          // Handle both meetingUrl and meetingLink (backend might use different naming)
          const mapped: Appointment = {
            ...appt,
            meetingUrl: appt.meetingUrl || appt.meetingLink || null
          };
          if (appt.meetingLink && !appt.meetingUrl) {
            console.log(`[MedicalFollowupService] Mapped meetingLink to meetingUrl for appointment ${appt.id}:`, mapped.meetingUrl);
          }
          return mapped;
        });
      })
    );
  }

  /**
   * Get appointments for a specific patient
   */
  getPatientAppointments(patientId: string, from: string, to: string): Observable<Appointment[]> {
    return this.listAppointments({ patientId, from, to });
  }

  /**
   * Get appointments for a specific doctor
   */
  getDoctorAppointments(doctorId: string, from: string, to: string): Observable<Appointment[]> {
    return this.listAppointments({ doctorId, from, to });
  }

  /**
   * Update an appointment
   */
  updateAppointment(id: number, appointment: AppointmentUpdateRequest): Observable<Appointment> {
    return this.http.put<Appointment>(`${this.baseUrl}/appointments/${id}`, appointment);
  }

  /**
   * Delete an appointment
   */
  deleteAppointment(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/appointments/${id}`);
  }

  /**
   * Change appointment status (PATCH)
   * Maps backend fields to frontend model
   */
  changeAppointmentStatus(id: number, status: AppointmentStatus): Observable<Appointment> {
    return this.http.patch<any>(
      `${this.baseUrl}/appointments/${id}/status`,
      null,
      { params: new HttpParams().set('status', status) }
    ).pipe(
      map(appt => {
        console.log('[MedicalFollowupService] Status change response:', appt);
        // Handle both meetingUrl and meetingLink
        return {
          ...appt,
          meetingUrl: appt.meetingUrl || appt.meetingLink || null
        };
      })
    );
  }

  /**
   * Confirm an appointment (convenience method)
   * For ONLINE appointments, the backend automatically generates the meetingUrl
   */
  confirmAppointment(id: number): Observable<Appointment> {
    return this.changeAppointmentStatus(id, AppointmentStatus.CONFIRMED);
  }

  /**
   * Cancel an appointment (convenience method)
   */
  cancelAppointment(id: number): Observable<Appointment> {
    return this.changeAppointmentStatus(id, AppointmentStatus.CANCELLED);
  }

  confirmPresence(id: number, patientId: string): Observable<Appointment> {
    return this.http.post<Appointment>(
      `${this.baseUrl}/appointments/${id}/presence/confirm`,
      null,
      { params: new HttpParams().set('patientId', patientId) }
    );
  }

  declinePresence(id: number, patientId: string): Observable<Appointment> {
    return this.http.post<Appointment>(
      `${this.baseUrl}/appointments/${id}/presence/decline`,
      null,
      { params: new HttpParams().set('patientId', patientId) }
    );
  }

  autoCancelAppointment(id: number): Observable<Appointment> {
    return this.http.post<Appointment>(`${this.baseUrl}/appointments/${id}/presence/auto-cancel`, null);
  }

  markAppointmentNoShow(id: number): Observable<Appointment> {
    return this.http.post<Appointment>(`${this.baseUrl}/appointments/${id}/presence/no-show`, null);
  }

  markAppointmentAttended(id: number): Observable<Appointment> {
    return this.http.post<Appointment>(`${this.baseUrl}/appointments/${id}/attendance/confirm`, null);
  }

  getAppointmentSchedulingRecommendation(patientId: string): Observable<AppointmentSchedulingRecommendation> {
    return this.http.get<AppointmentSchedulingRecommendation>(
      `${this.baseUrl}/appointments/patient/${patientId}/scheduling-recommendation`
    );
  }

  /**
   * ⚠️ DEPRECATED: Cet endpoint n'existe pas dans le backend (404).
   * 
   * Utilisez plutôt getAppointment(id) qui retourne l'appointment
   * avec le meetingUrl déjà inclus dans la réponse.
   * 
   * @deprecated Utilisez getAppointment(id) à la place
   */
  getTeleconsultationLink(id: number, userId: string): Observable<{ meetingUrl: string }> {
    // Validation: s'assurer que l'ID est valide
    if (!id || id <= 0) {
      console.error('[MedicalFollowupService] Invalid appointment ID:', id);
      return throwError(() => new Error('Invalid appointment ID'));
    }

    const url = `${this.baseUrl}/appointments/${id}/teleconsultation/link`;
    const params = new HttpParams().set('userId', userId);
    
    console.log('[MedicalFollowupService] ==========================================');
    console.log('[MedicalFollowupService] Calling teleconsultation endpoint:');
    console.log('[MedicalFollowupService] URL:', url);
    console.log('[MedicalFollowupService] Params:', { userId });
    console.log('[MedicalFollowupService] ==========================================');
    
    return this.http.get<any>(url, { params }).pipe(
      map(response => {
        console.log('[MedicalFollowupService] SUCCESS - Response:', response);
        // Backend returns 'meetingLink', we map it to 'meetingUrl' for consistency
        return {
          meetingUrl: response.meetingLink || response.meetingUrl || null
        };
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('[MedicalFollowupService] ERROR:', error.status, error.message);
        
        // Si 404, c'est probablement un problème de routage gateway
        // Retourner une erreur pour que le composant gère le fallback
        if (error.status === 404) {
          console.warn('[MedicalFollowupService] Gateway returned 404 - endpoint may not be routed correctly');
          return throwError(() => ({
            status: 404,
            message: 'Teleconsultation endpoint not available. Please refresh the page to get the latest appointment data.',
            url: error.url
          }));
        }
        
        return throwError(() => error);
      })
    );
  }

  regenerateTeleconsultationLink(id: number, doctorId: string): Observable<{ meetingUrl: string }> {
    const url = `${this.baseUrl}/appointments/${id}/teleconsultation/regenerate`;
    const params = new HttpParams().set('doctorId', doctorId);

    console.log('[MedicalFollowupService] Regenerating teleconsultation link:', { id, doctorId });

    return this.http.post<any>(url, null, { params }).pipe(
      map(response => ({
        meetingUrl: response.meetingUrl || response.meetingLink || null
      })),
      catchError((error: HttpErrorResponse) => {
        console.error('[MedicalFollowupService] Regenerate link ERROR:', error.status, error.message);
        return throwError(() => error);
      })
    );
  }

  // ==================== MEDICATION PLANS ====================

  /**
   * Create a new medication plan
   */
  createMedicationPlan(plan: MedicationPlanCreateRequest): Observable<MedicationPlan> {
    return this.http.post<MedicationPlan>(`${this.baseUrl}/medications/plans`, plan);
  }

  /**
   * Replace a patient's active medication plan with a new one.
   * The old plan is stopped (status STOPPED, endDate set to today)
   * and a new plan is created with status ACTIVE.
   * 
   * @param patientId - Patient ID whose plan is being replaced
   * @param newPlan - The new medication plan to create
   * @returns Observable with the newly created ACTIVE plan
   */
  replaceMedicationPlan(patientId: string, newPlan: MedicationPlanCreateRequest): Observable<MedicationPlan> {
    const url = `${this.baseUrl}/medications/patients/${patientId}/plans/replace`;
    console.log("HTTP POST replaceMedicationPlan URL:", url);
    return this.http.post<MedicationPlan>(url, newPlan);
  }

  /**
   * Get medication plan by ID
   */
  getMedicationPlan(id: number): Observable<MedicationPlan> {
    return this.http.get<MedicationPlan>(`${this.baseUrl}/medications/plans/${id}`);
  }

  /**
   * Get all medication plans for a patient
   */
  getPatientMedicationPlans(patientId: string): Observable<MedicationPlan[]> {
    return this.http.get<MedicationPlan[]>(
      `${this.baseUrl}/medications/plans`,
      { params: new HttpParams().set('patientId', patientId) }
    );
  }

  /**
   * Search medication plans by query (patient ID or medication name)
   * Note: Frontend-only search since backend doesn't have search endpoint
   */
  searchMedicationPlans(query: string): Observable<MedicationPlan[]> {
    // For now, we need to search across all patients' plans
    // Since backend doesn't support global search, we'll use a workaround
    // by trying the search endpoint first, then falling back to client-side filtering
    return this.http.get<MedicationPlan[]>(
      `${this.baseUrl}/medications/plans/search`,
      { params: new HttpParams().set('query', query) }
    ).pipe(
      catchError(() => {
        // If search endpoint doesn't exist, return empty array
        // The component will handle this gracefully
        return of([]);
      })
    );
  }

  /**
   * Get all medication plans (for admin/doctor view)
   * Fetches all active patients first, then gets their medication plans
   */
  getAllMedicationPlans(): Observable<MedicationPlan[]> {
    return this.userService.getActivePatients().pipe(
      switchMap(patients => {
        if (patients.length === 0) {
          return of([]);
        }
        // Fetch medication plans for each patient using keycloakId
        const requests = patients.map(patient => {
          const keycloakId = (patient as any).userId || (patient as any).keycloakId || patient.id;
          return this.getPatientMedicationPlans(keycloakId).pipe(
            catchError(() => of([])) // Ignore errors for individual patients
          );
        });
        return forkJoin(requests).pipe(
          map(results => results.flat()) // Flatten array of arrays
        );
      }),
      catchError(() => of([]))
    );
  }

  /**
   * Update a medication plan
   */
  updateMedicationPlan(id: number, plan: MedicationPlanUpdateRequest): Observable<MedicationPlan> {
    return this.http.put<MedicationPlan>(`${this.baseUrl}/medications/plans/${id}`, plan);
  }

  /**
   * Delete a medication plan
   */
  deleteMedicationPlan(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/medications/plans/${id}`);
  }

  // ==================== MEDICATION ITEMS ====================

  /**
   * Add an item to a medication plan
   */
  addMedicationItem(planId: number, item: MedicationItemCreateRequest): Observable<MedicationItem> {
    return this.http.post<MedicationItem>(`${this.baseUrl}/medications/plans/${planId}/items`, item);
  }

  /**
   * Get all items in a medication plan
   */
  getMedicationItems(planId: number): Observable<MedicationItem[]> {
    return this.http.get<MedicationItem[]>(`${this.baseUrl}/medications/plans/${planId}/items`);
  }

  /**
   * Update a medication item
   */
  updateMedicationItem(id: number, item: MedicationItemUpdateRequest): Observable<MedicationItem> {
    return this.http.put<MedicationItem>(`${this.baseUrl}/medications/items/${id}`, item);
  }

  /**
   * Delete a medication item
   */
  deleteMedicationItem(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/medications/items/${id}`);
  }

  // ==================== MEDICATION INTAKES ====================

  /**
   * Add an intake to a medication item
   */
  addMedicationIntake(itemId: number, intake: MedicationIntakeCreateRequest): Observable<MedicationIntake> {
    return this.http.post<MedicationIntake>(`${this.baseUrl}/medications/items/${itemId}/intakes`, intake);
  }

  /**
   * Get all intakes for a medication item
   */
  getMedicationIntakes(itemId: number): Observable<MedicationIntake[]> {
    return this.http.get<MedicationIntake[]>(`${this.baseUrl}/medications/items/${itemId}/intakes`);
  }

  /**
   * Get all intakes for a specific patient (across all medications)
   */
  getPatientMedicationIntakes(patientId: string): Observable<MedicationIntake[]> {
    return this.http.get<MedicationIntake[]>(`${this.baseUrl}/medications/intakes/patient/${patientId}`);
  }

  /**
   * Get today's pending intakes for a patient
   */
  getTodaysMedicationIntakes(patientId: string): Observable<MedicationIntake[]> {
    return this.http.get<MedicationIntake[]>(`${this.baseUrl}/medications/intakes/patient/${patientId}/today`);
  }

  /**
   * Get intakes for a patient within a date range
   */
  getMedicationIntakesByDateRange(patientId: string, from: string, to: string): Observable<MedicationIntake[]> {
    return this.http.get<MedicationIntake[]>(
      `${this.baseUrl}/medications/intakes/patient/${patientId}/range`,
      { params: new HttpParams().set('from', from).set('to', to) }
    );
  }

  /**
   * Update a medication intake
   */
  updateMedicationIntake(id: number, intake: MedicationIntakeUpdateRequest): Observable<MedicationIntake> {
    return this.http.put<MedicationIntake>(`${this.baseUrl}/medications/intakes/${id}`, intake);
  }

  /**
   * Delete a medication intake
   */
  deleteMedicationIntake(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/medications/intakes/${id}`);
  }

  // ==================== PATIENT MEDICATION ACTIONS ====================

  /**
   * Patient confirms they took their medication
   * PATCH /api/v1/intakes/{id}/confirm
   */
confirmMedicationIntake(intakeId: number, body: { notes?: string } = {}) {
  return this.http.patch<MedicationIntake>(
    `${this.baseUrl}/medications/intakes/${intakeId}/confirm`,
    body
  );
}

  /**
   * Patient confirms they took their medication (legacy method with patientId)
   */
  confirmMedicationIntakeByPatient(intakeId: number, patientId: string, notes?: string): Observable<MedicationIntake> {
  return this.confirmMedicationIntake(intakeId, notes ? { notes } : {});
}

  /**
   * Caregiver confirms medication was taken on behalf of patient
   */
  confirmMedicationIntakeByCaregiver(intakeId: number, caregiverId: string, notes?: string): Observable<MedicationIntake> {
    let params = new HttpParams().set('caregiverId', caregiverId);
    if (notes) {
      params = params.set('notes', notes);
    }
    return this.http.post<MedicationIntake>(
      `${this.baseUrl}/medications/intakes/${intakeId}/confirm/caregiver`,
      null,
      { params }
    );
  }

  /**
   * Mark medication intake as missed
   */
  markMedicationIntakeAsMissed(
    intakeId: number, 
    validatorId: string, 
    role: ValidatorRole, 
    reason?: string
  ): Observable<MedicationIntake> {
    let params = new HttpParams()
      .set('validatorId', validatorId)
      .set('role', role);
    if (reason) {
      params = params.set('reason', reason);
    }
    return this.http.post<MedicationIntake>(
      `${this.baseUrl}/medications/intakes/${intakeId}/miss`,
      null,
      { params }
    );
  }

  // ==================== DASHBOARD STATS ====================

  /**
   * Get medication statistics for a patient
   */
  getPatientMedicationStats(patientId: string): Observable<{
    totalPlans: number;
    activePlans: number;
    adherenceRate: number;
    pendingIntakesToday: number;
  }> {
    return this.http.get<any>(`${this.baseUrl}/medications/stats/patient/${patientId}`);
  }

  // ==================== DEBUG ====================

  /**
   * Debug: Get all medication plans (for troubleshooting)
   */
  getAllMedicationPlansDebug(): Observable<Array<{
    id: number;
    title: string;
    patientId: string;
    status: string;
    itemCount: number;
  }>> {
    return this.http.get<any[]>(`${this.baseUrl}/medications/plans/all`);
  }

  /**
   * Health check - Test if backend is reachable
   */
  healthCheck(): Observable<boolean> {
    return this.http.get(`${this.baseUrl}/medications/plans`, { 
      params: new HttpParams().set('patientId', 'health-check'),
      observe: 'response'
    }).pipe(
      map(response => response.status === 200),
      catchError((err) => {
        // 504 Gateway Timeout or other errors mean backend is down
        if (err.status === 504 || err.status === 0) {
          console.error('[MedicalFollowupService] Backend is not reachable:', err);
          return of(false);
        }
        // Other errors (404, etc) mean backend is up but endpoint doesn't exist
        return of(true);
      })
    );
  }

  // ==================== DASHBOARD HELPERS ====================

  /**
   * Get today's date in ISO format for API queries
   */
  getTodayISO(): string {
    return new Date().toISOString();
  }

  /**
   * Get date N days from now in ISO format
   */
  getFutureDateISO(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString();
  }

  /**
   * Get date N days ago in ISO format
   */
  getPastDateISO(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date.toISOString();
  }
}
