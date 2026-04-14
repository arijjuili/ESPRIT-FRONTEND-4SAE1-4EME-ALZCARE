import { CameraZone } from './camera-device.model';

/**
 * Activity Event Model
 *
 * Represents motion/activity events captured by ESP32-CAM devices
 * and ingested by the event-ingestion service.
 */

export interface ActivityEvent {
  id: string;
  patientId: string;
  deviceId: string;
  timestamp: string;  // ISO timestamp
  motionIntensity: number;
  duration: number;
  zone: CameraZone;
  snapshotUrl?: string;
  processedForBehavior: boolean;
}
