import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';

interface NavItem {
  label: string;
  path: string;
  icon: string;
  description: string;
}

@Component({
  selector: 'app-patient-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './patient-sidebar.component.html',
  styleUrls: ['./patient-sidebar.component.scss']
})
export class PatientSidebarComponent {
  navItems: NavItem[] = [
    {
      label: 'Dashboard',
      path: '/patient/dashboard',
      icon: 'ðŸ“Š',
      description: 'Overview & metrics'
    },
    {
      label: 'Activities',
      path: '/patient/activities',
      icon: 'ðŸ“‹',
      description: 'Daily tasks & logs'
    },
    {
      label: 'Medications',
      path: '/patient/medications',
      icon: 'ðŸ’Š',
      description: 'Prescriptions & schedule'
    },
        {
      label: 'Appointments',
      path: '/patient/appointments',
      icon: '📅',
      description: 'Visits & schedule'
    },{
      label: 'Brain Games',
      path: '/patient/games',
      icon: 'ðŸŽ®',
      description: 'Cognitive exercises'
    },
    {
      label: 'Community',
      path: '/patient/community',
      icon: 'ðŸ‘¥',
      description: 'Connect & support'
    },
    {
      label: 'Profile',
      path: '/patient/profile',
      icon: 'ðŸ‘¤',
      description: 'My information'
    }
  ];

  isActive(path: string): boolean {
    // This will be handled by routerLinkActive
    return false;
  }
}

