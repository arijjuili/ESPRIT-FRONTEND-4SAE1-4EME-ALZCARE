/**
 * Camera Device Model
 * 
 * Defines types and interfaces for camera device management in the admin dashboard.
 * Cameras are paired with patients for monitoring and event ingestion.
 */

/**
 * Camera status enum - represents the operational state of a camera device
 */
export type CameraStatus = 'ACTIVE' | 'OFFLINE' | 'PAUSED';

/**
 * Camera zone enum - represents the physical location where the camera is installed
 */
export type CameraZone = 'BEDROOM' | 'HALLWAY' | 'BATHROOM' | 'FRONT_DOOR' | 'KITCHEN' | 'LIVING_ROOM';

/**
 * Camera Device model - represents a paired camera in the system
 */
export interface CameraDevice {
  id: string;
  patientId: string;
  macAddress: string;
  zone: CameraZone;
  status: CameraStatus;
  lastSeen?: string;  // ISO timestamp
  pairedAt: string;   // ISO timestamp
  pairedBy: string;   // UUID of user who paired
}

/**
 * Request to pair a new camera device to a patient
 */
export interface CameraDeviceRequest {
  patientId: string;
  macAddress: string;
  zone: CameraZone;
  pairedBy: string;
}

/**
 * Status update request - for changing camera operational status
 */
export interface CameraStatusUpdateRequest {
  status: CameraStatus;
}
