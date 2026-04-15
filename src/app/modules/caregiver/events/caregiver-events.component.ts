import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil, forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ActivityEventService } from '../../../core/services/activity-event.service';
import { PatientProfileResponse } from '../../../core/services/patient.service';
import { CaregiverPatientContextService } from '../../../core/services/caregiver-patient-context.service';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { ActivityEvent } from '../../../core/models/activity-event.model';
import { CameraZone } from '../../../core/models/camera-device.model';

interface EventDayGroup {
  label: string;
  dateKey: string;
  events: ActivityEvent[];
}

@Component({
  selector: 'app-caregiver-events',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './caregiver-events.component.html',
  styleUrls: ['./caregiver-events.component.scss']
})
export class CaregiverEventsComponent implements OnInit, OnDestroy {
  patients: PatientProfileResponse[] = [];
  selectedPatientId = '';
  loadingPatients = false;

  events: ActivityEvent[] = [];
  loadingEvents = false;

  groupedEvents: EventDayGroup[] = [];

  // Lightbox
  lightboxOpen = false;
  lightboxImageUrl: string | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    private activityEventService: ActivityEventService,
    private caregiverPatientContext: CaregiverPatientContextService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.loadPatients();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.lightboxOpen) {
      document.body.style.overflow = '';
    }
  }

  private loadPatients(): void {
    this.loadingPatients = true;
    this.caregiverPatientContext.getAssignedPatients()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (patients) => {
          this.patients = patients;
          this.loadingPatients = false;
        },
        error: () => {
          this.toastService.error('Failed to load patients');
          this.loadingPatients = false;
        }
      });
  }

  onPatientSelect(patientId: string): void {
    this.selectedPatientId = patientId;
    if (patientId) {
      this.loadEvents(patientId);
    } else {
      this.events = [];
      this.groupedEvents = [];
    }
  }

  private loadEvents(patientId: string): void {
    this.loadingEvents = true;
    this.activityEventService.getEventsByPatient(patientId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (events) => {
          this.events = events.sort((a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );
          this.groupEventsByDay();
          this.loadingEvents = false;
        },
        error: () => {
          this.toastService.error('Failed to load activity events');
          this.loadingEvents = false;
          this.events = [];
          this.groupedEvents = [];
        }
      });
  }

  private groupEventsByDay(): void {
    const groups = new Map<string, EventDayGroup>();

    this.events.forEach(event => {
      const date = new Date(event.timestamp);
      const key = this.getLocalDateKey(date);
      const label = this.getDayLabel(date);

      if (!groups.has(key)) {
        groups.set(key, { label, dateKey: key, events: [] });
      }
      groups.get(key)!.events.push(event);
    });

    this.groupedEvents = Array.from(groups.values());
  }

  private getLocalDateKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private getDayLabel(date: Date): string {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const dKey = this.getLocalDateKey(date);
    if (dKey === this.getLocalDateKey(today)) return 'Today';
    if (dKey === this.getLocalDateKey(yesterday)) return 'Yesterday';
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  }

  getSelectedPatientName(): string {
    const patient = this.patients.find(p => p.id === this.selectedPatientId);
    return patient ? `${patient.firstName} ${patient.lastName}` : '';
  }

  getZoneLabel(zone: CameraZone): string {
    const labels: Record<CameraZone, string> = {
      BEDROOM: 'Bedroom',
      HALLWAY: 'Hallway',
      BATHROOM: 'Bathroom',
      FRONT_DOOR: 'Front Door',
      KITCHEN: 'Kitchen',
      LIVING_ROOM: 'Living Room'
    };
    return labels[zone] || zone;
  }

  getZoneIcon(zone: CameraZone): string {
    const icons: Record<CameraZone, string> = {
      BEDROOM: '🛏️',
      HALLWAY: '🚶',
      BATHROOM: '🚿',
      FRONT_DOOR: '🚪',
      KITCHEN: '🍳',
      LIVING_ROOM: '🛋️'
    };
    return icons[zone] || '📹';
  }

  formatTime(timestamp: string): string {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  openLightbox(url: string): void {
    this.lightboxImageUrl = url;
    this.lightboxOpen = true;
    document.body.style.overflow = 'hidden';
  }

  closeLightbox(): void {
    this.lightboxOpen = false;
    this.lightboxImageUrl = null;
    document.body.style.overflow = '';
  }

  onLightboxKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.closeLightbox();
    }
  }

  getMotionIntensityClass(intensity: number): string {
    if (intensity >= 0.7) return 'bg-rose-100 text-rose-700 border-rose-200';
    if (intensity >= 0.4) return 'bg-amber-100 text-amber-700 border-amber-200';
    return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  }

  getMotionIntensityLabel(intensity: number): string {
    if (intensity >= 0.7) return 'High';
    if (intensity >= 0.4) return 'Medium';
    return 'Low';
  }
}
