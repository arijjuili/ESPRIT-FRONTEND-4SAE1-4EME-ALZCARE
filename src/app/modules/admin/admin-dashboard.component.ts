import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { StatCardComponent } from '../../shared/components/stat-card.component';
import { AlertCardComponent } from '../../shared/components/alert-card.component';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, StatCardComponent, AlertCardComponent],
  template: `
    <div class="max-w-7xl mx-auto px-4 py-8">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-4xl font-bold text-gray-800">Admin Dashboard</h1>
        <p class="text-gray-600 mt-2">System management and analytics</p>
      </div>

      <!-- System Alerts -->
      <div class="mb-8 space-y-4">
        <app-alert-card 
          type="success"
          title="System Status"
          message="All systems operational. Last backup completed 2 hours ago.">
        </app-alert-card>
      </div>

      <!-- Stats Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <app-stat-card
          label="Total Users"
          value="156"
          icon="👥"
          color="primary">
        </app-stat-card>
        
        <app-stat-card
          label="Active Sessions"
          value="42"
          icon="🔌"
          color="success">
        </app-stat-card>
        
        <app-stat-card
          label="System Uptime"
          value="99.9%"
          icon="📊"
          color="info">
        </app-stat-card>
        
        <app-stat-card
          label="Data Stored"
          value="2.4 GB"
          icon="💾"
          color="warning">
        </app-stat-card>
      </div>

      <!-- Main Content Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <!-- User Management -->
        <div class="lg:col-span-2">
          <div class="bg-white rounded-lg shadow-md p-6 mb-8">
            <div class="flex justify-between items-center mb-6">
              <h2 class="text-2xl font-bold text-gray-800">User Management</h2>
              <button class="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition font-semibold">
                + Add User
              </button>
            </div>
            
            <div class="overflow-x-auto">
              <table class="w-full">
                <thead class="bg-gray-100 border-b">
                  <tr>
                    <th class="text-left px-4 py-3 font-bold text-gray-800">Name</th>
                    <th class="text-left px-4 py-3 font-bold text-gray-800">Role</th>
                    <th class="text-left px-4 py-3 font-bold text-gray-800">Status</th>
                    <th class="text-left px-4 py-3 font-bold text-gray-800">Last Active</th>
                    <th class="text-center px-4 py-3 font-bold text-gray-800">Actions</th>
                  </tr>
                </thead>
                <tbody class="divide-y">
                  <tr *ngFor="let user of users" class="hover:bg-gray-50 transition">
                    <td class="px-4 py-3 font-semibold text-gray-800">{{ user.name }}</td>
                    <td class="px-4 py-3">
                      <span class="inline-block px-3 py-1 rounded-full text-xs font-bold"
                        [ngClass]="getRoleClass(user.role)">
                        {{ user.role | titlecase }}
                      </span>
                    </td>
                    <td class="px-4 py-3">
                      <span class="inline-block px-3 py-1 rounded-full text-xs font-bold"
                        [ngClass]="user.active ? 'bg-success bg-opacity-20 text-success' : 'bg-gray-100 text-gray-800'">
                        {{ user.active ? 'Active' : 'Inactive' }}
                      </span>
                    </td>
                    <td class="px-4 py-3 text-gray-600 text-sm">{{ user.lastActive }}</td>
                    <td class="px-4 py-3 text-center">
                      <button class="text-primary-600 hover:text-primary-800 font-semibold text-sm">Edit</button>
                      <span class="text-gray-400 mx-2">|</span>
                      <button class="text-danger hover:text-opacity-80 font-semibold text-sm">Delete</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- System Logs -->
          <div class="bg-white rounded-lg shadow-md p-6">
            <h2 class="text-2xl font-bold text-gray-800 mb-6">Recent System Activity</h2>
            
            <div class="space-y-3">
              <div *ngFor="let log of systemLogs" class="border-l-4 pl-4 py-2" [ngClass]="getLogBorderClass(log.type)">
                <p class="font-semibold text-gray-800 text-sm">{{ log.action }}</p>
                <p class="text-gray-600 text-xs">{{ log.details }}</p>
                <p class="text-gray-500 text-xs mt-1">{{ log.timestamp }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Sidebar -->
        <div>
          <!-- System Status -->
          <div class="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 class="text-xl font-bold text-gray-800 mb-4">System Status</h2>
            <div class="space-y-4">
              <div class="flex items-center justify-between">
                <span class="text-gray-600">Database</span>
                <span class="inline-block w-3 h-3 bg-green-500 rounded-full"></span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-gray-600">API Server</span>
                <span class="inline-block w-3 h-3 bg-green-500 rounded-full"></span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-gray-600">Email Service</span>
                <span class="inline-block w-3 h-3 bg-green-500 rounded-full"></span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-gray-600">Backup System</span>
                <span class="inline-block w-3 h-3 bg-green-500 rounded-full"></span>
              </div>
            </div>
          </div>

          <!-- User Statistics -->
          <div class="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 class="text-xl font-bold text-gray-800 mb-4">User Breakdown</h2>
            <div class="space-y-3 text-sm">
              <div class="flex justify-between">
                <span class="text-gray-600">👤 Patients</span>
                <span class="font-bold text-gray-800">45</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">🤝 Caregivers</span>
                <span class="font-bold text-gray-800">32</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">👨‍⚕️ Doctors</span>
                <span class="font-bold text-gray-800">8</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">⚙️ Admins</span>
                <span class="font-bold text-gray-800">3</span>
              </div>
            </div>
          </div>

          <!-- Quick Actions -->
          <div class="bg-white rounded-lg shadow-md p-6">
            <h2 class="text-xl font-bold text-gray-800 mb-4">Quick Actions</h2>
            <div class="space-y-3">
              <button class="w-full bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition font-semibold text-sm">
                Generate Report
              </button>
              <button class="w-full bg-success text-white px-4 py-2 rounded-lg hover:bg-opacity-90 transition font-semibold text-sm">
                Run Backup
              </button>
              <button class="w-full bg-info text-white px-4 py-2 rounded-lg hover:bg-opacity-90 transition font-semibold text-sm">
                System Settings
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: []
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
