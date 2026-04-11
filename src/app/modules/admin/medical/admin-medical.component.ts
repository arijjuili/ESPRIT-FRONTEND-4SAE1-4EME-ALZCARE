import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

interface MedicalModule {
  id: number;
  name: string;
  description: string;
  icon: string;
  count: number;
  status: 'active' | 'maintenance' | 'warning';
  lastUpdated: string;
}

interface MedicalStat {
  label: string;
  value: number;
  icon: string;
  color: string;
  trend: string;
}

@Component({
  selector: 'app-admin-medical',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './admin-medical.component.html',
  styleUrls: ['./admin-medical.component.scss']
})
export class AdminMedicalComponent implements OnInit {
  currentDate = new Date();

  // Medical Management Stats
  medicalStats: MedicalStat[] = [
    { label: 'Active Prescriptions', value: 127, icon: '💊', color: 'violet', trend: '+5 this week' },
    { label: 'Appointments Today', value: 34, icon: '📅', color: 'blue', trend: '+2 vs yesterday' },
    { label: 'Behavior Incidents', value: 12, icon: '📊', color: 'amber', trend: '-3 this week' },
    { label: 'Active Alerts', value: 5, icon: '🔔', color: 'rose', trend: '2 critical' }
  ];

  // Medical Modules (6 Axes)
  medicalModules: MedicalModule[] = [
    {
      id: 1,
      name: 'Medication & Reminders',
      description: 'Drug inventory, schedules & adherence tracking',
      icon: '💊',
      count: 89,
      status: 'active',
      lastUpdated: '2 hours ago'
    },
    {
      id: 2,
      name: 'Appointments',
      description: 'Scheduling & calendar management',
      icon: '📅',
      count: 34,
      status: 'active',
      lastUpdated: '15 min ago'
    },
    {
      id: 3,
      name: 'Behavior Monitoring',
      description: 'Pattern tracking & incident reports',
      icon: '📊',
      count: 12,
      status: 'active',
      lastUpdated: '1 hour ago'
    },
    {
      id: 4,
      name: 'Alert System',
      description: 'Critical alerts & escalation rules',
      icon: '🔔',
      count: 5,
      status: 'warning',
      lastUpdated: '5 min ago'
    },
    {
      id: 6,
      name: 'Doctor Workflows',
      description: 'Prescriptions & consultations',
      icon: '👨‍⚕️',
      count: 8,
      status: 'active',
      lastUpdated: '30 min ago'
    },
    {
      id: 10,
      name: 'Patient Profiles',
      description: 'Demographics & medical history',
      icon: '🏥',
      count: 45,
      status: 'active',
      lastUpdated: '3 hours ago'
    }
  ];

  // Recent Medical Activities
  recentActivities = [
    { action: 'New prescription added', user: 'Dr. Sarah Johnson', patient: 'John Doe', time: '5 min ago', icon: '💊', color: 'rose' },
    { action: 'Appointment scheduled', user: 'Admin', patient: 'Mary Smith', time: '15 min ago', icon: '📅', color: 'blue' },
    { action: 'Behavior incident logged', user: 'Caregiver Mike', patient: 'Robert Brown', time: '45 min ago', icon: '📊', color: 'amber' },
    { action: 'High alert resolved', user: 'Dr. Emily Chen', patient: 'Jane Wilson', time: '1 hour ago', icon: '✅', color: 'emerald' }
  ];

  constructor() {}

  ngOnInit(): void {}

  getStatusClass(status: string): string {
    const classes: Record<string, string> = {
      active: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      maintenance: 'bg-amber-100 text-amber-700 border-amber-200',
      warning: 'bg-rose-100 text-rose-700 border-rose-200'
    };
    return classes[status] || 'bg-gray-100 text-gray-700';
  }

  getModuleColor(id: number): string {
    const colors: Record<number, string> = {
      1: 'from-rose-500 to-pink-600',
      2: 'from-blue-500 to-indigo-600',
      3: 'from-amber-500 to-orange-600',
      4: 'from-red-500 to-rose-600',
      6: 'from-cyan-500 to-blue-600',
      10: 'from-violet-500 to-purple-600'
    };
    return colors[id] || 'from-gray-500 to-gray-600';
  }
}
