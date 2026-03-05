import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { DataService } from '../../../core/services/data.service';
import { CareTeamService } from '../../../core/services/care-team.service';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { StatCardComponent } from '../../../shared/components/stat-card.component';
import { AlertCardComponent } from '../../../shared/components/alert-card.component';
import { NotificationBellComponent } from '../../../shared/components/notification-bell/notification-bell.component';
import { RoleTheme } from '../../../shared/components/navbar.component';
import { DoctorAssignment, DoctorAssignmentStatus } from '../../../core/models/care-team.model';

@Component({
  selector: 'app-doctor-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, StatCardComponent, AlertCardComponent, NotificationBellComponent],
  templateUrl: './doctor-dashboard.component.html',
  styleUrls: ['./doctor-dashboard.component.scss']
})
export class DoctorDashboardComponent implements OnInit {
  doctorName = '';
  doctorId: string | null = null;
  
  // Role theme for notification bell (blue for doctor)
  currentTheme: RoleTheme = {
    name: 'Doctor',
    primary: '#3b82f6',
    primaryLight: '#eff6ff',
    primaryDark: '#1d4ed8',
    gradientFrom: '#3b82f6',
    gradientTo: '#2563eb',
    borderColor: '#dbeafe',
    hoverBg: '#dbeafe',
    activeBg: '#3b82f6',
    activeText: '#ffffff'
  };
  
  // Doctor's assigned patients
  doctorAssignments: DoctorAssignment[] = [];
  loadingPatients = false;
  
  // Legacy data for compatibility
  patients: any[] = [];
  appointments: any[] = [];

  constructor(
    private authService: AuthService, 
    private dataService: DataService,
    private careTeamService: CareTeamService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    const currentUser = this.authService.getCurrentUser();
    
    if (currentUser) {
      this.doctorName = currentUser.name;
      this.doctorId = currentUser.id || null;
      
      // Get all patients and appointments (legacy)
      this.patients = this.dataService.getPatients();
      this.appointments = this.dataService.getAppointments();
      
      // Load doctor's assigned patients from care team service
      this.loadDoctorPatients();
    }
  }

  loadDoctorPatients(): void {
    if (!this.doctorId) {
      this.toastService.error('Doctor ID not found', 'Error');
      return;
    }

    this.loadingPatients = true;
    this.careTeamService.getDoctorPatients(this.doctorId).subscribe({
      next: (assignments) => {
        // Filter only active assignments
        this.doctorAssignments = assignments.filter(
          a => a.status === DoctorAssignmentStatus.ACTIVE
        );
        this.loadingPatients = false;
      },
      error: (error) => {
        console.error('Error loading doctor patients:', error);
        this.toastService.error('Failed to load your patients', 'Error');
        this.loadingPatients = false;
      }
    });
  }

  get patientCount(): number {
    return this.doctorAssignments.length;
  }

  getPatientFullName(assignment: DoctorAssignment): string {
    if (assignment.patientFirstName && assignment.patientLastName) {
      return `${assignment.patientFirstName} ${assignment.patientLastName}`;
    }
    if (assignment.patientFirstName) {
      return assignment.patientFirstName;
    }
    return `Patient #${assignment.patientId}`;
  }

  getStatusClass(status: DoctorAssignmentStatus): string {
    switch (status) {
      case DoctorAssignmentStatus.ACTIVE:
        return 'bg-green-100 text-green-800';
      case DoctorAssignmentStatus.INACTIVE:
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  getAge(dateOfBirth: Date): number {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  }

  getPatientName(patientId: string): string {
    const patient = this.patients.find(p => p.id === patientId);
    return patient ? patient.name : 'Unknown';
  }
}
