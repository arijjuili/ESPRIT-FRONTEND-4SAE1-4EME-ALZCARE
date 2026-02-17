import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, forkJoin, of, throwError } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';
import {
  ManagedUser,
  CreateUserRequest,
  UpdateUserRequest,
  UserFilter,
  PaginatedResponse,
  UserRole
} from '../models/user-management.model';
import {
  PatientProfile,
  DoctorProfile,
  CaregiverProfile,
  PatientUpdateRequest,
  DoctorUpdateRequest,
  CaregiverUpdateRequest
} from '../models/api.model';
import { environment } from '../../../environments/environment';

/**
 * User Management Service
 * 
 * Handles CRUD operations for users via Identity Service.
 * The Identity Service communicates with Keycloak internally.
 */
@Injectable({
  providedIn: 'root'
})
export class UserManagementService {
  private apiUrl = `${environment.apiUrl}/v1/admin/users`;
  private profileApiUrl = `${environment.apiUrl}/v1/admin/profiles`;

  constructor(private http: HttpClient) { }

  // ==================== USER LISTING ====================

  /**
   * Get all users with optional filtering
   */
  getUsers(filter?: UserFilter, page: number = 0, size: number = 20): Observable<PaginatedResponse<ManagedUser>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    if (filter?.search) {
      params = params.set('search', filter.search);
    }
    if (filter?.role) {
      params = params.set('role', filter.role);
    }
    if (filter?.status) {
      params = params.set('status', filter.status);
    }

    return this.http.get<PaginatedResponse<ManagedUser>>(this.apiUrl, { params });
  }

  /**
   * Get single user by ID
   */
  getUserById(userId: string): Observable<ManagedUser> {
    return this.http.get<ManagedUser>(`${this.apiUrl}/${userId}`);
  }

  // ==================== USER CREATION ====================

  /**
   * Create a new user
   */
  createUser(request: CreateUserRequest): Observable<ManagedUser> {
    return this.http.post<ManagedUser>(this.apiUrl, request);
  }

  // ==================== USER UPDATE ====================

  /**
   * Update an existing user
   */
  updateUser(userId: string, request: UpdateUserRequest): Observable<ManagedUser> {
    return this.http.put<ManagedUser>(`${this.apiUrl}/${userId}`, request);
  }

  /**
   * Reset user password
   */
  resetPassword(userId: string, newPassword: string, temporary: boolean = false): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${userId}/reset-password`, {
      password: newPassword,
      temporary
    });
  }

  // ==================== USER DELETION ====================

  /**
   * Delete user
   */
  deleteUser(userId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${userId}`);
  }

  // ==================== UTILITY ====================

  /**
   * Get role display label
   */
  getRoleLabel(role: UserRole): string {
    const labels: Record<UserRole, string> = {
      ADMIN: 'Admin',
      DOCTOR: 'Doctor',
      CAREGIVER: 'Caregiver',
      PATIENT: 'Patient'
    };
    return labels[role] || role;
  }

  /**
   * Get role color class
   */
  getRoleColor(role: UserRole): string {
    const colors: Record<UserRole, string> = {
      ADMIN: 'rose',
      DOCTOR: 'violet',
      CAREGIVER: 'blue',
      PATIENT: 'emerald'
    };
    return colors[role] || 'gray';
  }

  // ==================== PROFILE MANAGEMENT ====================

  /**
   * Get user profile by user ID
   * Returns PatientProfile, DoctorProfile, or CaregiverProfile based on user's role
   */
  getUserProfile(userId: string): Observable<PatientProfile | DoctorProfile | CaregiverProfile> {
    return this.http.get<PatientProfile | DoctorProfile | CaregiverProfile>(`${this.profileApiUrl}/${userId}`);
  }

  /**
   * Update patient profile
   */
  updatePatientProfile(userId: string, data: PatientUpdateRequest): Observable<PatientProfile> {
    return this.http.put<PatientProfile>(`${this.profileApiUrl}/${userId}/patient`, data);
  }

  /**
   * Update doctor profile
   */
  updateDoctorProfile(userId: string, data: DoctorUpdateRequest): Observable<DoctorProfile> {
    return this.http.put<DoctorProfile>(`${this.profileApiUrl}/${userId}/doctor`, data);
  }

  /**
   * Update caregiver profile
   */
  updateCaregiverProfile(userId: string, data: CaregiverUpdateRequest): Observable<CaregiverProfile> {
    return this.http.put<CaregiverProfile>(`${this.profileApiUrl}/${userId}/caregiver`, data);
  }
}
