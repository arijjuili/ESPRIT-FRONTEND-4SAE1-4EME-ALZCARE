import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
    NotificationSchedule,
    CreateScheduleRequest,
    UpdateScheduleRequest,
    PagedScheduleResponse
} from '../models/notification-schedule.model';

/**
 * Notification Schedule Service
 * 
 * Handles communication with the notification-service for managing scheduled notification campaigns.
 * Provides CRUD operations, toggle, and manual trigger functionality.
 */
@Injectable({
    providedIn: 'root'
})
export class NotificationScheduleService {
    private apiUrl = `${environment.apiUrl}/v1/schedules`;

    constructor(private http: HttpClient) { }

    // ==================== HTTP METHODS ====================

    /**
     * Get all notification schedules with pagination
     */
    getSchedules(page = 0, size = 10): Observable<PagedScheduleResponse> {
        const params = new HttpParams()
            .set('page', page.toString())
            .set('size', size.toString());

        return this.http.get<PagedScheduleResponse>(this.apiUrl, { params }).pipe(
            catchError(error => {
                console.error('[NotificationScheduleService] Failed to get schedules:', error);
                throw error;
            })
        );
    }

    /**
     * Get a single schedule by ID
     */
    getScheduleById(id: string): Observable<NotificationSchedule> {
        return this.http.get<NotificationSchedule>(`${this.apiUrl}/${id}`).pipe(
            catchError(error => {
                console.error('[NotificationScheduleService] Failed to get schedule:', error);
                throw error;
            })
        );
    }

    /**
     * Create a new notification schedule
     */
    createSchedule(request: CreateScheduleRequest): Observable<NotificationSchedule> {
        return this.http.post<NotificationSchedule>(this.apiUrl, request).pipe(
            catchError(error => {
                console.error('[NotificationScheduleService] Failed to create schedule:', error);
                throw error;
            })
        );
    }

    /**
     * Update an existing schedule
     */
    updateSchedule(id: string, request: UpdateScheduleRequest): Observable<NotificationSchedule> {
        return this.http.put<NotificationSchedule>(`${this.apiUrl}/${id}`, request).pipe(
            catchError(error => {
                console.error('[NotificationScheduleService] Failed to update schedule:', error);
                throw error;
            })
        );
    }

    /**
     * Delete a schedule
     */
    deleteSchedule(id: string): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
            catchError(error => {
                console.error('[NotificationScheduleService] Failed to delete schedule:', error);
                throw error;
            })
        );
    }

    /**
     * Toggle schedule active/inactive
     */
    toggleSchedule(id: string): Observable<NotificationSchedule> {
        return this.http.patch<NotificationSchedule>(`${this.apiUrl}/${id}/toggle`, {}).pipe(
            catchError(error => {
                console.error('[NotificationScheduleService] Failed to toggle schedule:', error);
                throw error;
            })
        );
    }

    /**
     * Manually trigger a schedule execution
     */
    triggerSchedule(id: string): Observable<void> {
        return this.http.post<void>(`${this.apiUrl}/${id}/trigger`, {}).pipe(
            catchError(error => {
                console.error('[NotificationScheduleService] Failed to trigger schedule:', error);
                throw error;
            })
        );
    }
}
