import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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

  constructor(
    private medicalService: MedicalFollowupService,
    private userManagementService: UserManagementService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadCurrentUser();
    this.initializeDateFilters();
    this.loadAppointments();
    this.loadPatients();
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
    this.newAppointment.patientId = patient.id;
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
    return patient.fullName || 
      (patient.firstName && patient.lastName ? `${patient.firstName} ${patient.lastName}` : null) ||
      patient.username || 
      patient.email ||
      'Unknown';
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
   */
  updateStatus(appointmentId: number, status: AppointmentStatus): void {
    this.medicalService.changeAppointmentStatus(appointmentId, status).subscribe({
      next: (updated) => {
        const index = this.appointments.findIndex(a => a.id === appointmentId);
        if (index !== -1) {
          this.appointments[index] = updated;
        }
      },
      error: (err) => {
        console.error('Error updating status:', err);
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
}
