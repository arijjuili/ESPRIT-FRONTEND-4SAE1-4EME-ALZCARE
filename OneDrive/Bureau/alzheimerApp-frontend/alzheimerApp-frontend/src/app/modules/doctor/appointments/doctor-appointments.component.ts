import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MedicalFollowupService } from '../../../core/services/medical-followup.service';
import { UserManagementService } from '../../../core/services/user-management.service';
import { AuthService } from '../../../core/services/auth.service';
import { ManagedUser, UserRole } from '../../../core/models/user-management.model';
import { AuthUser } from '../../../core/models/user.model';
import {
  Appointment,
  AppointmentCreateRequest,
  AppointmentStatus,
  AppointmentType,
  AppointmentPriority,
  AppointmentMode
} from '../../../core/models/medical-followup.model';

/**
 * Doctor Appointments Management - Use Case
 * 
 * This component allows doctors to:
 * - View all appointments
 * - Create new appointments via Modal Dialog
 * - Search and select patients with autocomplete
 * - Auto-link caregiver from patient profile
 * - Auto-populate doctor from logged-in user
 * - Update appointment status (confirm, complete, cancel)
 * - Filter by date
 */
@Component({
  selector: 'app-doctor-appointments',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './doctor-appointments.component.html',
  styleUrls: ['./doctor-appointments.component.scss']
})
export class DoctorAppointmentsComponent implements OnInit {
  // Données
  appointments: Appointment[] = [];
  loading = false;
  error: string | null = null;

  // Filtres
  filterStatus: string = 'ALL';
  filterFrom: string = '';
  filterTo: string = '';

  // Logged-in doctor
  currentUser: AuthUser | null = null;
  doctorId = '';

  // Enums pour le template
  appointmentStatuses = Object.values(AppointmentStatus);
  appointmentTypes = Object.values(AppointmentType);
  appointmentPriorities = Object.values(AppointmentPriority);
  appointmentModes = Object.values(AppointmentMode);

  // Modal Dialog state
  showModal = false;

  // Patient Search
  patientSearchQuery = '';
  patients: ManagedUser[] = [];
  filteredPatients: ManagedUser[] = [];
  selectedPatient: ManagedUser | null = null;
  showPatientDropdown = false;
  loadingPatients = false;

  // Linked caregiver info (display only)
  linkedCaregiverName: string | null = null;

  // Appointment duration in minutes (default: 30)
  appointmentDuration: number = 30;

  // Create form
  newAppointment: AppointmentCreateRequest = {
    patientId: '',
    doctorId: '',
    type: AppointmentType.ROUTINE,
    priority: AppointmentPriority.NORMAL,
    mode: AppointmentMode.ONSITE,
    startAt: '',
    endAt: ''
  };

  // Route parameter for pre-selected patient
  routePatientId: string | null = null;

  constructor(
    private medicalService: MedicalFollowupService,
    private userManagementService: UserManagementService,
    private authService: AuthService,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadCurrentUser();
    this.initializeDateFilters();
    this.loadAppointments();
    this.loadPatients();
    
    // Check for patient ID in route params (from /doctor/patients/:id/appointments)
    this.route.params.subscribe(params => {
      this.routePatientId = params['id'] || null;
      if (this.routePatientId) {
        console.log('Patient ID from route:', this.routePatientId);
        this.preselectPatientFromRoute();
      }
    });
  }

  /**
   * Pre-select patient when coming from patient list
   */
  preselectPatientFromRoute(): void {
    if (!this.routePatientId || this.patients.length === 0) {
      return;
    }
    
    const patient = this.patients.find(p => p.id === this.routePatientId);
    if (patient) {
      console.log('Found patient for appointment:', patient);
      
      // First open the modal
      this.openModal();
      
      // Then set the patient data after modal is rendered
      setTimeout(() => {
        this.selectedPatient = patient;
        // Use Keycloak ID (userId) if available - same as selectPatient
        const keycloakId = (patient as any).userId || (patient as any).keycloakId || patient.id;
        this.newAppointment.patientId = keycloakId;
        console.log('[DoctorAppointments] Preselected patient ID:', keycloakId);
        this.patientSearchQuery = this.getPatientDisplayName(patient);
        console.log('Display name set to:', this.patientSearchQuery);
        
        // Load caregiver info
        this.loadPatientCaregiver(patient.id)
        
        // Force change detection to update the view
        this.cdr.detectChanges();
      }, 0);
    } else {
      console.warn('Patient not found for ID:', this.routePatientId);
    }
  }

  /**
   * Load current logged-in user (doctor)
   */
  loadCurrentUser(): void {
    this.currentUser = this.authService.getCurrentUser();
    if (this.currentUser && this.currentUser.role === 'doctor') {
      this.doctorId = this.currentUser.id;
    } else {
      // Fallback for development - should be removed in production
      this.doctorId = '1';
    }
  }

  /**
   * Initialize date filters (current month)
   */
  initializeDateFilters(): void {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    this.filterFrom = this.formatDateTimeLocal(firstDay);
    this.filterTo = this.formatDateTimeLocal(lastDay);
  }

  /**
   * Load all patients for autocomplete
   */
  loadPatients(): void {
    this.loadingPatients = true;
    this.userManagementService.getActivePatients().subscribe({
      next: (patients) => {
        this.patients = patients;
        this.filteredPatients = this.patients;
        this.loadingPatients = false;
        // If we have a route patient ID, try to pre-select now
        if (this.routePatientId) {
          this.preselectPatientFromRoute();
        }
      },
      error: (err) => {
        console.error('Error loading patients:', err);
        this.loadingPatients = false;
      }
    });
  }

  /**
   * Search/filter patients based on query
   */
  onPatientSearch(event: Event): void {
    const input = event.target as HTMLInputElement;
    const query = input.value;
    this.patientSearchQuery = query;
    this.showPatientDropdown = true;
    this.selectedPatient = null;
    this.newAppointment.patientId = '';
    this.linkedCaregiverName = null;

    if (!query.trim()) {
      this.filteredPatients = this.patients;
      return;
    }

    const lowerQuery = query.toLowerCase();
    this.filteredPatients = this.patients.filter(patient => 
      (patient.fullName && patient.fullName.toLowerCase().includes(lowerQuery)) ||
      (patient.firstName && patient.firstName.toLowerCase().includes(lowerQuery)) ||
      (patient.lastName && patient.lastName.toLowerCase().includes(lowerQuery)) ||
      (patient.email && patient.email.toLowerCase().includes(lowerQuery)) ||
      (patient.username && patient.username.toLowerCase().includes(lowerQuery)) ||
      patient.id.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Select a patient from the dropdown
   */
  selectPatient(patient: ManagedUser): void {
    this.selectedPatient = patient;
    // Use Keycloak ID (userId) if available, fallback to id - same as prescriptions
    const keycloakId = (patient as any).userId || (patient as any).keycloakId || patient.id;
    this.newAppointment.patientId = keycloakId;
    console.log('[DoctorAppointments] Selected patient ID:', keycloakId);
    this.patientSearchQuery = this.getPatientDisplayName(patient);
    this.showPatientDropdown = false;
    
    // Load patient profile to get linked caregiver
    this.loadPatientCaregiver(patient.id);
  }

  /**
   * Load patient's caregiver info from already loaded patients list
   */
  loadPatientCaregiver(patientId: string): void {
    const patient = this.patients.find(p => p.id === patientId);
    if (patient && (patient as any).caregiverId) {
      const caregiverId = (patient as any).caregiverId;
      // Try to find caregiver in loaded patients list
      const caregiver = this.patients.find(p => p.id === caregiverId);
      if (caregiver) {
        this.linkedCaregiverName = caregiver.fullName || caregiver.username || 'Unknown';
      } else {
        this.linkedCaregiverName = 'Assigned (details unavailable)';
      }
    } else {
      this.linkedCaregiverName = null;
    }
  }

  /**
   * Get display name for patient (full name only)
   */
  getPatientDisplayName(patient: ManagedUser): string {
    if (!patient) return 'Unknown';
    
    const fullName = patient.fullName?.trim();
    const firstLast = patient.firstName && patient.lastName 
      ? `${patient.firstName} ${patient.lastName}`.trim() 
      : '';
    const username = patient.username?.trim();
    const email = patient.email?.trim();
    
    return fullName || firstLast || username || email || 'Unknown';
  }

  /**
   * Get patient name by ID from loaded patients list
   */
  getPatientNameById(patientId: string): string {
    const patient = this.patients.find(p => p.id === patientId);
    if (patient) {
      return patient.fullName || 
        (patient.firstName && patient.lastName ? `${patient.firstName} ${patient.lastName}` : null) ||
        patient.username || 
        patient.email ||
        'Unknown Patient';
    }
    return 'Unknown Patient';
  }

  /**
   * Calculate end date based on start date and duration
   */
  calculateEndDate(): void {
    if (this.newAppointment.startAt) {
      const startDate = new Date(this.newAppointment.startAt);
      const endDate = new Date(startDate.getTime() + this.appointmentDuration * 60000);
      this.newAppointment.endAt = this.formatDateTimeLocal(endDate);
    }
  }

  /**
   * Called when duration changes
   */
  onDurationChange(): void {
    this.calculateEndDate();
  }

  /**
   * Hide dropdown when clicking outside
   */
  hidePatientDropdown(): void {
    setTimeout(() => {
      this.showPatientDropdown = false;
    }, 200);
  }

  /**
   * Clear patient selection
   */
  clearPatientSelection(): void {
    this.selectedPatient = null;
    this.patientSearchQuery = '';
    this.newAppointment.patientId = '';
    this.linkedCaregiverName = null;
    this.filteredPatients = this.patients;
  }

  /**
   * Open modal dialog
   */
  openModal(): void {
    this.showModal = true;
    this.resetForm();
  }

  /**
   * Close modal dialog
   */
  closeModal(): void {
    this.showModal = false;
    this.resetForm();
  }

  /**
   * Load doctor appointments
   */
  loadAppointments(): void {
    this.loading = true;
    this.error = null;

    this.medicalService.getDoctorAppointments(
      this.doctorId,
      this.filterFrom,
      this.filterTo
    ).subscribe({
      next: (appointments) => {
        console.log('[DoctorAppointments] Loaded appointments:', appointments);
        // Log appointments with ONLINE mode to check meetingUrl
        appointments.forEach(appt => {
          if (appt.mode === AppointmentMode.ONLINE) {
            console.log(`[DoctorAppointments] Online appointment ${appt.id}: status=${appt.status}, meetingUrl=${appt.meetingUrl}`);
          }
        });
        this.appointments = appointments.sort((a, b) => 
          new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
        );
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Error loading appointments';
        this.loading = false;
        console.error('Error loading appointments:', err);
      }
    });
  }

  /**
   * Filter appointments by status
   */
  get filteredAppointments(): Appointment[] {
    if (this.filterStatus === 'ALL') {
      return this.appointments;
    }
    return this.appointments.filter(a => a.status === this.filterStatus);
  }

  /**
   * Count appointments by status
   */
  get confirmedCount(): number {
    return this.appointments.filter(a => a.status === AppointmentStatus.CONFIRMED).length;
  }

  get completedCount(): number {
    return this.appointments.filter(a => a.status === AppointmentStatus.COMPLETED).length;
  }

  get cancelledCount(): number {
    return this.appointments.filter(a => a.status === AppointmentStatus.CANCELLED).length;
  }

  /**
   * Calculate duration in minutes between two dates
   */
  getDurationMinutes(startAt: string, endAt: string): number {
    const start = new Date(startAt).getTime();
    const end = new Date(endAt).getTime();
    return Math.round((end - start) / 60000);
  }

  /**
   * Create a new appointment
   */
  createAppointment(): void {
    if (!this.validateAppointment()) {
      return;
    }

    // Set the doctor ID from logged-in user
    this.newAppointment.doctorId = this.doctorId;

    // Ensure dates are in ISO format without timezone (for LocalDateTime compatibility)
    const formatLocalDateTime = (dateStr: string): string => {
      const date = new Date(dateStr);
      // Format: YYYY-MM-DDTHH:mm:ss.sss (ISO format without Z)
      return date.toISOString().replace('Z', '');
    };

    const appointmentToSend = {
      ...this.newAppointment,
      status: 'REQUESTED',
      startAt: formatLocalDateTime(this.newAppointment.startAt),
      endAt: formatLocalDateTime(this.newAppointment.endAt)
    };

    // Debug log
    console.log('Creating appointment:', JSON.stringify(appointmentToSend, null, 2));

    this.loading = true;
    this.medicalService.createAppointment(appointmentToSend).subscribe({
      next: (appointment) => {
        this.appointments.push(appointment);
        this.appointments.sort((a, b) => 
          new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
        );
        this.closeModal();
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Error creating appointment';
        this.loading = false;
        console.error('Error creating appointment:', err);
      }
    });
  }

  /**
   * Change appointment status
   * Le backend génère automatiquement le meetingUrl quand un RDV ONLINE est CONFIRMÉ
   */
  updateStatus(appointmentId: number, status: AppointmentStatus): void {
    this.loading = true;
    console.log('[DoctorAppointments] Updating status to', status, 'for appointment', appointmentId);
    
    this.medicalService.changeAppointmentStatus(appointmentId, status).subscribe({
      next: (updated) => {
        console.log('[DoctorAppointments] Response from PATCH:', updated);
        console.log('[DoctorAppointments] Response meetingUrl:', updated.meetingUrl);
        console.log('[DoctorAppointments] Response status:', updated.status);
        
        const index = this.appointments.findIndex(a => a.id === appointmentId);
        if (index !== -1) {
          // 🆕 IMPORTANT: Mettre à jour avec les données du backend (incluant meetingUrl)
          this.appointments[index] = { 
            ...this.appointments[index], 
            ...updated,
            // S'assurer que meetingUrl est mis à jour si présent dans la réponse
            meetingUrl: updated.meetingUrl || this.appointments[index].meetingUrl
          };
          
          console.log('[DoctorAppointments] Updated appointment. meetingUrl:', this.appointments[index].meetingUrl);
          
          // Si c'est une confirmation d'un RDV ONLINE et qu'on n'a pas encore de meetingUrl,
          // recharger cet appointment spécifique pour récupérer le meetingUrl
          if (status === AppointmentStatus.CONFIRMED && 
              this.appointments[index].mode === AppointmentMode.ONLINE &&
              !this.appointments[index].meetingUrl) {
            console.log('[DoctorAppointments] No meetingUrl after confirm, fetching specific appointment...');
            this.reloadSingleAppointment(appointmentId);
          }
        }
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        console.error('Error updating status:', err);
        this.error = 'Failed to update appointment status. Please try again.';
      }
    });
  }

  /**
   * Cancel an appointment
   */
  cancelAppointment(appointmentId: number): void {
    if (confirm('Are you sure you want to cancel this appointment?')) {
      this.updateStatus(appointmentId, AppointmentStatus.CANCELLED);
    }
  }

  /**
   * Confirm an appointment
   */
  confirmAppointment(appointmentId: number): void {
    this.updateStatus(appointmentId, AppointmentStatus.CONFIRMED);
  }

  /**
   * Mark an appointment as completed
   */
  completeAppointment(appointmentId: number): void {
    this.updateStatus(appointmentId, AppointmentStatus.COMPLETED);
  }

  /**
   * 🆕 Recharger un seul appointment pour récupérer le meetingUrl
   * Utilisé après confirmation d'un RDV ONLINE
   */
  reloadSingleAppointment(appointmentId: number): void {
    console.log('[DoctorAppointments] Reloading single appointment:', appointmentId);
    
    this.medicalService.getAppointment(appointmentId).subscribe({
      next: (appointment) => {
        console.log('[DoctorAppointments] Reloaded appointment:', appointment);
        
        const index = this.appointments.findIndex(a => a.id === appointmentId);
        if (index !== -1) {
          this.appointments[index] = { 
            ...this.appointments[index], 
            ...appointment,
            meetingUrl: appointment.meetingUrl || this.appointments[index].meetingUrl
          };
          this.appointments = [...this.appointments]; // Force change detection
          
          if (this.appointments[index].meetingUrl) {
            console.log('[DoctorAppointments] ✅ Got meetingUrl:', this.appointments[index].meetingUrl);
          } else {
            console.warn('[DoctorAppointments] ⚠️ Still no meetingUrl from backend');
          }
        }
      },
      error: (err) => {
        console.error('[DoctorAppointments] Error reloading appointment:', err);
      }
    });
  }

  /**
   * Form validation
   */
  validateAppointment(): boolean {
    if (!this.newAppointment.patientId) {
      alert('Please select a patient');
      return false;
    }
    if (!this.newAppointment.startAt) {
      alert('Please set start date and time');
      return false;
    }
    return true;
  }

  /**
   * Reset form
   */
  resetForm(): void {
    this.appointmentDuration = 30;
    this.newAppointment = {
      patientId: '',
      doctorId: this.doctorId,
      type: AppointmentType.ROUTINE,
      priority: AppointmentPriority.NORMAL,
      mode: AppointmentMode.ONSITE,
      startAt: '',
      endAt: ''
    };
    this.patientSearchQuery = '';
    this.selectedPatient = null;
    this.filteredPatients = this.patients;
    this.linkedCaregiverName = null;
    this.showPatientDropdown = false;
  }

  /**
   * Format date for datetime-local input
   */
  formatDateTimeLocal(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  /**
   * Format ISO date for display
   */
  formatDateDisplay(isoString: string): string {
    const date = new Date(isoString);
    return date.toLocaleString('en-US', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Return CSS class based on status
   */
  getStatusClass(status: AppointmentStatus): string {
    const classes: Record<AppointmentStatus, string> = {
      [AppointmentStatus.REQUESTED]: 'bg-gray-100 text-gray-800',
      [AppointmentStatus.ACCEPTED]: 'bg-blue-100 text-blue-800',
      [AppointmentStatus.REJECTED]: 'bg-red-100 text-red-800',
      [AppointmentStatus.CONFIRMED]: 'bg-green-100 text-green-800',
      [AppointmentStatus.COMPLETED]: 'bg-purple-100 text-purple-800',
      [AppointmentStatus.CANCELLED]: 'bg-gray-300 text-gray-600'
    };
    return classes[status] || 'bg-gray-100';
  }

  /**
   * Return CSS class based on priority
   */
  getPriorityClass(priority: AppointmentPriority): string {
    const classes: Record<AppointmentPriority, string> = {
      [AppointmentPriority.LOW]: 'bg-gray-100 text-gray-600',
      [AppointmentPriority.NORMAL]: 'bg-yellow-100 text-yellow-700',
      [AppointmentPriority.HIGH]: 'bg-orange-100 text-orange-700',
      [AppointmentPriority.CRITICAL]: 'bg-red-100 text-red-700'
    };
    return classes[priority];
  }

  /**
   * Return icon based on appointment type
   */
  getTypeIcon(type: AppointmentType): string {
    const icons: Record<AppointmentType, string> = {
      [AppointmentType.ROUTINE]: '🩺',
      [AppointmentType.FOLLOW_UP]: '🔄',
      [AppointmentType.COGNITIVE_TEST]: '🧠',
      [AppointmentType.EMERGENCY]: '🚨'
    };
    return icons[type];
  }

  /**
   * Return CSS class based on appointment mode (ONLINE/ONSITE)
   */
  getModeClass(mode: AppointmentMode): string {
    const classes: Record<AppointmentMode, string> = {
      [AppointmentMode.ONSITE]: 'bg-blue-100 text-blue-800 border-blue-200',
      [AppointmentMode.ONLINE]: 'bg-purple-100 text-purple-800 border-purple-200'
    };
    return classes[mode];
  }

  /**
   * Return icon based on appointment mode
   */
  getModeIcon(mode: AppointmentMode): string {
    const icons: Record<AppointmentMode, string> = {
      [AppointmentMode.ONSITE]: '🏥',
      [AppointmentMode.ONLINE]: '💻'
    };
    return icons[mode];
  }

  /**
   * Check if appointment is eligible for teleconsultation
   * (ONLINE mode and CONFIRMED status)
   */
  isTeleconsultationActive(appointment: Appointment): boolean {
    const isActive = appointment.mode === AppointmentMode.ONLINE && 
                     appointment.status === AppointmentStatus.CONFIRMED &&
                     !!appointment.meetingUrl;
    return isActive;
  }

  /**
   * Fetch meeting URL for a specific appointment
   * Le backend génère automatiquement le meetingUrl quand le RDV est CONFIRMÉ
   */
  fetchMeetingUrl(appointmentId: number): void {
    if (!this.currentUser?.id) {
      alert('User not authenticated');
      return;
    }
    
    this.loading = true;
    this.error = null;
    
    this.medicalService.getAppointment(appointmentId).subscribe({
      next: (appointment) => {
        console.log('[DoctorAppointments] Fetched appointment:', appointment);
        const index = this.appointments.findIndex(a => a.id === appointmentId);
        
        if (index !== -1) {
          this.appointments[index] = { 
            ...this.appointments[index], 
            meetingUrl: appointment.meetingUrl 
          };
          this.appointments = [...this.appointments];
          
          if (appointment.meetingUrl) {
            console.log('[DoctorAppointments] Updated with meetingUrl:', appointment.meetingUrl);
          } else {
            console.warn('[DoctorAppointments] No meetingUrl yet - appointment needs to be confirmed');
          }
        }
        this.loading = false;
      },
      error: (err) => {
        console.error('[DoctorAppointments] Error fetching appointment:', err);
        this.error = 'Failed to get meeting link. Please try refreshing.';
        this.loading = false;
      }
    });
  }

  /**
   * Check if teleconsultation is pending (ONLINE but not confirmed yet)
   */
  isTeleconsultationPending(appointment: Appointment): boolean {
    return appointment.mode === AppointmentMode.ONLINE && 
           appointment.status === AppointmentStatus.REQUESTED;
  }

  /**
   * Check if appointment is cancelled
   */
  isAppointmentCancelled(appointment: Appointment): boolean {
    return appointment.status === AppointmentStatus.CANCELLED;
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
      // Fallback for older browsers or if permission denied
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
   * Join Jitsi meeting in a new tab
   * Le meetingUrl est fourni par le backend quand le RDV est CONFIRMÉ
   */
  joinMeeting(url: string | null | undefined): void {
    if (!url) {
      alert('No meeting link available. Please confirm the appointment first.');
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
}
