import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { StatCardComponent } from '../../shared/components/stat-card.component';
import { AlertCardComponent } from '../../shared/components/alert-card.component';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, StatCardComponent, AlertCardComponent],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.scss']
})
export class AdminDashboardComponent implements OnInit {
  adminName = '';

  users = [
    { name: 'John Patient', role: 'patient', active: true, lastActive: '5 min ago' },
    { name: 'Sarah Caregiver', role: 'caregiver', active: true, lastActive: '2 hours ago' },
    { name: 'Dr. Michael', role: 'doctor', active: false, lastActive: '1 day ago' },
    { name: 'Margaret Johnson', role: 'patient', active: true, lastActive: '30 min ago' },
    { name: 'Robert Williams', role: 'patient', active: false, lastActive: '3 days ago' }
  ];

  systemLogs = [
    { type: 'success', action: 'Backup Completed', details: 'Daily backup executed successfully', timestamp: '2 hours ago' },
    { type: 'info', action: 'User Login', details: 'Sarah Caregiver logged in', timestamp: '1 hour ago' },
    { type: 'warning', action: 'Storage Alert', details: 'Database storage at 75% capacity', timestamp: '3 hours ago' },
    { type: 'info', action: 'New User Created', details: 'Admin created new patient account', timestamp: '5 hours ago' },
    { type: 'success', action: 'Email Sent', details: 'Appointment reminder emails sent to 12 patients', timestamp: '6 hours ago' }
  ];

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    const currentUser = this.authService.getCurrentUser();
    if (currentUser) {
      this.adminName = currentUser.name;
    }
  }

  getRoleClass(role: string): string {
    const classes: Record<string, string> = {
      patient: 'bg-primary-100 text-primary-700',
      caregiver: 'bg-success bg-opacity-20 text-success',
      doctor: 'bg-info bg-opacity-20 text-info',
      admin: 'bg-warning bg-opacity-20 text-warning'
    };
    return classes[role] || 'bg-gray-100 text-gray-800';
  }

  getLogBorderClass(type: string): string {
    const classes: Record<string, string> = {
      success: 'border-success',
      warning: 'border-warning',
      error: 'border-danger',
      info: 'border-info'
    };
    return classes[type] || 'border-gray-500';
  }
}
