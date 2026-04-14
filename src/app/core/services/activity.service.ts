import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ActivityResponse,
  ActivityCreateRequest,
  ActivityType,
  Registration,
  RegistrationCreateRequest,
  RegistrationStatusUpdateRequest,
  RegistrationStatus,
  ActivityReminder,
  PatientInterest
} from '../models/activity.model';

@Injectable({
  providedIn: 'root'
})
export class ActivityService {
  private base = `${environment.apiUrl}/community/api/v1`;

  constructor(private http: HttpClient) {}

  // ==================== ACTIVITIES ====================

  getActivities(params?: { type?: ActivityType; status?: string; page?: number; size?: number }): Observable<ActivityResponse[]> {
    let p = new HttpParams();
    if (params?.type) p = p.set('type', params.type);
    if (params?.status) p = p.set('status', params.status);
    if (params?.page !== undefined) p = p.set('page', params.page.toString());
    if (params?.size !== undefined) p = p.set('size', params.size.toString());
    return this.http.get<ActivityResponse[]>(`${this.base}/activities`, { params: p });
  }

  getUpcomingActivities(): Observable<ActivityResponse[]> {
    return this.http.get<ActivityResponse[]>(`${this.base}/activities/upcoming`);
  }

  getActivity(id: string): Observable<ActivityResponse> {
    return this.http.get<ActivityResponse>(`${this.base}/activities/${id}`);
  }

  createActivity(req: ActivityCreateRequest): Observable<ActivityResponse> {
    return this.http.post<ActivityResponse>(`${this.base}/activities`, req);
  }

  updateActivity(id: string, req: Partial<ActivityCreateRequest>): Observable<ActivityResponse> {
    return this.http.put<ActivityResponse>(`${this.base}/activities/${id}`, req);
  }

  deleteActivity(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/activities/${id}`);
  }

  getRecommendedActivities(patientId: string, type?: ActivityType): Observable<ActivityResponse[]> {
    let p = new HttpParams().set('patientId', patientId);
    if (type) {
      return this.http.get<ActivityResponse[]>(`${this.base}/activities/recommended/by-type`, {
        params: p.set('type', type)
      });
    }
    return this.http.get<ActivityResponse[]>(`${this.base}/activities/recommended`, { params: p });
  }

  getNearbyActivities(city: string): Observable<ActivityResponse[]> {
    return this.http.get<ActivityResponse[]>(`${this.base}/activities/near`, {
      params: new HttpParams().set('city', city)
    });
  }

  // ==================== REGISTRATIONS ====================

  registerForActivity(req: RegistrationCreateRequest): Observable<Registration> {
    return this.http.post<Registration>(`${this.base}/registrations`, req);
  }

  getRegistration(id: string): Observable<Registration> {
    return this.http.get<Registration>(`${this.base}/registrations/${id}`);
  }

  getActivityRegistrations(activityId: string): Observable<Registration[]> {
    return this.http.get<Registration[]>(`${this.base}/registrations/activity/${activityId}`);
  }

  getPatientRegistrations(patientId: string): Observable<Registration[]> {
    return this.http.get<Registration[]>(`${this.base}/registrations/patient/${patientId}`);
  }

  checkPatientRegistered(activityId: string, patientId: string): Observable<Registration> {
    return this.http.get<Registration>(`${this.base}/registrations/activity/${activityId}/patient/${patientId}`);
  }

  updateRegistrationStatus(id: string, req: RegistrationStatusUpdateRequest): Observable<Registration> {
    return this.http.put<Registration>(`${this.base}/registrations/${id}/status`, req);
  }

  cancelRegistration(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/registrations/${id}`);
  }

  // ==================== REMINDERS ====================

  getUpcomingReminders(patientId: string): Observable<ActivityReminder[]> {
    return this.http.get<ActivityReminder[]>(`${this.base}/reminders/upcoming`, {
      params: new HttpParams().set('patientId', patientId)
    });
  }

  getPatientReminders(patientId: string): Observable<ActivityReminder[]> {
    return this.http.get<ActivityReminder[]>(`${this.base}/reminders/patient/${patientId}`);
  }

  getActivityReminders(activityId: string): Observable<ActivityReminder[]> {
    return this.http.get<ActivityReminder[]>(`${this.base}/reminders/activity/${activityId}`);
  }

  triggerReminder(registrationId: string): Observable<ActivityReminder> {
    return this.http.post<ActivityReminder>(`${this.base}/reminders/trigger/${registrationId}`, {});
  }

  markReminderSent(id: string): Observable<ActivityReminder> {
    return this.http.patch<ActivityReminder>(`${this.base}/reminders/${id}/mark-sent`, {});
  }

  // ==================== PATIENT INTERESTS ====================

  getPatientInterests(patientId: string): Observable<PatientInterest> {
    return this.http.get<PatientInterest>(`${this.base}/patient-interests`, {
      params: new HttpParams().set('patientId', patientId)
    });
  }

  savePatientInterests(interests: PatientInterest): Observable<PatientInterest> {
    return this.http.put<PatientInterest>(`${this.base}/patient-interests`, interests);
  }

  deletePatientInterests(patientId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/patient-interests`, {
      params: new HttpParams().set('patientId', patientId)
    });
  }
}
