import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ActivityEvent } from '../models/activity-event.model';

/**
 * Activity Event Service
 *
 * Handles communication with the event-ingestion service for retrieving
 * camera motion/activity events. Gateway routes /api/events to event-ingestion:8002
 */
@Injectable({
  providedIn: 'root'
})
export class ActivityEventService {
  private apiUrl = `${environment.apiUrl}/events`;

  constructor(private http: HttpClient) { }

  /**
   * Get all activity events for a specific patient
   * GET /api/events/patient/{patientId}
   */
  getEventsByPatient(patientId: string): Observable<ActivityEvent[]> {
    return this.http.get<ActivityEvent[]>(`${this.apiUrl}/patient/${patientId}`).pipe(
      catchError(error => {
        console.error('[ActivityEventService] Failed to get events by patient:', error);
        throw error;
      })
    );
  }
}
