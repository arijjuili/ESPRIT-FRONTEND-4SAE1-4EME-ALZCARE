import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MedicalFollowupService } from '../../../core/services/medical-followup.service';
import { UserManagementService } from '../../../core/services/user-management.service';
import { AuthService } from '../../../core/services/auth.service';
import {
  MedicationPlan,
  PlanStatus,
  Appointment,
  AppointmentStatus,
  AppointmentType,
  AppointmentPriority
} from '../../../core/models/medical-followup.model';
import { ManagedUser } from '../../../core/models/user-management.model';
import { AuthUser } from '../../../core/models/user.model';

/**
 * Doctor Records Component
 * 
 * READ-ONLY view of patient's medical history.
 * Displays:
 * - Past treatment history (STOPPED/COMPLETED medication plans)
 * - Appointment history
 * 
 * This is a historical record view - no editing capabilities.
 */
@Component({
  selector: 'app-doctor-records',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './doctor-records.component.html',
  styleUrls: ['./doctor-records.component.scss']
})
export class DoctorRecordsComponent implements OnInit {
  // Current user
  currentUser: AuthUser | null = null;
  doctorId = '';

  // Data
  allMedicationPlans: MedicationPlan[] = [];
  allAppointments: Appointment[] = [];
  patients: Map<string, ManagedUser> = new Map();

  // Filtered data (read-only view)
  treatmentHistory: MedicationPlan[] = [];
  appointmentHistory: Appointment[] = [];

  // Loading states
  loadingPlans = false;
  loadingAppointments = false;
  error: string | null = null;

  // Selected plan for detail view
  selectedPlan: MedicationPlan | null = null;
  showPlanDetailsModal = false;

  constructor(
    private medicalService: MedicalFollowupService,
    private userService: UserManagementService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadCurrentUser();
    this.loadData();
  }

  /**
   * Load current logged-in user
   */
  loadCurrentUser(): void {
    this.currentUser = this.authService.getCurrentUser();
    if (this.currentUser && this.currentUser.role === 'doctor') {
      this.doctorId = this.currentUser.id;
    } else {
      this.doctorId = '1'; // Fallback for development
    }
  }

  /**
   * Load all necessary data
   */
  loadData(): void {
    this.loadPatients();
  }

  /**
   * Load patients then medication plans and appointments
   */
  loadPatients(): void {
    this.userService.getActivePatients().subscribe({
      next: (patients) => {
        // Store patients in map for quick lookup
        patients.forEach(patient => {
          this.patients.set(patient.id, patient);
        });
        // Load medication plans and appointments after patients are loaded
        this.loadMedicationPlans();
        this.loadAllAppointments();
      },
      error: (err) => {
        console.error('Error loading patients:', err);
        this.error = 'Failed to load patient data';
      }
    });
  }

  /**
   * Load all medication plans for doctor's patients
   */
  loadMedicationPlans(): void {
    this.loadingPlans = true;
    this.medicalService.getAllMedicationPlans().subscribe({
      next: (plans) => {
        this.allMedicationPlans = plans;
        this.filterTreatmentHistory();
        this.loadingPlans = false;
      },
      error: (err) => {
        console.error('Error loading medication plans:', err);
        this.error = 'Failed to load treatment history';
        this.loadingPlans = false;
      }
    });
  }

  /**
   * Load all appointments for doctor
   */
  loadAllAppointments(): void {
    this.loadingAppointments = true;
    // Load appointments from a wide date range to get historical data
    const from = new Date();
    from.setFullYear(from.getFullYear() - 2); // Past 2 years
    const to = new Date();
    
    this.medicalService.getDoctorAppointments(
      this.doctorId,
      from.toISOString(),
      to.toISOString()
    ).subscribe({
      next: (appointments) => {
        this.allAppointments = appointments;
        this.filterAppointmentHistory();
        this.loadingAppointments = false;
      },
      error: (err) => {
        console.error('Error loading appointments:', err);
        this.error = 'Failed to load appointment history';
        this.loadingAppointments = false;
      }
    });
  }

  /**
   * Filter treatment history to show only STOPPED or COMPLETED plans
   */
  filterTreatmentHistory(): void {
    this.treatmentHistory = this.allMedicationPlans.filter(plan => 
      plan.status === PlanStatus.STOPPED || plan.status === PlanStatus.COMPLETED
    ).sort((a, b) => {
      // Sort by end date (most recent first), then by start date
      const dateA = a.endDate ? new Date(a.endDate).getTime() : new Date(a.startDate).getTime();
      const dateB = b.endDate ? new Date(b.endDate).getTime() : new Date(b.startDate).getTime();
      return dateB - dateA;
    });
  }

  /**
   * Filter appointment history to show only past appointments
   */
  filterAppointmentHistory(): void {
    const now = new Date().getTime();
    this.appointmentHistory = this.allAppointments
      .filter(appt => new Date(appt.endAt).getTime() < now)
      .sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime());
  }

  /**
   * Get patient name by ID
   */
  getPatientName(patientId: string): string {
    const patient = this.patients.get(patientId);
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
   * Get patient initials for avatar
   */
  getPatientInitials(patientId: string): string {
    const name = this.getPatientName(patientId);
    if (name === 'Unknown Patient') return '?';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  }

  /**
   * Get avatar color based on patient ID
   */
  getAvatarColor(patientId: string): string {
    const colors = [
      'bg-blue-500',
      'bg-green-500',
      'bg-purple-500',
      'bg-orange-500',
      'bg-teal-500',
      'bg-indigo-500',
      'bg-pink-500',
      'bg-cyan-500'
    ];
    let hash = 0;
    for (let i = 0; i < patientId.length; i++) {
      hash = patientId.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  }

  /**
   * Format date range for display
   */
  formatDateRange(startDate: string, endDate: string | undefined): string {
    const start = this.formatDate(startDate);
    const end = endDate ? this.formatDate(endDate) : 'Present';
    return `${start} – ${end}`;
  }

  /**
   * Format a single date
   */
  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  /**
   * Format datetime for appointments
   */
  formatDateTime(dateString: string): string {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Get medication count label
   */
  getMedicationCountLabel(plan: MedicationPlan): string {
    const count = plan.items?.length || 0;
    return count === 1 ? '1 Medication' : `${count} Medications`;
  }

  /**
   * Calculate adherence rate (mock calculation based on available data)
   * In a real scenario, this would come from the backend
   */
  getAdherenceRate(plan: MedicationPlan): number {
    // This is a placeholder - in real implementation,
    // adherence rate would be calculated from MedicationIntake data
    // For now, return a reasonable estimate based on plan status
    if (plan.status === PlanStatus.COMPLETED) {
      return Math.floor(Math.random() * 15) + 85; // 85-100% for completed
    }
    return Math.floor(Math.random() * 30) + 60; // 60-90% for stopped
  }

  /**
   * Get status badge class for medication plan
   */
  getStatusBadgeClass(status: PlanStatus): string {
    switch (status) {
      case PlanStatus.COMPLETED:
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case PlanStatus.STOPPED:
        return 'bg-gray-100 text-gray-600 border-gray-200';
      case PlanStatus.ACTIVE:
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case PlanStatus.SUSPENDED:
        return 'bg-amber-100 text-amber-700 border-amber-200';
      default:
        return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  }

  /**
   * Get appointment type icon
   */
  getAppointmentTypeIcon(type: AppointmentType): string {
    const icons: Record<string, string> = {
      'ROUTINE': '🩺',
      'FOLLOW_UP': '🔄',
      'COGNITIVE_TEST': '🧠',
      'EMERGENCY': '🚨'
    };
    return icons[type] || '📅';
  }

  /**
   * Get priority badge class
   */
  getPriorityBadgeClass(priority: AppointmentPriority): string {
    switch (priority) {
      case AppointmentPriority.CRITICAL:
        return 'bg-red-100 text-red-700 border-red-200';
      case AppointmentPriority.HIGH:
        return 'bg-orange-100 text-orange-700 border-orange-200';
      case AppointmentPriority.NORMAL:
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case AppointmentPriority.LOW:
        return 'bg-gray-100 text-gray-600 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  }

  /**
   * Get appointment status badge class
   */
  getAppointmentStatusClass(status: AppointmentStatus): string {
    switch (status) {
      case AppointmentStatus.COMPLETED:
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case AppointmentStatus.CANCELLED:
        return 'bg-gray-100 text-gray-500 border-gray-200';
      case AppointmentStatus.CONFIRMED:
        return 'bg-blue-100 text-blue-700 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  }

  /**
   * Check if data is still loading
   */
  isLoading(): boolean {
    return this.loadingPlans || this.loadingAppointments;
  }

  /**
   * Open plan details modal (read-only view)
   */
  openPlanDetails(plan: MedicationPlan): void {
    this.selectedPlan = plan;
    this.showPlanDetailsModal = true;
  }

  /**
   * Close plan details modal
   */
  closePlanDetails(): void {
    this.showPlanDetailsModal = false;
    this.selectedPlan = null;
  }
}
