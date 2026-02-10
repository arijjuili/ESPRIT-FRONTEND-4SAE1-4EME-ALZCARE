import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { DataService } from '../../core/services/data.service';
import { StatCardComponent } from '../../shared/components/stat-card.component';
import { AlertCardComponent } from '../../shared/components/alert-card.component';

@Component({
  selector: 'app-doctor-dashboard',
  standalone: true,
  imports: [CommonModule, StatCardComponent, AlertCardComponent],
  templateUrl: './doctor-dashboard.component.html',
  styleUrls: ['./doctor-dashboard.component.scss']
})
export class DoctorDashboardComponent implements OnInit {
  doctorName = '';
  patients: any[] = [];
  appointments: any[] = [];

  constructor(private authService: AuthService, private dataService: DataService) {}

  ngOnInit(): void {
    const currentUser = this.authService.getCurrentUser();
    
    if (currentUser) {
      this.doctorName = currentUser.name;
      
      // Get all patients and appointments
      this.patients = this.dataService.getPatients();
      this.appointments = this.dataService.getAppointments();
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
