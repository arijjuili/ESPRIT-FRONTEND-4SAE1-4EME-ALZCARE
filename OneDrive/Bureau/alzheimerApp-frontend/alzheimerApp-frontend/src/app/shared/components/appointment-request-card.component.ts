import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AppointmentSchedulingService } from '../../core/services/appointment-scheduling.service';
import { MedicalFollowupService } from '../../core/services/medical-followup.service';
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
export class AppointmentRequestCardComponent {
  @Input({ required: true }) patientId = '';
  @Input() patientName = 'Patient';
  @Input() caregiverId: string | null = null;
  @Input() existingAppointments: Appointment[] = [];
  @Input() requesterRole: 'PATIENT' | 'CAREGIVER' = 'PATIENT';
  @Input() title = 'Request an appointment';
  @Input() description = 'Use the same appointment fields as the doctor form to send a request.';
  @Input() buttonLabel = 'Request Appointment';
  @Input() buttonTone: 'patient' | 'caregiver' = 'patient';
  @Input() doctorEmail = 'doctor@doctor.com';
  @Input() fallbackDoctorId = '3';
  @Output() requestCreated = new EventEmitter<Appointment>();

  appointmentTypes = Object.values(AppointmentType);
  appointmentPriorities = Object.values(AppointmentPriority);
  appointmentModes = Object.values(AppointmentMode);

  showModal = false;
  loading = false;
  error: string | null = null;
  successMessage: string | null = null;
  appointmentDuration = 30;

  appointmentRequest: AppointmentCreateRequest = this.createEmptyRequest();

  constructor(
    private medicalService: MedicalFollowupService,
    private schedulingService: AppointmentSchedulingService
  ) {}

  openModal(): void {
    this.showModal = true;
    this.error = null;
    this.initializeRequest();
  }

  closeModal(): void {
    this.showModal = false;
    this.error = null;
    this.loading = false;
    this.initializeRequest();
  }

  onTypeChange(): void {
    if (this.appointmentRequest.type === AppointmentType.EMERGENCY) {
      this.appointmentRequest.priority = AppointmentPriority.CRITICAL;
    }
  }

  onStartChange(): void {
    this.calculateEndDate();
  }

  onDurationChange(): void {
    this.calculateEndDate();
  }

  submitRequest(): void {
    if (!this.patientId) {
      this.error = 'Patient information is missing.';
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

    const resolvedDoctorId = this.resolveDoctorId();
    if (!resolvedDoctorId) {
      this.error = 'No doctor target is available for this request.';
      return;
    }

    const payload: AppointmentCreateRequest = {
      ...this.appointmentRequest,
      patientId: this.patientId,
      doctorId: resolvedDoctorId,
      caregiverId: this.requesterRole === 'CAREGIVER' ? this.caregiverId || undefined : undefined,
      startAt: this.schedulingService.normalizeLocalDateTime(this.appointmentRequest.startAt),
      endAt: this.schedulingService.normalizeLocalDateTime(this.appointmentRequest.endAt),
      status: AppointmentStatus.REQUESTED
    };

    this.loading = true;
    this.error = null;
    this.successMessage = null;

    this.medicalService.createAppointment(payload).subscribe({
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

  get requesterLabel(): string {
    return this.requesterRole === 'CAREGIVER' ? 'Caregiver request' : 'Patient request';
  }

  get buttonClasses(): string {
    if (this.buttonTone === 'caregiver') {
      return 'w-full inline-flex items-center justify-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-100';
    }

    return 'w-full inline-flex items-center justify-center gap-3 rounded-lg border border-primary-200 bg-primary-50 px-4 py-3 text-sm font-semibold text-primary-700 transition hover:border-primary-300 hover:bg-primary-100';
  }

  get targetDoctorDescription(): string {
    if (this.hasKnownDoctorRelationship()) {
      return 'This request will follow the same doctor already linked to this patient history.';
    }

    return `Temporary routing is enabled to ${this.doctorEmail}.`;
  }

  formatDateTimeLocal(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  private initializeRequest(): void {
    this.appointmentDuration = 30;
    this.appointmentRequest = this.createEmptyRequest();
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

    const startDate = new Date(this.appointmentRequest.startAt);
    const endDate = new Date(startDate.getTime() + this.appointmentDuration * 60_000);
    this.appointmentRequest.endAt = this.formatDateTimeLocal(endDate);
  }

  private resolveDoctorId(): string {
    const linkedAppointment = this.existingAppointments.find(appointment => appointment.doctorId !== undefined && appointment.doctorId !== null);
    if (linkedAppointment) {
      return String(linkedAppointment.doctorId);
    }

    return this.fallbackDoctorId;
  }

  private hasKnownDoctorRelationship(): boolean {
    return this.existingAppointments.some(appointment => appointment.doctorId !== undefined && appointment.doctorId !== null);
  }
}
