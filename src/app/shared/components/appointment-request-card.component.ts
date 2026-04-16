import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Observable, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import {
  AppointmentSchedulingService,
  AvailabilitySource,
  SchedulingConflict,
  SuggestedSlot
} from '../../core/services/appointment-scheduling.service';
import { CareTeamService } from '../../core/services/care-team.service';
import { MedicalFollowupService } from '../../core/services/medical-followup.service';
import { ApiService } from '../../core/services/api.service';
import {
  Appointment,
  AppointmentCreateRequest,
  AppointmentMode,
  AppointmentPriority,
  AppointmentStatus,
  AppointmentType
} from '../../core/models/medical-followup.model';

@Component({
  selector: 'app-appointment-request-card',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './appointment-request-card.component.html'
})
export class AppointmentRequestCardComponent implements OnChanges {
  @Input({ required: true }) patientId = '';
  @Input() patientName = 'Patient';
  @Input() caregiverId: string | null = null;
  @Input() existingAppointments: Appointment[] = [];
  @Input() requesterRole: 'PATIENT' | 'CAREGIVER' = 'PATIENT';
  @Input() title = 'Request an appointment';
  @Input() description = 'Use the same appointment fields as the doctor form to send a request.';
  @Input() buttonLabel = 'Request Appointment';
  @Input() buttonTone: 'patient' | 'caregiver' = 'patient';
  @Input() doctorEmail = '';
  @Input() fallbackDoctorId = '';
  @Output() requestCreated = new EventEmitter<Appointment>();

  appointmentTypes = Object.values(AppointmentType);
  appointmentPriorities = Object.values(AppointmentPriority);
  appointmentModes = Object.values(AppointmentMode);

  showModal = false;
  loading = false;
  error: string | null = null;
  successMessage: string | null = null;
  appointmentDuration = 30;

  careTeamDoctorId = '';
  careTeamDoctorLoading = false;
  careTeamDoctorError: string | null = null;

  // Doctor availability (patient/caregiver request)
  availabilityChecked = false;
  availabilityLoading = false;
  availabilityError: string | null = null;
  availabilityConflicts: SchedulingConflict[] = [];
  blockingConflicts: SchedulingConflict[] = [];
  suggestedSlots: SuggestedSlot[] = [];

  appointmentRequest: AppointmentCreateRequest = this.createEmptyRequest();

  constructor(
    private medicalService: MedicalFollowupService,
    private schedulingService: AppointmentSchedulingService,
    private apiService: ApiService,
    private careTeamService: CareTeamService
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['patientId'] && !changes['patientId'].firstChange) {
      this.careTeamDoctorId = '';
      this.careTeamDoctorError = null;
      this.careTeamDoctorLoading = false;
      this.loadDoctorFromCareTeamIfNeeded();
    }
  }

  openModal(): void {
    this.showModal = true;
    this.error = null;
    this.loadDoctorFromCareTeamIfNeeded();
    this.initializeRequest();
  }

  closeModal(): void {
    this.showModal = false;
    this.error = null;
    this.loading = false;
    this.resetAvailability();
    this.initializeRequest();
  }

  onTypeChange(): void {
    if (this.appointmentRequest.type === AppointmentType.EMERGENCY) {
      this.appointmentRequest.priority = AppointmentPriority.CRITICAL;
    }
  }

  onStartChange(): void {
    this.calculateEndDate();
    this.resetAvailability();
  }

  onDurationChange(): void {
    this.calculateEndDate();
    this.resetAvailability();
  }

  submitRequest(): void {
    this.error = null;
    this.loadDoctorFromCareTeamIfNeeded();

    if (!this.patientId) {
      this.error = 'Patient information is missing.';
      return;
    }

    if (!this.hasDoctorTarget && this.careTeamDoctorLoading) {
      this.error = 'Resolving linked doctor assignment... Please wait a moment and try again.';
      return;
    }

    if (!this.appointmentRequest.startAt) {
      this.error = 'Please choose a start date and time.';
      return;
    }

    this.calculateEndDate();

    if (!this.appointmentRequest.endAt) {
      this.error = 'Unable to calculate the appointment end time.';
      return;
    }

    if (!this.validateAppointmentDateTimes()) {
      return;
    }

    if (!this.hasDoctorTarget) {
      this.error = 'No linked doctor found for this patient yet. Ask an admin/doctor to assign one first.';
      return;
    }

    // Check doctor availability and suggest a slot if needed (similar to doctor scheduler).
    this.runDoctorAvailabilityCheck(() => this.performSubmitRequest());
  }

  checkDoctorAvailability(): void {
    this.error = null;
    this.loadDoctorFromCareTeamIfNeeded();
    if (!this.patientId) {
      this.error = 'Patient information is missing.';
      return;
    }
    if (!this.hasDoctorTarget && this.careTeamDoctorLoading) {
      this.error = 'Resolving linked doctor assignment... Please wait a moment and try again.';
      return;
    }
    if (!this.appointmentRequest.startAt) {
      this.error = 'Please choose a start date and time.';
      return;
    }
    this.calculateEndDate();
    if (!this.appointmentRequest.endAt) {
      this.error = 'Unable to calculate the appointment end time.';
      return;
    }
    if (!this.validateAppointmentDateTimes()) {
      return;
    }
    this.runDoctorAvailabilityCheck();
  }

  applySuggestedSlot(slot: SuggestedSlot): void {
    const start = this.schedulingService.parseLocalDateTime(slot.startAt);
    if (!start) {
      this.availabilityError = 'Invalid suggested slot. Please try another one.';
      return;
    }

    this.appointmentRequest.startAt = this.formatDateTimeLocal(start);
    this.calculateEndDate();
    this.resetAvailability();
  }

  private performSubmitRequest(): void {
    const targetDoctorId = this.resolveDoctorId();
    if (!targetDoctorId) {
      this.error = 'No doctor target is available for this request.';
      return;
    }

    this.loading = true;
    this.error = null;
    this.successMessage = null;

    this.resolveDoctorUserId(targetDoctorId).pipe(
      switchMap(resolvedDoctorId => {
        const payload: AppointmentCreateRequest = {
          ...this.appointmentRequest,
          patientId: this.patientId,
          doctorId: resolvedDoctorId,
          caregiverId: this.requesterRole === 'CAREGIVER' ? this.caregiverId || undefined : undefined,
          startAt: this.schedulingService.normalizeLocalDateTime(this.appointmentRequest.startAt),
          endAt: this.schedulingService.normalizeLocalDateTime(this.appointmentRequest.endAt),
          status: AppointmentStatus.REQUESTED
        };

        return this.medicalService.createAppointment(payload);
      })
    ).subscribe({
      next: (appointment) => {
        this.loading = false;
        this.showModal = false;
        this.successMessage = this.requesterRole === 'CAREGIVER'
          ? `Appointment request sent for ${this.patientName}.`
          : 'Appointment request sent successfully.';
        this.requestCreated.emit(appointment);
        this.initializeRequest();
      },
      error: (err) => {
        console.error('Error creating appointment request:', err);
        this.loading = false;
        this.error = 'Unable to send the appointment request. Please try again.';
      }
    });
  }

  get isUrgentSelection(): boolean {
    return this.schedulingService.isUrgentAppointment(this.appointmentRequest);
  }

  get hasBlockingConflicts(): boolean {
    return this.blockingConflicts.length > 0;
  }

  get requesterLabel(): string {
    return this.requesterRole === 'CAREGIVER' ? 'Caregiver request' : 'Patient request';
  }

  get hasDoctorTarget(): boolean {
    return !!this.resolveDoctorId();
  }

  get buttonClasses(): string {
    if (this.buttonTone === 'caregiver') {
      return 'w-full inline-flex items-center justify-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-100';
    }

    return 'w-full inline-flex items-center justify-center gap-3 rounded-lg border border-primary-200 bg-primary-50 px-4 py-3 text-sm font-semibold text-primary-700 transition hover:border-primary-300 hover:bg-primary-100';
  }

  get targetDoctorDescription(): string {
    if (this.careTeamDoctorLoading) {
      return 'Resolving linked doctor assignment via care-team...';
    }

    if (this.careTeamDoctorError && !this.careTeamDoctorId && !this.hasAppointmentHistoryDoctor() && !this.fallbackDoctorId) {
      return this.careTeamDoctorError;
    }

    if (this.careTeamDoctorId) {
      return 'This request will be routed to the doctor assigned to this patient via care-team.';
    }

    if (this.hasAppointmentHistoryDoctor()) {
      return 'This request will follow the doctor used in the patient appointment history.';
    }

    if (this.fallbackDoctorId) {
      return `Temporary routing is enabled to ${this.doctorEmail || this.fallbackDoctorId}.`;
    }

    return 'No linked doctor was detected for this patient. Link a doctor first, then send the request.';
  }

  get targetDoctorLabel(): string {
    if (this.careTeamDoctorLoading) {
      return 'Resolving doctor...';
    }

    if (this.careTeamDoctorId) {
      return this.doctorEmail || 'Care-team doctor assigned';
    }

    if (this.hasAppointmentHistoryDoctor()) {
      return this.doctorEmail || 'Doctor from appointment history';
    }

    if (this.fallbackDoctorId) {
      return this.doctorEmail || this.fallbackDoctorId;
    }

    return 'Doctor link required';
  }

  formatDateTimeLocal(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  get minStartAt(): string {
    return this.formatDateTimeLocal(this.getNowRoundedToMinute());
  }

  private resetAvailability(): void {
    this.availabilityChecked = false;
    this.availabilityLoading = false;
    this.availabilityError = null;
    this.availabilityConflicts = [];
    this.blockingConflicts = [];
    this.suggestedSlots = [];
  }

  private runDoctorAvailabilityCheck(onAvailable?: () => void): void {
    this.availabilityChecked = false;
    this.availabilityLoading = true;
    this.availabilityError = null;
    this.availabilityConflicts = [];
    this.blockingConflicts = [];
    this.suggestedSlots = [];

    this.loadDoctorFromCareTeamIfNeeded();
    const targetDoctorId = this.resolveDoctorId();
    if (!targetDoctorId) {
      this.availabilityChecked = true;
      this.availabilityLoading = false;
      this.availabilityError = 'No doctor target is available for availability checking.';
      this.error = 'No linked doctor found for this patient yet. Ask an admin/doctor to assign one first.';
      return;
    }

    const startAt = this.schedulingService.normalizeLocalDateTime(this.appointmentRequest.startAt);
    const endAt = this.schedulingService.normalizeLocalDateTime(this.appointmentRequest.endAt);
    const startDate = this.schedulingService.parseLocalDateTime(startAt);

    if (!startDate) {
      this.availabilityChecked = true;
      this.availabilityLoading = false;
      this.availabilityError = 'Invalid start date/time.';
      return;
    }

    const daysToScan = 14;
    const from = this.schedulingService.toLocalDateTimeString(new Date(startDate.getTime() - 24 * 60 * 60_000));
    const to = this.schedulingService.toLocalDateTimeString(new Date(startDate.getTime() + daysToScan * 24 * 60 * 60_000));

    this.resolveDoctorUserId(targetDoctorId).pipe(
      switchMap(doctorId => this.loadDoctorAppointmentsForAvailability(doctorId, from, to))
    ).subscribe({
      next: (doctorAppointments) => {
        const sources: AvailabilitySource[] = [{
          party: 'DOCTOR',
          appointments: doctorAppointments
        }];

        const analysis = this.schedulingService.analyzeConflicts(
          {
            startAt,
            endAt,
            type: this.appointmentRequest.type,
            priority: this.appointmentRequest.priority
          },
          sources
        );

        this.availabilityConflicts = analysis.conflicts;
        this.blockingConflicts = analysis.blockingConflicts;

        if (analysis.blockingConflicts.length > 0) {
          this.suggestedSlots = this.schedulingService.suggestSlots({
            startSearchAt: startAt,
            durationMinutes: Math.max(5, this.appointmentDuration),
            sources,
            type: this.appointmentRequest.type,
            priority: this.appointmentRequest.priority,
            mode: this.appointmentRequest.mode === AppointmentMode.ONLINE ? 'ONLINE' : 'ONSITE',
            daysToScan,
            maxSuggestions: 8
          });

          if (this.isUrgentSelection) {
            this.availabilityChecked = true;
            this.availabilityLoading = false;
            onAvailable?.();
            return;
          }

          this.availabilityChecked = true;
          this.availabilityLoading = false;
          return;
        }

        this.availabilityChecked = true;
        this.availabilityLoading = false;
        onAvailable?.();
      },
      error: (err) => {
        console.error('[AppointmentRequestCard] Error checking doctor availability:', err);
        this.availabilityChecked = true;
        this.availabilityLoading = false;
        this.availabilityError = 'Unable to check doctor availability right now. Please try again.';
      }
    });
  }

  private loadDoctorAppointmentsForAvailability(doctorId: string, from: string, to: string) {
    return this.medicalService.getDoctorAppointments(doctorId, from, to).pipe(
      catchError((err) => {
        console.warn(`[AppointmentRequestCard] Failed to load appointments for doctorId=${doctorId}`, err);
        return of([] as Appointment[]);
      })
    );
  }

  private resolveDoctorUserId(doctorId: string): Observable<string> {
    const normalizedDoctorId = (doctorId || '').trim();

    if (!normalizedDoctorId) {
      return of('');
    }

    return this.apiService.getDoctorByUserId(normalizedDoctorId).pipe(
      map(profile => String(profile?.userId || normalizedDoctorId)),
      catchError(() =>
        this.apiService.getDoctorById(normalizedDoctorId).pipe(
          map(profile => String(profile?.userId || normalizedDoctorId)),
          catchError(() => of(normalizedDoctorId))
        )
      )
    );
  }

  private initializeRequest(): void {
    this.appointmentDuration = 30;
    this.appointmentRequest = this.createEmptyRequest();
    this.resetAvailability();
  }

  private createEmptyRequest(): AppointmentCreateRequest {
    return {
      patientId: this.patientId,
      doctorId: this.resolveDoctorId(),
      caregiverId: this.requesterRole === 'CAREGIVER' ? this.caregiverId || undefined : undefined,
      type: AppointmentType.ROUTINE,
      priority: AppointmentPriority.NORMAL,
      mode: AppointmentMode.ONSITE,
      startAt: '',
      endAt: ''
    };
  }

  private calculateEndDate(): void {
    if (!this.appointmentRequest.startAt) {
      this.appointmentRequest.endAt = '';
      return;
    }

    const startDate = this.schedulingService.parseLocalDateTime(
      this.schedulingService.normalizeLocalDateTime(this.appointmentRequest.startAt)
    );
    if (!startDate) {
      this.appointmentRequest.endAt = '';
      return;
    }
    const endDate = new Date(startDate.getTime() + this.appointmentDuration * 60_000);
    this.appointmentRequest.endAt = this.formatDateTimeLocal(endDate);
  }

  private validateAppointmentDateTimes(): boolean {
    const startAt = this.schedulingService.normalizeLocalDateTime(this.appointmentRequest.startAt);
    const endAt = this.schedulingService.normalizeLocalDateTime(this.appointmentRequest.endAt);

    const startDate = this.schedulingService.parseLocalDateTime(startAt);
    const endDate = this.schedulingService.parseLocalDateTime(endAt);

    if (!startDate) {
      this.error = 'Invalid start date/time.';
      return false;
    }

    const now = this.getNowRoundedToMinute();
    if (startDate.getTime() < now.getTime()) {
      this.error = 'Start date/time must be now or later.';
      return false;
    }

    if (!endDate) {
      this.error = 'Invalid end date/time.';
      return false;
    }

    if (endDate.getTime() <= startDate.getTime()) {
      this.error = 'End date/time must be after the start date/time.';
      return false;
    }

    return true;
  }

  private getNowRoundedToMinute(): Date {
    const now = new Date();
    now.setSeconds(0, 0);
    return now;
  }

  private resolveDoctorId(): string {
    if (this.careTeamDoctorId) {
      return this.careTeamDoctorId;
    }

    const linkedAppointment = this.existingAppointments.find(appointment => appointment.doctorId !== undefined && appointment.doctorId !== null);
    if (linkedAppointment) {
      return String(linkedAppointment.doctorId);
    }

    return this.fallbackDoctorId || '';
  }

  private hasAppointmentHistoryDoctor(): boolean {
    return this.existingAppointments.some(
      appointment => appointment.doctorId !== undefined && appointment.doctorId !== null && String(appointment.doctorId).trim() !== ''
    );
  }

  private loadDoctorFromCareTeamIfNeeded(): void {
    if (!this.patientId) return;
    if (this.careTeamDoctorId) return;
    if (this.careTeamDoctorLoading) return;

    this.careTeamDoctorLoading = true;
    this.careTeamDoctorError = null;

    this.careTeamService.getPatientDoctor(this.patientId).subscribe({
      next: (assignment) => {
        this.careTeamDoctorId = assignment?.doctorId ? String(assignment.doctorId) : '';
        this.careTeamDoctorLoading = false;
      },
      error: (err) => {
        console.error('[AppointmentRequestCard] Failed to resolve patient doctor via care-team:', err);
        this.careTeamDoctorLoading = false;
        this.careTeamDoctorError = 'Unable to resolve linked doctor right now.';
      }
    });
  }
}
