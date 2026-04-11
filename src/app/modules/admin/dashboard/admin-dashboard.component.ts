import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { StatCardComponent } from '../../../shared/components/stat-card.component';
import { AlertCardComponent } from '../../../shared/components/alert-card.component';

interface ManagementCategory {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  axes: Axis[];
  stats: { label: string; value: string };
}

interface Axis {
  id: number;
  name: string;
  description: string;
  route: string;
  count: number;
  status: 'active' | 'maintenance' | 'warning';
}

interface QuickAction {
  label: string;
  icon: string;
  color: string;
  action: () => void;
}

interface SystemAlert {
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  message: string;
  timestamp: string;
}

interface ActivityItem {
  type: string;
  action: string;
  user: string;
  timestamp: string;
  icon: string;
  color: string;
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, StatCardComponent, AlertCardComponent],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.scss']
})
export class AdminDashboardComponent implements OnInit {
  adminName = 'Administrator';
  currentDate = new Date();

  // System Overview Stats
  systemStats = [
    { label: 'Total Users', value: 156, icon: '👥', color: 'primary', change: '+12 this week' },
    { label: 'Active Patients', value: 45, icon: '🏥', color: 'success', change: '+3 today' },
    { label: 'Pending Tasks', value: 28, icon: '📋', color: 'warning', change: '8 urgent' },
    { label: 'System Alerts', value: 3, icon: '🔔', color: 'danger', change: '2 critical' }
  ];

  // Management Categories with 12 Axes
  managementCategories: ManagementCategory[] = [
    {
      id: 'medical',
      title: 'Medical Management',
      description: 'Healthcare operations, medications, appointments & monitoring',
      icon: '🏥',
      color: 'from-rose-500 to-pink-600',
      stats: { label: 'Active Prescriptions', value: '127' },
      axes: [
        { id: 1, name: 'Medication & Reminders', description: 'Drug inventory, schedules & adherence', route: '/admin/medications', count: 89, status: 'active' },
        { id: 2, name: 'Appointments', description: 'Scheduling & calendar management', route: '/admin/appointments', count: 34, status: 'active' },
        { id: 3, name: 'Behavior Monitoring', description: 'Pattern tracking & incident reports', route: '/admin/behavior', count: 12, status: 'active' },
        { id: 4, name: 'Alert System', description: 'Critical alerts & escalation rules', route: '/admin/alerts', count: 5, status: 'warning' },
        { id: 6, name: 'Doctor Workflows', description: 'Prescriptions & consultations', route: '/admin/doctors', count: 8, status: 'active' },
        { id: 10, name: 'Patient Profiles', description: 'Demographics & medical history', route: '/admin/patients', count: 45, status: 'active' }
      ]
    },
    {
      id: 'care',
      title: 'Care & Support',
      description: 'Caregiver coordination & daily patient routines',
      icon: '🤝',
      color: 'from-emerald-500 to-teal-600',
      stats: { label: 'Active Caregivers', value: '32' },
      axes: [
        { id: 5, name: 'Caregiver Management', description: 'Assignments, workloads & performance', route: '/admin/caregivers', count: 32, status: 'active' },
        { id: 9, name: 'Daily Routines', description: 'Activity schedules & task templates', route: '/admin/routines', count: 156, status: 'active' }
      ]
    },
    {
      id: 'interactive',
      title: 'Interactive Features',
      description: 'Cognitive games, memory wallet & social activities',
      icon: '🧩',
      color: 'from-violet-500 to-purple-600',
      stats: { label: 'Games Played Today', value: '234' },
      axes: [
        { id: 7, name: 'Cognitive Games', description: 'Games library & progress tracking', route: '/admin/games', count: 24, status: 'active' },
        { id: 8, name: 'Memory Wallet', description: 'Memory items, photos & recognition', route: '/admin/memory', count: 1, status: 'active' },
        { id: 12, name: 'Social Activities', description: 'Events & group participation', route: '/admin/activities', count: 8, status: 'active' }
      ]
    },
    {
      id: 'community',
      title: 'Community & Content',
      description: 'Forum moderation & user-generated content',
      icon: '💬',
      color: 'from-blue-500 to-indigo-600',
      stats: { label: 'Forum Posts', value: '1,247' },
      axes: [
        { id: 11, name: 'Community Forum', description: 'Posts moderation & topics', route: '/admin/forum', count: 89, status: 'active' }
      ]
    }
  ];

  // Quick Actions
  quickActions: QuickAction[] = [
    { label: 'Add Patient', icon: '➕', color: 'bg-emerald-500', action: () => this.addPatient() },
    { label: 'Schedule Appointment', icon: '📅', color: 'bg-blue-500', action: () => this.scheduleAppointment() },
    { label: 'Send Broadcast', icon: '📢', color: 'bg-violet-500', action: () => this.sendBroadcast() },
    { label: 'System Settings', icon: '⚙️', color: 'bg-gray-600', action: () => this.openSettings() },
    { label: 'Generate Report', icon: '📊', color: 'bg-amber-500', action: () => this.generateReport() },
    { label: 'User Management', icon: '👤', color: 'bg-rose-500', action: () => this.manageUsers() }
  ];

  // System Alerts
  systemAlerts: SystemAlert[] = [
    { type: 'warning', title: 'Storage Alert', message: 'Database storage at 78% capacity. Consider archiving old records.', timestamp: '10 min ago' },
    { type: 'error', title: 'Failed Login Attempts', message: 'Multiple failed login attempts detected for user: john.doe@email.com', timestamp: '25 min ago' },
    { type: 'info', title: 'System Backup', message: 'Daily backup completed successfully. Size: 2.4 GB', timestamp: '2 hours ago' }
  ];

  // Recent Activity
  recentActivity: ActivityItem[] = [
    { type: 'medication', action: 'New prescription added', user: 'Dr. Sarah Johnson', timestamp: '5 min ago', icon: '💊', color: 'text-rose-500' },
    { type: 'user', action: 'New patient registered', user: 'Admin', timestamp: '15 min ago', icon: '👤', color: 'text-emerald-500' },
    { type: 'alert', action: 'High priority alert resolved', user: 'System', timestamp: '32 min ago', icon: '✅', color: 'text-blue-500' },
    { type: 'appointment', action: 'Appointment rescheduled', user: 'Caregiver Mike', timestamp: '1 hour ago', icon: '📅', color: 'text-violet-500' },
    { type: 'game', action: 'New cognitive game added', user: 'Content Manager', timestamp: '2 hours ago', icon: '🎮', color: 'text-amber-500' },
    { type: 'forum', action: 'Forum post flagged', user: 'Moderator', timestamp: '3 hours ago', icon: '🚩', color: 'text-red-500' }
  ];

  // System Status
  systemStatus = [
    { name: 'Database', status: 'operational', uptime: '99.99%' },
    { name: 'API Server', status: 'operational', uptime: '99.95%' },
    { name: 'Email Service', status: 'operational', uptime: '99.90%' },
    { name: 'File Storage', status: 'warning', uptime: '98.50%' },
    { name: 'Notification Service', status: 'operational', uptime: '99.99%' }
  ];

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    const currentUser = this.authService.getCurrentUser();
    if (currentUser) {
      this.adminName = currentUser.name || 'Administrator';
    }

    this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.adminName = user.name || 'Administrator';
      }
    });
  }

  getRoleClass(role: string): string {
    const classes: Record<string, string> = {
      patient: 'bg-emerald-100 text-emerald-700',
      caregiver: 'bg-blue-100 text-blue-700',
      doctor: 'bg-violet-100 text-violet-700',
      admin: 'bg-amber-100 text-amber-700'
    };
    return classes[role] || 'bg-gray-100 text-gray-800';
  }

  getStatusClass(status: string): string {
    const classes: Record<string, string> = {
      active: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      maintenance: 'bg-amber-100 text-amber-700 border-amber-200',
      warning: 'bg-rose-100 text-rose-700 border-rose-200'
    };
    return classes[status] || 'bg-gray-100 text-gray-700';
  }

  getSystemStatusClass(status: string): string {
    return status === 'operational' ? 'bg-emerald-500' : 
           status === 'warning' ? 'bg-amber-500' : 'bg-rose-500';
  }

  getAlertClass(type: string): string {
    const classes: Record<string, string> = {
      success: 'border-l-emerald-500 bg-emerald-50',
      warning: 'border-l-amber-500 bg-amber-50',
      error: 'border-l-rose-500 bg-rose-50',
      info: 'border-l-blue-500 bg-blue-50'
    };
    return classes[type] || 'border-l-gray-500 bg-gray-50';
  }

  getAlertIcon(type: string): string {
    const icons: Record<string, string> = {
      success: '✅',
      warning: '⚠️',
      error: '❌',
      info: 'ℹ️'
    };
    return icons[type] || '🔔';
  }

  // Quick Action Handlers
  addPatient(): void {
    console.log('Add Patient clicked');
  }

  scheduleAppointment(): void {
    console.log('Schedule Appointment clicked');
  }

  sendBroadcast(): void {
    console.log('Send Broadcast clicked');
  }

  openSettings(): void {
    console.log('Open Settings clicked');
  }

  generateReport(): void {
    console.log('Generate Report clicked');
  }

  manageUsers(): void {
    console.log('Manage Users clicked');
  }

  onQuickAction(action: QuickAction): void {
    action.action();
  }
}
