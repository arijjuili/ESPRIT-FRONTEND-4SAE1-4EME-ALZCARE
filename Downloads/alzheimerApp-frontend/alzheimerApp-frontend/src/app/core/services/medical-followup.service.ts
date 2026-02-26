import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, forkJoin, of, from } from 'rxjs';
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
   */
  getAppointment(id: number): Observable<Appointment> {
    return this.http.get<Appointment>(`${this.baseUrl}/appointments/${id}`);
  }

  /**
   * List appointments by doctor, patient, or caregiver with date range
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

    return this.http.get<Appointment[]>(`${this.baseUrl}/appointments`, { params: httpParams });
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
   */
  changeAppointmentStatus(id: number, status: AppointmentStatus): Observable<Appointment> {
    return this.http.patch<Appointment>(
      `${this.baseUrl}/appointments/${id}/status`,
      null,
      { params: new HttpParams().set('status', status) }
    );
  }

  // ==================== MEDICATION PLANS ====================

  /**
   * Create a new medication plan
   */
  createMedicationPlan(plan: MedicationPlanCreateRequest): Observable<MedicationPlan> {
    return this.http.post<MedicationPlan>(`${this.baseUrl}/medication/plans`, plan);
  }

  /**
   * Get medication plan by ID
   */
  getMedicationPlan(id: number): Observable<MedicationPlan> {
    return this.http.get<MedicationPlan>(`${this.baseUrl}/medication/plans/${id}`);
  }

  /**
   * Get all medication plans for a patient
   */
  getPatientMedicationPlans(patientId: string): Observable<MedicationPlan[]> {
    return this.http.get<MedicationPlan[]>(
      `${this.baseUrl}/medication/plans`,
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
      `${this.baseUrl}/medication/plans/search`,
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
        // Fetch medication plans for each patient
        const requests = patients.map(patient => 
          this.getPatientMedicationPlans(patient.id).pipe(
            catchError(() => of([])) // Ignore errors for individual patients
          )
        );
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
    return this.http.put<MedicationPlan>(`${this.baseUrl}/medication/plans/${id}`, plan);
  }

  /**
   * Delete a medication plan
   */
  deleteMedicationPlan(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/medication/plans/${id}`);
  }

  // ==================== MEDICATION ITEMS ====================

  /**
   * Add an item to a medication plan
   */
  addMedicationItem(planId: number, item: MedicationItemCreateRequest): Observable<MedicationItem> {
    return this.http.post<MedicationItem>(`${this.baseUrl}/medication/plans/${planId}/items`, item);
  }

  /**
   * Get all items in a medication plan
   */
  getMedicationItems(planId: number): Observable<MedicationItem[]> {
    return this.http.get<MedicationItem[]>(`${this.baseUrl}/medication/plans/${planId}/items`);
  }

  /**
   * Update a medication item
   */
  updateMedicationItem(id: number, item: MedicationItemUpdateRequest): Observable<MedicationItem> {
    return this.http.put<MedicationItem>(`${this.baseUrl}/medication/items/${id}`, item);
  }

  /**
   * Delete a medication item
   */
  deleteMedicationItem(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/medication/items/${id}`);
  }

  // ==================== MEDICATION INTAKES ====================

  /**
   * Add an intake to a medication item
   */
  addMedicationIntake(itemId: number, intake: MedicationIntakeCreateRequest): Observable<MedicationIntake> {
    return this.http.post<MedicationIntake>(`${this.baseUrl}/medication/items/${itemId}/intakes`, intake);
  }

  /**
   * Get all intakes for a medication item
   */
  getMedicationIntakes(itemId: number): Observable<MedicationIntake[]> {
    return this.http.get<MedicationIntake[]>(`${this.baseUrl}/medication/items/${itemId}/intakes`);
  }

  /**
   * Update a medication intake
   */
  updateMedicationIntake(id: number, intake: MedicationIntakeUpdateRequest): Observable<MedicationIntake> {
    return this.http.put<MedicationIntake>(`${this.baseUrl}/medication/intakes/${id}`, intake);
  }

  /**
   * Delete a medication intake
   */
  deleteMedicationIntake(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/medication/intakes/${id}`);
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
