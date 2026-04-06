import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { MedicalFollowupService } from '../../../core/services/medical-followup.service';
import { UserManagementService } from '../../../core/services/user-management.service';
import { AuthService } from '../../../core/services/auth.service';
import { ManagedUser, UserRole } from '../../../core/models/user-management.model';
import { AuthUser } from '../../../core/models/user.model';
import {
  AppointmentSchedulingService,
  AvailabilitySource,
  SchedulingConflict,
  SuggestedSlot
} from '../../../core/services/appointment-scheduling.service';
import {
  Appointment,
  AppointmentCreateRequest,
  AppointmentUpdateRequest,
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
  successMessage: string | null = null;

  // Filtres
  filterStatus: string = 'ALL';
  filterFrom: string = '';
  filterTo: string = '';
  filterDay: string = ''; // YYYY-MM-DD (UI helper)
  hideClosed: boolean = false; // UI-only: hide CANCELLED + COMPLETED from the visible list

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
  modalMode: 'create' | 'reschedule' = 'create';
  editingAppointmentId: number | null = null;
  editingAppointmentStatus: AppointmentStatus | null = null;

  // Patient Search
  patientSearchQuery = '';
  patients: ManagedUser[] = [];
  filteredPatients: ManagedUser[] = [];
  selectedPatient: ManagedUser | null = null;
  showPatientDropdown = false;
  loadingPatients = false;

  // Linked caregiver info (display only)
  linkedCaregiverName: string | null = null;
  linkedCaregiverId: string | null = null;

  // Smart Scheduling (Module 1.2)
  caregiverMustBeAvailable = true;
  transportDependency = false;
  transportBufferMinutes = 30;

  // Availability / conflict resolution state
  availabilityChecked = false;
  availabilityLoading = false;
  availabilityError: string | null = null;
  availabilityConflicts: SchedulingConflict[] = [];
  blockingConflicts: SchedulingConflict[] = [];
  preemptibleConflicts: SchedulingConflict[] = [];
  allowPriorityOverride = false;
  suggestedSlots: SuggestedSlot[] = [];
  activeActionId: number | null = null;
  
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
	    private schedulingService: AppointmentSchedulingService,
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
    // End of day, otherwise appointments on the last day (e.g. 31st 09:30) fall outside the range.
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    
    this.filterFrom = this.formatDateTimeLocal(firstDay);
    this.filterTo = this.formatDateTimeLocal(lastDay);
    this.filterDay = '';
  }

  /**
   * Quick filter by day (sets From/To to the selected day boundaries).
   */
  applyDayFilter(day: string): void {
    if (!day) return;

    const [yyyy, mm, dd] = day.split('-').map(v => Number(v));
    if (!yyyy || !mm || !dd) return;

    const start = new Date(yyyy, mm - 1, dd, 0, 0, 0);
    const end = new Date(yyyy, mm - 1, dd, 23, 59, 59);

    this.filterDay = day;
    this.filterFrom = this.formatDateTimeLocal(start);
    this.filterTo = this.formatDateTimeLocal(end);
    this.loadAppointments();
  }

  setDayToToday(): void {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    this.applyDayFilter(`${yyyy}-${mm}-${dd}`);
  }

  clearDayFilter(): void {
    this.filterDay = '';
    this.initializeDateFilters();
    this.loadAppointments();
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
	    this.linkedCaregiverId = null;
	    this.resetAvailability();

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
	    this.resetAvailability();
	    
	    // Load patient profile to get linked caregiver
	    this.loadPatientCaregiver(patient.id);
  }

  /**
   * Load patient's caregiver info from already loaded patients list
   */
  loadPatientCaregiver(patientId: string): void {
    const patient = this.patients.find(p => p.id === patientId);
    if (!patient) {
      this.linkedCaregiverName = null;
      this.linkedCaregiverId = null;
      return;
    }

    const caregiverId = this.extractCaregiverId(patient);
    this.linkedCaregiverId = caregiverId;

    if (!caregiverId) {
      this.linkedCaregiverName = null;
      return;
    }

    // We may not have caregiver details here (patients list). Keep a useful fallback label.
    const caregiver = this.patients.find(p => p.id === caregiverId);
    this.linkedCaregiverName = caregiver?.fullName || caregiver?.username || `Assigned (${caregiverId})`;
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

  private findPatientByAnyId(patientId: string): ManagedUser | undefined {
    return this.patients.find(patient => {
      const candidate = patient as ManagedUser & { userId?: string; keycloakId?: string };
      return (
        patient.id === patientId ||
        candidate.userId === patientId ||
        candidate.keycloakId === patientId
      );
    });
  }

  /**
   * Get patient name by ID from loaded patients list
   */
  getPatientNameById(patientId: string): string {
    const patient = this.findPatientByAnyId(patientId);
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
      this.resetAvailability();
    }
  }

  /**
   * Called when duration changes
   */
  onDurationChange(): void {
    this.calculateEndDate();
  }

  onModeChange(): void {
    // Transport/caregiver constraints are relevant mainly for onsite visits.
    if (this.newAppointment.mode === AppointmentMode.ONLINE) {
      this.transportDependency = false;
      this.caregiverMustBeAvailable = false;
    } else {
      this.caregiverMustBeAvailable = true;
    }
    this.resetAvailability();
  }

  onConstraintsChange(): void {
    this.resetAvailability();
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
    this.linkedCaregiverId = null;
    this.filteredPatients = this.patients;
    this.resetAvailability();
  }

  /**
   * Open modal dialog
   */
  openModal(): void {
    this.modalMode = 'create';
    this.successMessage = null;
    this.showModal = true;
    this.resetForm();
  }

  openRescheduleModal(appointment: Appointment): void {
    const patient = this.findPatientByAnyId(appointment.patientId) || null;
    const startDate = this.schedulingService.parseLocalDateTime(
      this.schedulingService.normalizeLocalDateTime(appointment.startAt)
    );
    const endDate = this.schedulingService.parseLocalDateTime(
      this.schedulingService.normalizeLocalDateTime(appointment.endAt)
    );

    this.modalMode = 'reschedule';
    this.successMessage = null;
    this.showModal = true;
    this.resetForm();
    this.editingAppointmentId = appointment.id;
    this.editingAppointmentStatus = appointment.status;
    this.selectedPatient = patient;
    this.patientSearchQuery = patient ? this.getPatientDisplayName(patient) : this.getPatientNameById(appointment.patientId);
    this.newAppointment = {
      patientId: appointment.patientId,
      doctorId: this.doctorId,
      caregiverId: appointment.caregiverId ? String(appointment.caregiverId) : undefined,
      type: appointment.type,
      priority: appointment.priority,
      mode: appointment.mode,
      startAt: startDate ? this.formatDateTimeLocal(startDate) : this.schedulingService.normalizeLocalDateTime(appointment.startAt).slice(0, 16),
      endAt: endDate ? this.formatDateTimeLocal(endDate) : this.schedulingService.normalizeLocalDateTime(appointment.endAt).slice(0, 16),
      meetingUrl: appointment.meetingUrl
    };

    if (startDate && endDate) {
      this.appointmentDuration = this.getDurationMinutes(appointment.startAt, appointment.endAt);
    }

    if (patient) {
      this.loadPatientCaregiver(patient.id);
    }

    this.onModeChange();
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
        this.appointments = appointments.sort((a, b) => this.compareAppointments(a, b));
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
    let list = this.appointments;

    if (this.filterStatus !== 'ALL') {
      list = list.filter(a => a.status === this.filterStatus);
    }

    if (this.hideClosed) {
      list = list.filter(a => a.status !== AppointmentStatus.CANCELLED && a.status !== AppointmentStatus.COMPLETED);
    }

    return list;
  }

  /**
   * Group visible appointments by day for a cleaner list display.
   */
  get appointmentsByDay(): Array<{ dayKey: string; dayLabel: string; items: Appointment[] }> {
    const visible = this.filteredAppointments;

    if (this.filterStatus === AppointmentStatus.REQUESTED) {
      const urgent = visible
        .filter(appt => this.schedulingService.isUrgentAppointment(appt))
        .slice()
        .sort((a, b) => this.compareAppointments(a, b));

      const routine = visible
        .filter(appt => !this.schedulingService.isUrgentAppointment(appt));

      const dayGroups = this.groupAppointmentsByDay(routine);

      const urgentGroup = urgent.length > 0
        ? [{
            dayKey: 'URGENT',
            dayLabel: 'Urgent requests',
            items: urgent
          }]
        : [];

      return [...urgentGroup, ...dayGroups];
    }

    return this.groupAppointmentsByDay(visible);
  }

  private groupAppointmentsByDay(list: Appointment[]): Array<{ dayKey: string; dayLabel: string; items: Appointment[] }> {
    const groups = new Map<string, Appointment[]>();

    for (const appt of list) {
      const date = new Date(appt.startAt);
      if (Number.isNaN(date.getTime())) continue;

      const dayKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      const bucket = groups.get(dayKey) || [];
      bucket.push(appt);
      groups.set(dayKey, bucket);
    }

    const keys = Array.from(groups.keys()).sort((a, b) => a.localeCompare(b));
    return keys.map(dayKey => {
      const items = (groups.get(dayKey) || []).slice().sort((a, b) => this.compareAppointments(a, b));
      const dayLabel = new Date(`${dayKey}T00:00:00`).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
      return { dayKey, dayLabel, items };
    });
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

  private compareAppointments(a: Appointment, b: Appointment): number {
    const urgentRankA = this.schedulingService.isUrgentAppointment(a) ? 1 : 0;
    const urgentRankB = this.schedulingService.isUrgentAppointment(b) ? 1 : 0;

    if (urgentRankA !== urgentRankB) {
      return urgentRankB - urgentRankA; // urgent first
    }

    const timeDelta = new Date(a.startAt).getTime() - new Date(b.startAt).getTime();
    if (timeDelta !== 0) {
      return timeDelta;
    }

    return this.schedulingService.getPriorityRank(b.priority) - this.schedulingService.getPriorityRank(a.priority);
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

    // Smart Scheduling Conflict Resolution (Module 1.2)
    // If a conflict exists, we suggest alternatives and block creation until user chooses a compatible slot.
    this.runAvailabilityCheck(() => {
      if (this.modalMode === 'reschedule') {
        this.performRescheduleAppointment();
        return;
      }

      this.performCreateAppointment();
    });
  }

  checkAvailability(): void {
    if (!this.validateAppointment()) {
      return;
    }
    this.runAvailabilityCheck();
  }

  applySuggestedSlot(slot: SuggestedSlot): void {
    const start = this.schedulingService.parseLocalDateTime(slot.startAt);
    const end = this.schedulingService.parseLocalDateTime(slot.endAt);

    if (!start || !end) {
      this.availabilityError = 'Invalid suggested slot. Please try another one.';
      return;
    }

    this.newAppointment.startAt = this.formatDateTimeLocal(start);
    this.newAppointment.endAt = this.formatDateTimeLocal(end);
    this.resetAvailability();
  }

  private performCreateAppointment(): void {
    const appointmentToSend = {
      ...this.newAppointment,
      // Doctor-created appointments are immediately scheduled (no "accept" needed).
      status: AppointmentStatus.CONFIRMED,
      startAt: this.schedulingService.normalizeLocalDateTime(this.newAppointment.startAt),
      endAt: this.schedulingService.normalizeLocalDateTime(this.newAppointment.endAt)
    };

    this.loading = true;
    this.error = null;
    this.medicalService.createAppointment(appointmentToSend).subscribe({
      next: (appointment) => {
        this.appointments.push(appointment);
        this.appointments.sort((a, b) => this.compareAppointments(a, b));
        this.successMessage = this.allowPriorityOverride
          ? `Urgent appointment created. ${this.preemptibleConflicts.length} routine conflict(s) should be rescheduled.`
          : 'Appointment created successfully.';
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

  private performRescheduleAppointment(): void {
    if (!this.editingAppointmentId) {
      this.error = 'Unable to reschedule this appointment.';
      return;
    }

    const appointmentId = this.editingAppointmentId;

    const updatePayload: AppointmentUpdateRequest = {
      type: this.newAppointment.type,
      priority: this.newAppointment.priority,
      mode: this.newAppointment.mode,
      startAt: this.schedulingService.normalizeLocalDateTime(this.newAppointment.startAt),
      endAt: this.schedulingService.normalizeLocalDateTime(this.newAppointment.endAt),
      meetingUrl: this.newAppointment.meetingUrl
    };

    this.loading = true;
    this.error = null;

    this.medicalService.updateAppointment(appointmentId, updatePayload).subscribe({
      next: (updatedAppointment) => {
        const finalizeReschedule = (appointment: Appointment, message: string) => {
          const index = this.appointments.findIndex(item => item.id === appointment.id);
          if (index !== -1) {
            this.appointments[index] = {
              ...this.appointments[index],
              ...appointment,
              meetingUrl: appointment.meetingUrl || this.appointments[index].meetingUrl
            };
            this.appointments = [...this.appointments].sort((a, b) => this.compareAppointments(a, b));
          }

          this.successMessage = message;
          this.closeModal();
          this.loading = false;
        };

        if (this.editingAppointmentStatus === AppointmentStatus.REQUESTED) {
          this.medicalService.changeAppointmentStatus(appointmentId, AppointmentStatus.ACCEPTED).subscribe({
            next: (acceptedAppointment) => {
              finalizeReschedule(
                { ...updatedAppointment, ...acceptedAppointment },
                this.allowPriorityOverride
                  ? `Urgent appointment rescheduled and accepted. ${this.preemptibleConflicts.length} routine conflict(s) should be reviewed.`
                  : 'Appointment rescheduled and accepted.'
              );
            },
            error: (statusErr) => {
              console.error('Error marking rescheduled appointment as accepted:', statusErr);
              finalizeReschedule(
                updatedAppointment,
                'Appointment rescheduled, but status could not be updated to ACCEPTED automatically.'
              );
            }
          });
          return;
        }

        finalizeReschedule(
          updatedAppointment,
          this.allowPriorityOverride
            ? `Urgent appointment rescheduled. ${this.preemptibleConflicts.length} routine conflict(s) should be reviewed.`
            : 'Appointment rescheduled successfully.'
        );
      },
      error: (err) => {
        this.error = 'Error rescheduling appointment';
        this.loading = false;
        console.error('Error rescheduling appointment:', err);
      }
    });
  }

  private runAvailabilityCheck(onAvailable?: () => void): void {
    this.availabilityChecked = false;
    this.availabilityLoading = true;
    this.availabilityError = null;
    this.availabilityConflicts = [];
    this.blockingConflicts = [];
    this.preemptibleConflicts = [];
    this.allowPriorityOverride = false;
    this.suggestedSlots = [];

    const startAt = this.schedulingService.normalizeLocalDateTime(this.newAppointment.startAt);
    const endAt = this.schedulingService.normalizeLocalDateTime(this.newAppointment.endAt);

    const startDate = this.schedulingService.parseLocalDateTime(startAt);
    if (!startDate) {
      this.availabilityLoading = false;
      this.availabilityError = 'Invalid start date/time.';
      return;
    }

    // Scan window for suggestions (two weeks from the selected day).
    const scanFrom = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), 0, 0, 0, 0);
    const scanTo = new Date(scanFrom.getTime());
    scanTo.setDate(scanTo.getDate() + 14);
    scanTo.setHours(23, 59, 59, 0);

    const from = this.schedulingService.toLocalDateTimeString(scanFrom);
    const to = this.schedulingService.toLocalDateTimeString(scanTo);

    const caregiverId = this.caregiverMustBeAvailable ? this.linkedCaregiverId : null;

    // Availability control: prevent unrealistic onsite scheduling without a linked caregiver when required.
    if (this.caregiverMustBeAvailable && !caregiverId && this.newAppointment.mode === AppointmentMode.ONSITE) {
      this.availabilityLoading = false;
      this.availabilityChecked = true;
      this.availabilityConflicts = [
        {
          party: 'CAREGIVER',
          withAppointment: {
            id: -1 as any,
            patientId: this.newAppointment.patientId,
            doctorId: Number(this.doctorId) as any,
            type: this.newAppointment.type,
            priority: this.newAppointment.priority,
            mode: this.newAppointment.mode,
            status: AppointmentStatus.REQUESTED,
            startAt,
            endAt,
            createdAt: startAt,
            updatedAt: startAt
          },
          reason: 'Caregiver is required but no caregiver is linked to this patient.',
          severity: 'BLOCKING'
        }
      ];
      this.blockingConflicts = [...this.availabilityConflicts];
      return;
    }

    const doctor$ = this.medicalService.getDoctorAppointments(this.doctorId, from, to).pipe(
      catchError((err) => {
        console.warn('[DoctorAppointments] Availability check: failed to load doctor appointments', err);
        return of([] as Appointment[]);
      })
    );

    const patient$ = this.medicalService.getPatientAppointments(this.newAppointment.patientId, from, to).pipe(
      catchError((err) => {
        console.warn('[DoctorAppointments] Availability check: failed to load patient appointments', err);
        return of([] as Appointment[]);
      })
    );

    const caregiver$ = caregiverId
      ? this.medicalService.listAppointments({ caregiverId, from, to }).pipe(
          catchError((err) => {
            console.warn('[DoctorAppointments] Availability check: failed to load caregiver appointments', err);
            return of([] as Appointment[]);
          })
        )
      : of([] as Appointment[]);

    forkJoin({ doctor: doctor$, patient: patient$, caregiver: caregiver$ }).subscribe({
      next: ({ doctor, patient, caregiver }) => {
        const sources: AvailabilitySource[] = [
          { party: 'DOCTOR', appointments: doctor },
          { party: 'PATIENT', appointments: patient }
        ];

        if (caregiverId) {
          const caregiverBuffer =
            this.newAppointment.mode === AppointmentMode.ONSITE && this.transportDependency
              ? this.transportBufferMinutes
              : 0;
          sources.push({ party: 'CAREGIVER', appointments: caregiver, bufferMinutes: caregiverBuffer });
        }

        const analysis = this.schedulingService.analyzeConflicts(
          {
            startAt,
            endAt,
            type: this.newAppointment.type,
            priority: this.newAppointment.priority
          },
          sources
        );

        this.availabilityConflicts = analysis.conflicts;
        this.blockingConflicts = analysis.blockingConflicts;
        this.preemptibleConflicts = analysis.preemptibleConflicts;
        this.allowPriorityOverride = analysis.hasPriorityOverride;
        this.availabilityChecked = true;

        if (analysis.blockingConflicts.length > 0) {
          this.suggestedSlots = this.schedulingService.suggestSlots({
            startSearchAt: startAt,
            durationMinutes: this.appointmentDuration,
            sources,
            type: this.newAppointment.type,
            priority: this.newAppointment.priority,
            mode: this.newAppointment.mode,
            maxSuggestions: 8,
            daysToScan: 14,
            stepMinutes: 15,
            workingHours: { startHour: 9, endHour: 17 },
            skipWeekends: true
          });
        }

        this.availabilityLoading = false;

        if (analysis.canProceed && onAvailable) {
          onAvailable();
        }
      },
      error: (err) => {
        console.error('[DoctorAppointments] Availability check failed:', err);
        this.availabilityLoading = false;
        this.availabilityChecked = true;
        this.availabilityError = 'Failed to check availability. Please try again.';
      }
    });
  }

  /**
   * Change appointment status
   * Le backend génère automatiquement le meetingUrl quand un RDV ONLINE est CONFIRMÉ
   */
  updateStatus(appointmentId: number, status: AppointmentStatus, successMessage?: string): void {
    this.loading = true;
    this.error = null;
    this.activeActionId = appointmentId;
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
            this.fetchMeetingUrl(appointmentId);
          }
        }
        this.successMessage = successMessage || `Appointment marked as ${status.toLowerCase()}.`;
        this.loading = false;
        this.activeActionId = null;
      },
      error: (err) => {
        this.loading = false;
        this.activeActionId = null;
        console.error('Error updating status:', err);
        this.error = 'Failed to update appointment status. Please try again.';
      }
    });
  }

  acceptAppointment(appointmentId: number): void {
    this.updateStatus(appointmentId, AppointmentStatus.ACCEPTED, 'Appointment request accepted.');
  }

  /**
   * Cancel an appointment
   */
  cancelAppointment(appointmentId: number): void {
    if (confirm('Are you sure you want to cancel this appointment?')) {
      this.updateStatus(appointmentId, AppointmentStatus.CANCELLED, 'Appointment cancelled.');
    }
  }

  /**
   * Confirm an appointment
   */
  confirmAppointment(appointmentId: number): void {
    this.updateStatus(appointmentId, AppointmentStatus.CONFIRMED, 'Appointment confirmed.');
  }

  /**
   * Mark an appointment as completed
   */
  completeAppointment(appointmentId: number): void {
    this.updateStatus(appointmentId, AppointmentStatus.COMPLETED, 'Appointment completed.');
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
    if (!this.newAppointment.endAt) {
      alert('Please set an appointment end date and time');
      return false;
    }
    return true;
  }

  onTypeChange(): void {
    if (this.newAppointment.type === AppointmentType.EMERGENCY) {
      this.newAppointment.priority = AppointmentPriority.CRITICAL;
    }

    this.resetAvailability();
  }

  get modalTitle(): string {
    return this.modalMode === 'reschedule' ? 'Reschedule Appointment' : 'New Appointment';
  }

  get modalSubmitLabel(): string {
    if (this.loading) {
      return this.modalMode === 'reschedule' ? 'Saving...' : 'Creating...';
    }

    if (this.availabilityLoading) {
      return 'Checking...';
    }

    return this.modalMode === 'reschedule' ? 'Save Reschedule' : 'Create Appointment';
  }

  isUrgentSelection(): boolean {
    return this.schedulingService.isUrgentAppointment(this.newAppointment);
  }

  canAccept(appointment: Appointment): boolean {
    return appointment.status === AppointmentStatus.REQUESTED;
  }

  canConfirm(appointment: Appointment): boolean {
    return appointment.status === AppointmentStatus.ACCEPTED;
  }

  canComplete(appointment: Appointment): boolean {
    return appointment.status === AppointmentStatus.CONFIRMED;
  }

  canCancel(appointment: Appointment): boolean {
    return appointment.status !== AppointmentStatus.CANCELLED &&
      appointment.status !== AppointmentStatus.COMPLETED &&
      appointment.status !== AppointmentStatus.REJECTED;
  }

  canReschedule(appointment: Appointment): boolean {
    return appointment.status !== AppointmentStatus.CANCELLED &&
      appointment.status !== AppointmentStatus.COMPLETED &&
      appointment.status !== AppointmentStatus.REJECTED;
  }

  isActionLoading(appointmentId: number): boolean {
    return this.activeActionId === appointmentId;
  }

  /**
   * Reset form
   */
  resetForm(): void {
    this.editingAppointmentId = null;
    this.editingAppointmentStatus = null;
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
    this.linkedCaregiverId = null;
    this.showPatientDropdown = false;

    this.caregiverMustBeAvailable = true;
    this.transportDependency = false;
    this.resetAvailability();
  }

  private resetAvailability(): void {
    this.availabilityChecked = false;
    this.availabilityLoading = false;
    this.availabilityError = null;
    this.availabilityConflicts = [];
    this.blockingConflicts = [];
    this.preemptibleConflicts = [];
    this.allowPriorityOverride = false;
    this.suggestedSlots = [];
  }

  private extractCaregiverId(patient: ManagedUser): string | null {
    const anyPatient: any = patient as any;
    const direct = anyPatient.caregiverId || anyPatient.caregiverUserId;
    const inProfile = anyPatient.profile?.caregiverId || anyPatient.profile?.caregiverUserId;
    return (direct || inProfile || null) as string | null;
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

  getPriorityLabel(priority: AppointmentPriority): string {
    return priority === AppointmentPriority.CRITICAL ? 'URGENT' : priority;
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

    // 1) Preferred: regenerate endpoint (works even if appointment is already CONFIRMED).
    this.medicalService.regenerateTeleconsultationLink(appointmentId, this.currentUser.id).subscribe({
      next: ({ meetingUrl }) => {
        console.log('[DoctorAppointments] Regenerate teleconsultation response:', meetingUrl);
        this.applyMeetingUrl(appointmentId, meetingUrl);
        this.loading = false;
      },
      error: (regenErr) => {
        console.warn('[DoctorAppointments] Regenerate teleconsultation failed, retrying confirm + reload...', regenErr);

        // 2) Fallback: (re)confirm to trigger generation, then reload the appointment details.
        this.medicalService.changeAppointmentStatus(appointmentId, AppointmentStatus.CONFIRMED).subscribe({
          next: (updated) => {
            console.log('[DoctorAppointments] Reconfirm response:', updated);
            this.applyMeetingUrl(appointmentId, updated.meetingUrl);

            if (updated.meetingUrl) {
              this.loading = false;
              return;
            }

            this.medicalService.getAppointment(appointmentId).subscribe({
              next: (appointment) => {
                console.log('[DoctorAppointments] Appointment after reconfirm:', appointment);
                this.applyMeetingUrl(appointmentId, appointment.meetingUrl);
                this.loading = false;
              },
              error: (reloadErr) => {
                console.error('[DoctorAppointments] Error reloading appointment after reconfirm:', reloadErr);
                this.error = 'Failed to get meeting link from backend. Please try again.';
                this.loading = false;
              }
            });
          },
          error: (confirmErr) => {
            console.error('[DoctorAppointments] Error reconfirming appointment:', confirmErr);
            this.error = 'Failed to generate meeting link from backend. Please try again.';
            this.loading = false;
          }
        });
      }
    });
  }

  private applyMeetingUrl(appointmentId: number, meetingUrl: string | null | undefined): void {
    const index = this.appointments.findIndex(a => a.id === appointmentId);

    if (index === -1) {
      return;
    }

    this.appointments[index] = {
      ...this.appointments[index],
      meetingUrl: meetingUrl || undefined
    };
    this.appointments = [...this.appointments];

    if (meetingUrl) {
      console.log('[DoctorAppointments] Updated with meetingUrl:', meetingUrl);
    } else {
      console.warn('[DoctorAppointments] No meetingUrl yet - appointment needs to be confirmed');
    }
  }

  /**
   * Check if teleconsultation is pending (ONLINE but not confirmed yet)
   */
  isTeleconsultationPending(appointment: Appointment): boolean {
    return appointment.mode === AppointmentMode.ONLINE && 
           (appointment.status === AppointmentStatus.REQUESTED ||
            appointment.status === AppointmentStatus.ACCEPTED);
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
