import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { AuthUser } from '../../core/models/user.model';

interface NavItem {
  label: string;
  path: string;
  icon: string;
  roles: string[];
}

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <!-- Mobile Header -->
    <div class="lg:hidden fixed top-0 left-0 right-0 h-14 bg-white border-b border-primary-100 shadow-sm z-50 flex items-center px-4">
      <button 
        (click)="toggleSidebar()"
        class="text-primary-600 hover:text-primary-700 transition">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
        </svg>
      </button>
      <span *ngIf="currentUser" class="ml-auto text-sm font-semibold text-gray-900">{{ currentUser.name }}</span>
    </div>

    <!-- Sidebar Overlay (mobile) -->
    <div 
      *ngIf="sidebarOpen" 
      (click)="toggleSidebar()"
      class="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-30 top-14">
    </div>

    <!-- Sidebar Navigation -->
    <nav class="fixed lg:sticky lg:relative left-0 top-14 lg:top-0 bottom-0 lg:bottom-auto w-64 lg:w-64 h-screen lg:h-screen bg-gradient-to-b from-primary-50 to-white border-r border-primary-100 shadow-lg lg:shadow-sm z-40 lg:z-auto transform transition-transform duration-300 lg:transform-none flex flex-col"
      [class.translate-x-0]="sidebarOpen"
      [class.-translate-x-full]="!sidebarOpen"
      [class.lg:translate-x-0]="true">
      
      <div class="p-6 space-y-6 h-full flex flex-col overflow-y-auto">
        <!-- Logo & Branding (desktop only) -->
        <div class="hidden lg:flex items-center gap-3 pb-2 border-b border-primary-100">
          <div class="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center text-white font-bold text-lg">♥</div>
          <div>
            <h1 class="text-lg font-bold text-primary-700">CareHub</h1>
            <p class="text-xs text-primary-600">Care Management</p>
          </div>
        </div>

        <!-- Collapse Button (desktop only) -->
        <div class="hidden lg:flex justify-end">
          <button
            (click)="toggleCollapsed()"
            class="text-primary-600 hover:text-primary-700 p-2 hover:bg-primary-100 rounded-lg transition"
            title="Collapse sidebar">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
            </svg>
          </button>
        </div>

        <!-- User Info -->
        <div *ngIf="currentUser" class="border-l-4 border-primary-500 pl-4 py-2">
          <p class="text-xs font-bold text-gray-500 uppercase tracking-wider">{{ roleLabel }}</p>
          <p class="text-base font-bold text-gray-900 mt-1">{{ currentUser.name }}</p>
        </div>

        <!-- Navigation Links (role-aware) -->
        <div class="space-y-2 flex-1">
          <a 
            *ngFor="let item of visibleNavItems"
            [routerLink]="item.path"
            routerLinkActive="active"
            [routerLinkActiveOptions]="{ exact: false }"
            (click)="closeSidebar()"
            class="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-primary-100 hover:text-primary-700 rounded-lg transition font-medium text-sm group">
            <span class="text-lg group-hover:scale-110 transition-transform">{{ item.icon }}</span>
            {{ item.label }}
          </a>
        </div>

        <!-- Logout Button -->
        <div class="pt-6 border-t border-primary-100">
          <button 
            (click)="logout()"
            class="w-full bg-danger text-white px-4 py-3 rounded-lg hover:bg-opacity-90 transition font-semibold text-sm">
            Logout
          </button>
        </div>
      </div>
    </nav>
  `,
  styles: [`
    nav {
      scrollbar-width: thin;
      scrollbar-color: #d1d5db #f3f4f6;
    }
    nav::-webkit-scrollbar {
      width: 6px;
    }
    nav::-webkit-scrollbar-track {
      background: #f3f4f6;
    }
    nav::-webkit-scrollbar-thumb {
      background: #d1d5db;
      border-radius: 3px;
    }
  `]
})
export class NavbarComponent implements OnInit {
  currentUser: AuthUser | null = null;
  roleLabel = '';
  sidebarOpen = false;
  sidebarCollapsed = false;

  navItems: NavItem[] = [
    // Patient routes
    {
      label: 'Dashboard',
      path: '/patient/dashboard',
      icon: '📊',
      roles: ['patient']
    },
    {
      label: 'Activities',
      path: '/patient/activities',
      icon: '📋',
      roles: ['patient']
    },
    {
      label: 'Medications',
      path: '/patient/medications',
      icon: '💊',
      roles: ['patient']
    },
    {
      label: 'Brain Games',
      path: '/patient/games',
      icon: '🎮',
      roles: ['patient']
    },
    {
      label: 'Community',
      path: '/patient/community',
      icon: '👥',
      roles: ['patient']
    },
    {
      label: 'Profile',
      path: '/patient/profile',
      icon: '👤',
      roles: ['patient']
    },
    // Caregiver routes
    {
      label: 'Dashboard',
      path: '/caregiver/dashboard',
      icon: '📊',
      roles: ['caregiver']
    },
    {
      label: 'Patients',
      path: '/caregiver/patients',
      icon: '👥',
      roles: ['caregiver']
    },
    {
      label: 'Tasks',
      path: '/caregiver/tasks',
      icon: '📋',
      roles: ['caregiver']
    },
    {
      label: 'Schedule',
      path: '/caregiver/schedule',
      icon: '📅',
      roles: ['caregiver']
    },
    // Doctor routes
    {
      label: 'Dashboard',
      path: '/doctor/dashboard',
      icon: '📊',
      roles: ['doctor']
    },
    {
      label: 'Patients',
      path: '/doctor/patients',
      icon: '👥',
      roles: ['doctor']
    },
    {
      label: 'Records',
      path: '/doctor/records',
      icon: '📄',
      roles: ['doctor']
    },
    {
      label: 'Schedule',
      path: '/doctor/schedule',
      icon: '📅',
      roles: ['doctor']
    },
    // Admin routes
    {
      label: 'Dashboard',
      path: '/admin/dashboard',
      icon: '📊',
      roles: ['admin']
    },
    {
      label: 'Users',
      path: '/admin/users',
      icon: '👥',
      roles: ['admin']
    },
    {
      label: 'Analytics',
      path: '/admin/analytics',
      icon: '📈',
      roles: ['admin']
    },
    {
      label: 'Settings',
      path: '/admin/settings',
      icon: '⚙️',
      roles: ['admin']
    }
  ];

  get visibleNavItems(): NavItem[] {
    if (!this.currentUser) return [];
    return this.navItems.filter(item => item.roles.includes(this.currentUser!.role));
  }

  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    if (this.currentUser) {
      this.roleLabel = this.capitalizeRole(this.currentUser.role);
    }
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  closeSidebar(): void {
    this.sidebarOpen = false;
  }

  toggleCollapsed(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/landing']);
  }

  private capitalizeRole(role: string): string {
    return role.charAt(0).toUpperCase() + role.slice(1);
  }
}
