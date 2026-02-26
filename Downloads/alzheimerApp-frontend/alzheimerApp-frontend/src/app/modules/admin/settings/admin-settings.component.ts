import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

interface SettingSection {
  id: string;
  title: string;
  icon: string;
  description: string;
}

interface Setting {
  id: string;
  label: string;
  type: 'toggle' | 'text' | 'select' | 'number';
  value: any;
  options?: string[];
  description: string;
}

@Component({
  selector: 'app-admin-settings',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './admin-settings.component.html',
  styleUrls: ['./admin-settings.component.scss']
})
export class AdminSettingsComponent implements OnInit {
  activeSection = 'general';

  // Setting Sections
  sections: SettingSection[] = [
    { id: 'general', title: 'General', icon: '⚙️', description: 'Basic platform configuration' },
    { id: 'security', title: 'Security', icon: '🔒', description: 'Authentication & access control' },
    { id: 'notifications', title: 'Notifications', icon: '🔔', description: 'Alert preferences & channels' },
    { id: 'integrations', title: 'Integrations', icon: '🔗', description: 'Third-party services' },
    { id: 'backup', title: 'Backup & Data', icon: '💾', description: 'Data management & recovery' },
    { id: 'appearance', title: 'Appearance', icon: '🎨', description: 'Branding & customization' }
  ];

  // General Settings
  generalSettings: Setting[] = [
    { id: 'platformName', label: 'Platform Name', type: 'text', value: 'CareHub', description: 'Name displayed across the application' },
    { id: 'timezone', label: 'Default Timezone', type: 'select', value: 'UTC-5', options: ['UTC-8', 'UTC-5', 'UTC+0', 'UTC+1'], description: 'Primary timezone for scheduling' },
    { id: 'language', label: 'Default Language', type: 'select', value: 'English', options: ['English', 'Spanish', 'French'], description: 'Default language for new users' },
    { id: 'dateFormat', label: 'Date Format', type: 'select', value: 'MM/DD/YYYY', options: ['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD'], description: 'Format for displaying dates' }
  ];

  // Security Settings
  securitySettings: Setting[] = [
    { id: 'twoFactor', label: 'Require 2FA for Admins', type: 'toggle', value: true, description: 'Enforce two-factor authentication for admin accounts' },
    { id: 'sessionTimeout', label: 'Session Timeout (mins)', type: 'number', value: 30, description: 'Auto-logout after inactivity period' },
    { id: 'passwordExpiry', label: 'Password Expiry (days)', type: 'number', value: 90, description: 'Force password reset after this period' },
    { id: 'loginAttempts', label: 'Max Login Attempts', type: 'number', value: 5, description: 'Lock account after failed attempts' }
  ];

  // Notification Settings
  notificationSettings: Setting[] = [
    { id: 'emailAlerts', label: 'Email Alerts', type: 'toggle', value: true, description: 'Send critical alerts via email' },
    { id: 'smsAlerts', label: 'SMS Alerts', type: 'toggle', value: false, description: 'Send urgent alerts via SMS' },
    { id: 'pushNotifications', label: 'Push Notifications', type: 'toggle', value: true, description: 'Enable browser push notifications' },
    { id: 'digestEmail', label: 'Daily Digest Email', type: 'toggle', value: true, description: 'Send daily summary to admins' }
  ];

  // Integration Settings
  integrations = [
    { id: 'email', name: 'Email Service', status: 'connected', provider: 'SendGrid', icon: '📧' },
    { id: 'sms', name: 'SMS Gateway', status: 'disconnected', provider: 'Twilio', icon: '📱' },
    { id: 'storage', name: 'Cloud Storage', status: 'connected', provider: 'AWS S3', icon: '☁️' },
    { id: 'analytics', name: 'Analytics', status: 'connected', provider: 'Google Analytics', icon: '📊' }
  ];

  // Backup Info
  backupInfo = {
    lastBackup: 'Today, 3:00 AM',
    size: '2.4 GB',
    frequency: 'Daily',
    retention: '30 days',
    nextBackup: 'Tomorrow, 3:00 AM'
  };

  // System Info
  systemInfo = {
    version: '2.1.4',
    environment: 'Production',
    server: 'app-01.production',
    database: 'PostgreSQL 15',
    uptime: '45 days, 12 hours'
  };

  constructor() {}

  ngOnInit(): void {}

  setActiveSection(sectionId: string): void {
    this.activeSection = sectionId;
  }

  saveSettings(): void {
    console.log('Settings saved');
  }

  testIntegration(integrationId: string): void {
    console.log('Testing integration:', integrationId);
  }

  connectIntegration(integrationId: string): void {
    console.log('Connecting integration:', integrationId);
  }

  runBackup(): void {
    console.log('Running backup...');
  }

  restoreBackup(): void {
    console.log('Restore backup clicked');
  }
}
