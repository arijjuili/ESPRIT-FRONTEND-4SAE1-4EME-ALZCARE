import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';
import { MedicalFollowupService } from '../../../core/services/medical-followup.service';
import { 
  Appointment, 
  AppointmentMode, 
  AppointmentStatus 
} from '../../../core/models/medical-followup.model';

@Component({
  selector: 'app-patient-appointments',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './patient-appointments.component.html',
  styleUrls: ['./patient-appointments.component.scss']
})
export class PatientAppointmentsComponent implements OnInit {
  patientId: string | null = null;
  appointments: Appointment[] = [];
  loading = true;
  error: string | null = null;
  filterStatus: 'ALL' | AppointmentStatus = 'ALL';

  constructor(
    private authService: AuthService,
    private medicalService: MedicalFollowupService
  ) {}

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    console.log('[PatientAppointments] currentUser:', user);

    if (!user?.id) {
      this.error = 'No authenticated user found';
      this.loading = false;
      return;
    }

    this.patientId = user.id; // Same as PatientMedicationsComponent
    console.log('[PatientAppointments] Using patientId:', this.patientId);
    this.loadAppointments();
  }

  loadAppointments(): void {
    if (!this.patientId) return;
    this.loading = true;
    this.error = null;

    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);
    const ninetyDaysLater = new Date();
    ninetyDaysLater.setDate(today.getDate() + 90);

    // Format dates without timezone (for LocalDateTime compatibility) - same as dashboard
    const formatLocalDateTime = (date: Date): string => {
      return date.toISOString().replace('Z', '');
    };

    const fromDate = formatLocalDateTime(thirtyDaysAgo);
    const toDate = formatLocalDateTime(ninetyDaysLater);

    console.log('[PatientAppointments] Loading appointments for patient:', this.patientId);
    console.log('[PatientAppointments] Date range:', fromDate, 'to', toDate);

    this.medicalService.getPatientAppointments(
      this.patientId,
      fromDate,
      toDate
    ).subscribe({
      next: (appointments) => {
        console.log('[PatientAppointments] Appointments received:', appointments);
        console.log('[PatientAppointments] Appointments with meetingUrl:', 
          appointments.filter(a => a.meetingUrl).map(a => ({ id: a.id, meetingUrl: a.meetingUrl }))
        );
        console.log('[PatientAppointments] Appointments without meetingUrl:', 
          appointments.filter(a => !a.meetingUrl && a.mode === 'ONLINE').map(a => ({ id: a.id, status: a.status, mode: a.mode }))
        );
        this.appointments = appointments.sort((a, b) => 
          new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
        );
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading appointments:', err);
        this.error = 'Failed to load appointments';
        this.loading = false;
      }
    });
  }

  // Getter for filtered appointments
  get filteredAppointments(): Appointment[] {
    if (this.filterStatus === 'ALL') {
      return this.appointments;
    }
    return this.appointments.filter(a => a.status === this.filterStatus);
  }

  // Getter for upcoming appointments
  get upcomingAppointments(): Appointment[] {
    const now = new Date();
    return this.appointments.filter(a => 
      new Date(a.startAt) >= now && 
      a.status !== AppointmentStatus.CANCELLED
    );
  }

  // Getter for past appointments
  get pastAppointments(): Appointment[] {
    const now = new Date();
    return this.appointments.filter(a => 
      new Date(a.startAt) < now || 
      a.status === AppointmentStatus.CANCELLED
    );
  }

  // Getter for online appointments count
  get onlineAppointmentsCount(): number {
    return this.appointments.filter(a => a.mode === AppointmentMode.ONLINE).length;
  }

  // Method to set filter
  setFilter(status: string): void {
    this.filterStatus = status as 'ALL' | AppointmentStatus;
  }

  // Helper methods
  isOnlineAppointment(appointment: Appointment): boolean {
    return appointment.mode === AppointmentMode.ONLINE;
  }

  isTeleconsultationActive(appointment: Appointment): boolean {
    return appointment.mode === AppointmentMode.ONLINE && 
           appointment.status === AppointmentStatus.CONFIRMED &&
           !!appointment.meetingUrl;
  }

  isTeleconsultationPending(appointment: Appointment): boolean {
    return appointment.mode === AppointmentMode.ONLINE && 
           (appointment.status === AppointmentStatus.REQUESTED ||
            appointment.status === AppointmentStatus.ACCEPTED);
  }

  isAppointmentCancelled(appointment: Appointment): boolean {
    return appointment.status === AppointmentStatus.CANCELLED;
  }

  /**
   * Join Jitsi meeting in a new tab
   * Le meetingUrl est fourni par le backend quand le docteur confirme le RDV
   */
  joinMeeting(url: string | null | undefined): void {
    if (!url) {
      alert('No meeting link available. Please wait for the doctor to confirm the appointment.');
      return;
    }
    
    // Validate URL format
    try {
      new URL(url);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (e) {
      console.error('Invalid meeting URL:', url);
      alert('Invalid meeting URL. Please contact support.');
    }
  }

  /**
   * Copy meeting URL to clipboard
   */
  copyMeetingUrl(url: string | null | undefined): void {
    if (!url) {
      alert('No meeting link available to copy.');
      return;
    }
    
    navigator.clipboard.writeText(url).then(() => {
      console.log('Meeting URL copied to clipboard:', url);
      alert('Meeting link copied to clipboard!');
    }).catch(err => {
      console.error('Failed to copy URL:', err);
      // Fallback for older browsers
      this.fallbackCopyToClipboard(url);
    });
  }

  /**
   * Fallback copy method for browsers that don't support navigator.clipboard
   */
  private fallbackCopyToClipboard(text: string): void {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      const successful = document.execCommand('copy');
      if (successful) {
        alert('Meeting link copied to clipboard!');
      } else {
        alert('Failed to copy link. Please copy manually: ' + text);
      }
    } catch (err) {
      console.error('Fallback copy failed:', err);
      alert('Failed to copy link. Please copy manually: ' + text);
    }
    
    document.body.removeChild(textArea);
  }

  /**
   * Fetch meeting URL for a specific appointment
   * Le backend génère automatiquement le meetingUrl quand le docteur confirme le RDV
   */
  fetchMeetingUrl(appointmentId: number): void {
    console.log('[PatientAppointments] fetchMeetingUrl called for appointment:', appointmentId);
    
    if (!this.patientId) {
      alert('User not authenticated');
      return;
    }
    
    if (!appointmentId || appointmentId <= 0) {
      console.error('[PatientAppointments] Invalid appointment ID:', appointmentId);
      this.error = 'Invalid appointment ID';
      return;
    }
    
    this.loading = true;
    this.error = null;
    
    // Patient side: do not call /teleconsultation/link (often 404). Reload appointment details instead.
    this.medicalService.getAppointment(appointmentId).subscribe({
      next: (appointment) => {
        const index = this.appointments.findIndex(a => a.id === appointmentId);
        if (index !== -1) {
          this.appointments[index] = {
            ...this.appointments[index],
            meetingUrl: appointment.meetingUrl || undefined
          };
          this.appointments = [...this.appointments];
        }

        if (!appointment.meetingUrl) {
          this.error = 'Meeting link not ready yet. Waiting for doctor confirmation.';
        }

        this.loading = false;
      },
      error: (err) => {
        console.error('[PatientAppointments] ERROR reloading appointment:', err);
        this.error = 'Failed to get meeting link. Please try refreshing.';
        this.loading = false;
      }
    });
  }

  getModeBadgeClass(mode: AppointmentMode): string {
    return mode === AppointmentMode.ONLINE 
      ? 'bg-purple-100 text-purple-700 border-purple-200'
      : 'bg-blue-100 text-blue-700 border-blue-200';
  }

  getModeIcon(mode: AppointmentMode): string {
    return mode === AppointmentMode.ONLINE ? '💻' : '🏥';
  }

  getAppointmentStatusClass(status: AppointmentStatus): string {
    const classes: Record<AppointmentStatus, string> = {
      [AppointmentStatus.REQUESTED]: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      [AppointmentStatus.ACCEPTED]: 'bg-blue-100 text-blue-700 border-blue-200',
      [AppointmentStatus.REJECTED]: 'bg-red-100 text-red-700 border-red-200',
      [AppointmentStatus.CONFIRMED]: 'bg-green-100 text-green-700 border-green-200',
      [AppointmentStatus.COMPLETED]: 'bg-gray-100 text-gray-700 border-gray-200',
      [AppointmentStatus.CANCELLED]: 'bg-gray-200 text-gray-600 border-gray-300'
    };
    return classes[status] || 'bg-gray-100 text-gray-700';
  }

  getStatusIcon(status: AppointmentStatus): string {
    const icons: Record<AppointmentStatus, string> = {
      [AppointmentStatus.REQUESTED]: '⏳',
      [AppointmentStatus.ACCEPTED]: '👍',
      [AppointmentStatus.REJECTED]: '❌',
      [AppointmentStatus.CONFIRMED]: '✅',
      [AppointmentStatus.COMPLETED]: '✓',
      [AppointmentStatus.CANCELLED]: '🚫'
    };
    return icons[status];
  }

  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  formatTime(dateStr: string): string {
    return new Date(dateStr).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getDurationMinutes(startAt: string, endAt: string): number {
    const start = new Date(startAt).getTime();
    const end = new Date(endAt).getTime();
    return Math.round((end - start) / 60000);
  }

  isUpcoming(appointment: Appointment): boolean {
    return new Date(appointment.startAt) >= new Date() && 
           appointment.status !== AppointmentStatus.CANCELLED;
  }
}
