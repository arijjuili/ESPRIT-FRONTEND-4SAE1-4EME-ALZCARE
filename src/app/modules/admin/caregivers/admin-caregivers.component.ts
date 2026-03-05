import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

interface Caregiver {
  id: number;
  name: string;
  email: string;
  phone: string;
  patients: number;
  status: 'active' | 'offline' | 'busy';
  rating: number;
  joinDate: string;
  avatar?: string;
}

interface Routine {
  id: number;
  name: string;
  description: string;
  patients: number;
  tasks: number;
  status: 'active' | 'draft';
}

@Component({
  selector: 'app-admin-caregivers',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './admin-caregivers.component.html',
  styleUrls: ['./admin-caregivers.component.scss']
})
export class AdminCaregiversComponent implements OnInit {
  // Caregiver Stats
  caregiverStats = [
    { label: 'Total Caregivers', value: 32, icon: '🤝', color: 'emerald', change: '+3 this month' },
    { label: 'Active Now', value: 18, icon: '🟢', color: 'success', change: '56% online' },
    { label: 'Patient Assignments', value: 45, icon: '👥', color: 'blue', change: '1.4 per caregiver' },
    { label: 'Daily Routines', value: 156, icon: '📋', color: 'violet', change: '12 new today' }
  ];

  // Caregivers List
  caregivers: Caregiver[] = [
    { id: 1, name: 'Sarah Johnson', email: 'sarah.j@carehub.com', phone: '+1 234-567-8901', patients: 3, status: 'active', rating: 4.8, joinDate: '2024-01-15' },
    { id: 2, name: 'Mike Chen', email: 'mike.c@carehub.com', phone: '+1 234-567-8902', patients: 2, status: 'busy', rating: 4.9, joinDate: '2024-02-01' },
    { id: 3, name: 'Emily Davis', email: 'emily.d@carehub.com', phone: '+1 234-567-8903', patients: 4, status: 'active', rating: 4.7, joinDate: '2023-11-20' },
    { id: 4, name: 'Robert Wilson', email: 'rob.w@carehub.com', phone: '+1 234-567-8904', patients: 1, status: 'offline', rating: 4.6, joinDate: '2024-03-10' },
    { id: 5, name: 'Lisa Anderson', email: 'lisa.a@carehub.com', phone: '+1 234-567-8905', patients: 2, status: 'active', rating: 4.9, joinDate: '2024-01-05' }
  ];

  // Daily Routines
  routines: Routine[] = [
    { id: 1, name: 'Morning Care Routine', description: 'Wake up, hygiene, breakfast, medications', patients: 28, tasks: 8, status: 'active' },
    { id: 2, name: 'Afternoon Activities', description: 'Exercise, cognitive games, social time', patients: 32, tasks: 6, status: 'active' },
    { id: 3, name: 'Evening Wind-down', description: 'Dinner, relaxation, medication, sleep prep', patients: 30, tasks: 7, status: 'active' },
    { id: 4, name: 'Weekend Special', description: 'Extended activities, family visits', patients: 15, tasks: 10, status: 'draft' }
  ];

  constructor() {}

  ngOnInit(): void {}

  getStatusClass(status: string): string {
    const classes: Record<string, string> = {
      active: 'bg-emerald-100 text-emerald-700',
      offline: 'bg-gray-100 text-gray-600',
      busy: 'bg-amber-100 text-amber-700'
    };
    return classes[status] || 'bg-gray-100 text-gray-700';
  }

  getStatusDot(status: string): string {
    const classes: Record<string, string> = {
      active: 'bg-emerald-500',
      offline: 'bg-gray-400',
      busy: 'bg-amber-500'
    };
    return classes[status] || 'bg-gray-400';
  }

  getStarArray(rating: number): number[] {
    return Array(5).fill(0).map((_, i) => i + 1);
  }
}
