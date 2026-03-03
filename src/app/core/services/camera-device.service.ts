import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  CameraDevice,
  CameraDeviceRequest,
  CameraStatus
} from '../models/camera-device.model';

/**
 * Camera Device Service
 * 
 * Handles communication with the event-ingestion service for managing camera devices.
 * Provides CRUD operations for camera pairing, status management, and retrieval.
 * 
 * Gateway routes /api/cameras to event-ingestion:8002
 */
@Injectable({
  providedIn: 'root'
})
export class CameraDeviceService {
  private apiUrl = `${environment.apiUrl}/cameras`;

  constructor(private http: HttpClient) { }

  // ==================== HTTP METHODS ====================

  /**
   * Get all cameras for a specific patient
   * GET /api/cameras/patient/{patientId}
   */
  getCamerasByPatient(patientId: string): Observable<CameraDevice[]> {
    return this.http.get<CameraDevice[]>(`${this.apiUrl}/patient/${patientId}`).pipe(
      catchError(error => {
        console.error('[CameraDeviceService] Failed to get cameras by patient:', error);
        throw error;
      })
    );
  }

  /**
   * Get a single camera by ID
   * GET /api/cameras/{id}
   */
  getCameraById(cameraId: string): Observable<CameraDevice> {
    return this.http.get<CameraDevice>(`${this.apiUrl}/${cameraId}`).pipe(
      catchError(error => {
        console.error('[CameraDeviceService] Failed to get camera:', error);
        throw error;
      })
    );
  }

  /**
   * Pair a new camera device to a patient
   * POST /api/cameras/pair
   */
  pairCamera(request: CameraDeviceRequest): Observable<CameraDevice> {
    return this.http.post<CameraDevice>(`${this.apiUrl}/pair`, request).pipe(
      catchError(error => {
        console.error('[CameraDeviceService] Failed to pair camera:', error);
        throw error;
      })
    );
  }

  /**
   * Unpair (delete) a camera device
   * DELETE /api/cameras/{id}/unpair
   */
  unpairCamera(cameraId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${cameraId}/unpair`).pipe(
      catchError(error => {
        console.error('[CameraDeviceService] Failed to unpair camera:', error);
        throw error;
      })
    );
  }

  /**
   * Update camera operational status
   * PUT /api/cameras/{id}/status?status={status}
   */
  updateStatus(cameraId: string, status: CameraStatus): Observable<CameraDevice> {
    const params = new HttpParams().set('status', status);

    return this.http.put<CameraDevice>(`${this.apiUrl}/${cameraId}/status`, {}, { params }).pipe(
      catchError(error => {
        console.error('[CameraDeviceService] Failed to update camera status:', error);
        throw error;
      })
    );
  }
}
