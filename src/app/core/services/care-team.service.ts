import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  CaregiverAssignment,
  DoctorAssignment,
  ChecklistItem,
  CaregiverHandover,
  GenerateCaregiverInviteRequest,
  CaregiverInviteResponse,
  ChangeCaregiverRoleRequest,
  MarkUnavailableRequest,
  AssignDoctorRequest,
  CreateChecklistItemRequest,
  AssignChecklistItemRequest,
  CompleteChecklistItemRequest,
  CreateHandoverRequest,
  CaregiverAssignmentFilter,
  DoctorAssignmentFilter,
  ChecklistFilter,
  HandoverFilter,
  CareTeamStats,
  ChecklistGroupDto,
  CaregiverPermissionsDto,
  CaregiverAvailabilitySlotDto,
  PatientCareProfileDto,
  InviteValidationResponse
} from '../models/care-team.model';

/** Raw JSON from Spring record InviteCreatedResponse */
interface InviteCreatedRaw {
  assignmentId: string;
  inviteToken: string;
  inviteUrl: string;
  expiresAt: string;
  patientId: string;
  role: string;
}

/**
 * Care Team Service
 *
 * Handles operations for caregiver assignments, doctor assignments,
 * checklist management, and caregiver handovers via the Care Team Service.
 */
@Injectable({
  providedIn: 'root'
})
export class CareTeamService {
  private apiUrl = `${environment.apiUrl}/v1/care-team`;

  constructor(private http: HttpClient) { }

  // ==================== CAREGIVER ASSIGNMENT METHODS ====================

  /**
   * Generate a caregiver invite token for a patient
   */
  generateCaregiverInvite(request: GenerateCaregiverInviteRequest): Observable<CaregiverInviteResponse> {
    return this.http
      .post<InviteCreatedRaw>(`${this.apiUrl}/caregivers/generate-invite`, {
        patientId: request.patientId,
        role: request.role
      })
      .pipe(
        map((r) => ({
          assignmentId: r.assignmentId,
          inviteToken: r.inviteToken,
          inviteUrl: r.inviteUrl,
          expiresAt: r.expiresAt
        }))
      );
  }

  /**
   * Validate an invite token before accepting
   */
  validateInviteToken(token: string): Observable<InviteValidationResponse> {
    return this.http.get<InviteValidationResponse>(`${this.apiUrl}/invitations/${token}/validate`);
  }

  /**
   * Accept a caregiver invite using the token
   */
  acceptInvite(token: string, caregiverId: string): Observable<CaregiverAssignment> {
    return this.http.post<CaregiverAssignment>(`${this.apiUrl}/invitations/${token}/accept`, { caregiverId });
  }

  /**
   * Get all caregivers assigned to a specific patient
   */
  getPatientCaregivers(patientId: string): Observable<CaregiverAssignment[]> {
    return this.http.get<CaregiverAssignment[]>(`${this.apiUrl}/patients/${patientId}/caregivers`);
  }

  /**
   * Get all patient assignments for a specific caregiver
   */
  getCaregiverAssignments(caregiverId: string): Observable<CaregiverAssignment[]> {
    return this.http.get<CaregiverAssignment[]>(`${this.apiUrl}/caregivers/${caregiverId}/assignments`);
  }

  /**
   * Change the role of a caregiver in an assignment
   */
  changeCaregiverRole(assignmentId: string, request: ChangeCaregiverRoleRequest): Observable<CaregiverAssignment> {
    return this.http.put<CaregiverAssignment>(`${this.apiUrl}/caregivers/assignments/${assignmentId}/role`, request);
  }

  /**
   * Revoke a caregiver's access to a patient
   */
  revokeCaregiverAccess(assignmentId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/caregivers/assignments/${assignmentId}`);
  }

  /**
   * Mark a caregiver as unavailable for a specific period
   */
  markCaregiverUnavailable(assignmentId: string, request: MarkUnavailableRequest): Observable<CaregiverAssignment> {
    return this.http.put<CaregiverAssignment>(
      `${this.apiUrl}/caregivers/assignments/${assignmentId}/availability`,
      {
        unavailableFrom: request.from,
        unavailableTo: request.to,
        reason: request.reason
      }
    );
  }

  getCaregiverPermissions(caregiverId: string, patientId: string): Observable<CaregiverPermissionsDto> {
    const params = new HttpParams().set('patientId', patientId);
    return this.http.get<CaregiverPermissionsDto>(
      `${this.apiUrl}/caregivers/${caregiverId}/permissions`,
      { params }
    );
  }

  getCaregiverAvailability(caregiverId: string): Observable<CaregiverAvailabilitySlotDto[]> {
    return this.http.get<CaregiverAvailabilitySlotDto[]>(`${this.apiUrl}/caregivers/${caregiverId}/availability`);
  }

  // ==================== DOCTOR ASSIGNMENT METHODS ====================

  /**
   * Assign a doctor to a patient
   */
  assignDoctorToPatient(doctorId: string, request: AssignDoctorRequest): Observable<DoctorAssignment> {
    return this.http.post<DoctorAssignment>(`${this.apiUrl}/doctors/${doctorId}/patients/create`, request);
  }

  /**
   * Get all patients assigned to a specific doctor
   */
  getDoctorPatients(doctorId: string): Observable<DoctorAssignment[]> {
    return this.http.get<DoctorAssignment[]>(`${this.apiUrl}/doctors/${doctorId}/patients`);
  }

  /**
   * Get the doctor assigned to a specific patient
   * Returns null if no doctor is assigned (handles 404 gracefully)
   */
  getPatientDoctor(patientId: string): Observable<DoctorAssignment | null> {
    return this.http.get<DoctorAssignment>(`${this.apiUrl}/patients/${patientId}/doctor`);
  }

  /**
   * Deactivate a doctor-patient assignment
   */
  deactivateDoctorAssignment(assignmentId: string): Observable<DoctorAssignment> {
    return this.http.put<DoctorAssignment>(`${this.apiUrl}/doctor-assignments/${assignmentId}/deactivate`, {});
  }

  updatePatientCareProfile(patientId: string, body: Partial<PatientCareProfileDto>): Observable<PatientCareProfileDto> {
    return this.http.put<PatientCareProfileDto>(`${this.apiUrl}/patients/${patientId}`, body);
  }

  getPatientCareProfile(patientId: string): Observable<PatientCareProfileDto> {
    return this.http.get<PatientCareProfileDto>(`${this.apiUrl}/patients/${patientId}/care-profile`);
  }

  /** PDF path alias — same data as getPatientHandovers */
  getPatientHandoversByPatientPath(patientId: string): Observable<CaregiverHandover[]> {
    return this.http.get<CaregiverHandover[]>(`${this.apiUrl}/patients/${patientId}/handovers`);
  }

  routingTravelTime(
    originLat: number,
    originLon: number,
    destLat: number,
    destLon: number
  ): Observable<unknown> {
    const params = new HttpParams()
      .set('originLat', String(originLat))
      .set('originLon', String(originLon))
      .set('destLat', String(destLat))
      .set('destLon', String(destLon));
    return this.http.get<unknown>(`${this.apiUrl}/routing/travel-time`, { params });
  }

  rxNormSearch(name: string): Observable<string> {
    const params = new HttpParams().set('name', name);
    return this.http.get(`${this.apiUrl}/integrations/rxnorm/search`, {
      params,
      responseType: 'text'
    });
  }

  airQualityNearest(lat: number, lon: number): Observable<string> {
    const params = new HttpParams().set('lat', String(lat)).set('lon', String(lon));
    return this.http.get(`${this.apiUrl}/integrations/air-quality`, {
      params,
      responseType: 'text'
    });
  }

  researchNews(): Observable<string> {
    return this.http.get(`${this.apiUrl}/integrations/research-news`, { responseType: 'text' });
  }

  // ==================== CHECKLIST METHODS ====================

  /**
   * Create a new checklist item
   */
  createChecklistItem(request: CreateChecklistItemRequest): Observable<ChecklistItem> {
    return this.http.post<ChecklistItem>(`${this.apiUrl}/checklists/items`, request);
  }

  /**
   * Get a checklist item by its ID
   */
  getChecklistItem(itemId: string): Observable<ChecklistItem> {
    return this.http.get<ChecklistItem>(`${this.apiUrl}/checklists/items/${itemId}`);
  }

  /**
   * Get all checklist items created by a specific doctor
   */
  getDoctorChecklistItems(doctorId: string): Observable<ChecklistItem[]> {
    return this.http.get<ChecklistItem[]>(`${this.apiUrl}/checklists/doctor/${doctorId}`);
  }

  /**
   * Get all checklist items for a patient on a specific date
   * @param date Date in YYYY-MM-DD format
   * @param doctorId optional; if omitted, backend resolves active doctor for the patient
   */
  getPatientChecklist(patientId: string, date: string, doctorId?: string): Observable<ChecklistItem[]> {
    let params = new HttpParams();
    if (doctorId) {
      params = params.set('doctorId', doctorId);
    }
    return this.http.get<ChecklistItem[]>(
      `${this.apiUrl}/checklists/patient/${patientId}/date/${date}`,
      { params }
    );
  }

  /** Generate daily checklist (stub or custom items) */
  generateDailyChecklist(body: { doctorId: string; patientId: string; date: string; items?: unknown[] }): Observable<ChecklistItem[]> {
    return this.http.post<ChecklistItem[]>(`${this.apiUrl}/checklists/generate`, body);
  }

  /** Checklists grouped by (patientId, date) for a doctor */
  getDoctorChecklistsGrouped(doctorId: string): Observable<ChecklistGroupDto[]> {
    return this.http.get<ChecklistGroupDto[]>(`${this.apiUrl}/checklists/doctor/${doctorId}/grouped`);
  }

  /**
   * Mark a checklist item as completed
   */
  completeChecklistItem(itemId: string, request: CompleteChecklistItemRequest): Observable<ChecklistItem> {
    return this.http.put<ChecklistItem>(`${this.apiUrl}/checklists/items/${itemId}/complete`, request);
  }

  /**
   * Assign a checklist item to a specific caregiver
   */
  assignChecklistItem(itemId: string, request: AssignChecklistItemRequest): Observable<ChecklistItem> {
    return this.http.put<ChecklistItem>(`${this.apiUrl}/checklists/items/${itemId}/assign`, request);
  }

  /**
   * Delete a checklist item
   */
  deleteChecklistItem(itemId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/checklists/items/${itemId}`);
  }

  // ==================== HANDOVER METHODS ====================

  /**
   * Create a new handover note between caregivers
   */
  createHandover(request: CreateHandoverRequest): Observable<CaregiverHandover> {
    return this.http.post<CaregiverHandover>(`${this.apiUrl}/caregivers/handover`, request);
  }

  /**
   * Acknowledge a handover note
   */
  acknowledgeHandover(handoverId: string): Observable<CaregiverHandover> {
    return this.http.put<CaregiverHandover>(`${this.apiUrl}/caregivers/handover/${handoverId}/acknowledge`, {});
  }

  /**
   * Get all handover notes for a specific patient
   */
  getPatientHandovers(patientId: string): Observable<CaregiverHandover[]> {
    return this.http.get<CaregiverHandover[]>(`${this.apiUrl}/caregivers/patients/${patientId}/handovers`);
  }

  // ==================== STATISTICS/UTILITY METHODS ====================

  /**
   * Get care team statistics
   * Note: This may be computed from multiple calls or use a dedicated endpoint
   */
  getCareTeamStats(): Observable<CareTeamStats> {
    // TODO: Extend this method when a dedicated stats endpoint is available
    // For now, this is a placeholder that can be implemented based on actual backend capabilities
    return this.http.get<CareTeamStats>(`${this.apiUrl}/stats`);
  }

  /**
   * Get all caregiver assignments with optional filtering (Admin)
   */
  getAllCaregiverAssignments(filter?: CaregiverAssignmentFilter): Observable<CaregiverAssignment[]> {
    let params = new HttpParams();

    if (filter?.patientId) {
      params = params.set('patientId', filter.patientId);
    }
    if (filter?.caregiverId) {
      params = params.set('caregiverId', filter.caregiverId);
    }
    if (filter?.role) {
      params = params.set('role', filter.role);
    }
    if (filter?.active !== undefined) {
      params = params.set('active', filter.active.toString());
    }

    return this.http.get<CaregiverAssignment[]>(`${this.apiUrl}/caregivers/assignments`, { params });
  }

  /**
   * Get all doctor assignments with optional filtering (Admin)
   */
  getAllDoctorAssignments(filter?: DoctorAssignmentFilter): Observable<DoctorAssignment[]> {
    let params = new HttpParams();

    if (filter?.doctorId) {
      params = params.set('doctorId', filter.doctorId);
    }
    if (filter?.patientId) {
      params = params.set('patientId', filter.patientId);
    }
    if (filter?.active !== undefined) {
      params = params.set('active', filter.active.toString());
    }

    return this.http.get<DoctorAssignment[]>(`${this.apiUrl}/doctors/assignments`, { params });
  }

  /**
   * Get checklist items with optional filtering
   */
  getChecklistItems(filter?: ChecklistFilter): Observable<ChecklistItem[]> {
    let params = new HttpParams();

    if (filter?.patientId) {
      params = params.set('patientId', filter.patientId);
    }
    if (filter?.doctorId) {
      params = params.set('doctorId', filter.doctorId);
    }
    if (filter?.assignedTo) {
      params = params.set('assignedTo', filter.assignedTo);
    }
    if (filter?.date) {
      params = params.set('date', filter.date);
    }
    if (filter?.completed !== undefined) {
      params = params.set('completed', filter.completed.toString());
    }

    return this.http.get<ChecklistItem[]>(`${this.apiUrl}/checklists/items`, { params });
  }

  /**
   * Get handovers with optional filtering
   */
  getHandovers(filter?: HandoverFilter): Observable<CaregiverHandover[]> {
    let params = new HttpParams();

    if (filter?.patientId) {
      params = params.set('patientId', filter.patientId);
    }
    if (filter?.fromCaregiverId) {
      params = params.set('fromCaregiverId', filter.fromCaregiverId);
    }
    if (filter?.toCaregiverId) {
      params = params.set('toCaregiverId', filter.toCaregiverId);
    }
    if (filter?.acknowledged !== undefined) {
      params = params.set('acknowledged', filter.acknowledged.toString());
    }

    return this.http.get<CaregiverHandover[]>(`${this.apiUrl}/caregivers/handover`, { params });
  }
}
