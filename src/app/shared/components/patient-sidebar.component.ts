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
  template: `
    <aside class="w-64 bg-gradient-to-b from-primary-50 to-white border-r border-primary-100 h-screen sticky top-0 overflow-y-auto shadow-sm">
      <!-- Logo Section -->
      <div class="p-6 border-b border-primary-100">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center text-white font-bold text-lg">♥</div>
          <div>
            <h1 class="text-lg font-bold text-primary-700">CareHub</h1>
            <p class="text-xs text-primary-600">Your Health</p>
          </div>
        </div>
      </div>

      <!-- Navigation Items -->
      <nav class="p-4 space-y-2">
        <a 
          *ngFor="let item of navItems"
          [routerLink]="item.path"
          routerLinkActive="active"
          [routerLinkActiveOptions]="{ exact: true }"
          class="group flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 hover:bg-primary-100 text-gray-700 hover:text-primary-700"
          [ngClass]="{'bg-primary-100 text-primary-700 border-l-4 border-primary-500': isActive(item.path)}">
          <div class="text-2xl group-hover:scale-110 transition-transform">{{ item.icon }}</div>
          <div class="flex-1">
            <p class="font-semibold text-sm">{{ item.label }}</p>
            <p class="text-xs text-gray-500 group-hover:text-primary-600">{{ item.description }}</p>
          </div>
        </a>
      </nav>

      <!-- Quick Stats Section -->
      <div class="mx-4 my-6 p-4 bg-primary-50 rounded-xl border border-primary-100">
        <p class="text-xs font-bold text-primary-700 mb-3 uppercase tracking-wider">Quick Stats</p>
        <div class="space-y-2 text-sm">
          <div class="flex justify-between">
            <span class="text-gray-600">Medications</span>
            <span class="font-bold text-primary-700">3</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">Tasks Today</span>
            <span class="font-bold text-success">1/4</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">Next Appt</span>
            <span class="font-bold text-primary-700">3d</span>
          </div>
        </div>
      </div>

      <!-- Health Alert -->
      <div class="mx-4 mb-6 p-3 bg-success bg-opacity-10 border border-success border-opacity-20 rounded-lg">
        <p class="text-xs font-bold text-success mb-1">✅ Health Status</p>
        <p class="text-xs text-success text-opacity-80">All vitals normal</p>
      </div>

      <!-- Footer Help -->
      <div class="absolute bottom-0 left-0 right-0 p-4 border-t border-primary-100 bg-white">
        <button class="w-full text-xs font-semibold text-primary-600 hover:text-primary-700 py-2 text-center">
          🆘 Need Help?
        </button>
      </div>
    </aside>
  `,
  styles: [`
    aside {
      scrollbar-width: thin;
      scrollbar-color: #d1d5db #f3f4f6;
    }
    aside::-webkit-scrollbar {
      width: 6px;
    }
    aside::-webkit-scrollbar-track {
      background: #f3f4f6;
    }
    aside::-webkit-scrollbar-thumb {
      background: #d1d5db;
      border-radius: 3px;
    }
  `]
})
export class PatientSidebarComponent {
  navItems: NavItem[] = [
    {
      label: 'Dashboard',
      path: '/patient/dashboard',
      icon: '📊',
      description: 'Overview & metrics'
    },
    {
      label: 'Activities',
      path: '/patient/activities',
      icon: '📋',
      description: 'Daily tasks & logs'
    },
    {
      label: 'Medications',
      path: '/patient/medications',
      icon: '💊',
      description: 'Prescriptions & schedule'
    },
    {
      label: 'Brain Games',
      path: '/patient/games',
      icon: '🎮',
      description: 'Cognitive exercises'
    },
    {
      label: 'Community',
      path: '/patient/community',
      icon: '👥',
      description: 'Connect & support'
    },
    {
      label: 'Profile',
      path: '/patient/profile',
      icon: '👤',
      description: 'My information'
    }
  ];

  isActive(path: string): boolean {
    // This will be handled by routerLinkActive
    return false;
  }
}
