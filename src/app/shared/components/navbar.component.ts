import { Component, OnInit, OnDestroy, HostBinding } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { AuthUser, UserRole } from '../../core/models/user.model';
import { Subscription } from 'rxjs';


interface NavItem {
  label: string;
  path: string;
  icon: string;
  roles: string[];
}

export interface RoleTheme {
  name: string;
  primary: string;
  primaryLight: string;
  primaryDark: string;
  gradientFrom: string;
  gradientTo: string;
  borderColor: string;
  hoverBg: string;
  activeBg: string;
  activeText: string;
}

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent implements OnInit, OnDestroy {
  currentUser: AuthUser | null = null;
  private authSubscription: Subscription | null = null;
  roleLabel = '';
  sidebarOpen = false;
  sidebarCollapsed = false;

  // Role-specific themes matching DESIGN_SYSTEM.md
  roleThemes: Record<UserRole, RoleTheme> = {
    patient: {
      name: 'Patient',
      primary: '#14b8a6',      // Teal 500
      primaryLight: '#f0fdfa', // Teal 50
      primaryDark: '#0f766e',  // Teal 700
      gradientFrom: '#14b8a6',
      gradientTo: '#0d9488',
      borderColor: '#ccfbf1',  // Teal 100
      hoverBg: '#ccfbf1',
      activeBg: '#14b8a6',
      activeText: '#ffffff'
    },
    caregiver: {
      name: 'Caregiver',
      primary: '#10b981',      // Emerald 500
      primaryLight: '#ecfdf5', // Emerald 50
      primaryDark: '#047857',  // Emerald 700
      gradientFrom: '#10b981',
      gradientTo: '#059669',
      borderColor: '#d1fae5',  // Emerald 100
      hoverBg: '#d1fae5',
      activeBg: '#10b981',
      activeText: '#ffffff'
    },
    doctor: {
      name: 'Doctor',
      primary: '#3b82f6',      // Blue 500
      primaryLight: '#eff6ff', // Blue 50
      primaryDark: '#1d4ed8',  // Blue 700
      gradientFrom: '#3b82f6',
      gradientTo: '#2563eb',
      borderColor: '#dbeafe',  // Blue 100
      hoverBg: '#dbeafe',
      activeBg: '#3b82f6',
      activeText: '#ffffff'
    },
    admin: {
      name: 'Admin',
      primary: '#8b5cf6',      // Violet 500
      primaryLight: '#f5f3ff', // Violet 50
      primaryDark: '#6d28d9',  // Violet 700
      gradientFrom: '#8b5cf6',
      gradientTo: '#7c3aed',
      borderColor: '#ede9fe',  // Violet 100
      hoverBg: '#ede9fe',
      activeBg: '#8b5cf6',
      activeText: '#ffffff'
    }
  };

  currentTheme: RoleTheme = this.roleThemes['patient'];

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
      label: 'Appointments',
      path: '/patient/appointments',
      icon: '📅',
      roles: ['patient']
    },{
      label: 'Brain Games',
      path: '/patient/games',
      icon: '🎮',
      roles: ['patient']
    },
    {
      label: 'Memory Wallet',
      path: '/patient/memory-wallet',
      icon: '🧠',
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
      label: 'Appointments',
      path: '/caregiver/appointments',
      icon: '📅',
      roles: ['caregiver']
    },
    {
      label: 'Patients',
      path: '/caregiver/patients',
      icon: '👥',
      roles: ['caregiver']
    },
        {
      label: 'Medications',
      path: '/caregiver/medications',
      icon: '💊',
      roles: ['caregiver']
    },{
      label: 'Behaviors',
      path: '/caregiver/behaviors',
      icon: '📊',
      roles: ['caregiver']
    },
    {
      label: 'Events',
      path: '/caregiver/events',
      icon: '📹',
      roles: ['caregiver']
    },
    {
      label: 'Safety Alerts',
      path: '/alerts',
      icon: '🚨',
      roles: ['caregiver', 'doctor', 'admin']
    },
    {
      label: 'Tasks',
      path: '/caregiver/tasks',
      icon: '📋',
      roles: ['caregiver']
    },
    {
      label: 'Handovers',
      path: '/caregiver/handovers',
      icon: '📝',
      roles: ['caregiver']
    },
    {
      label: 'Schedule',
      path: '/caregiver/schedule',
      icon: '📅',
      roles: ['caregiver']
    },
    {
      label: 'Memory Items',
      path: '/caregiver/memory-items',
      icon: '🧠',
      roles: ['caregiver']
    },
    {
      label: 'Game Analytics',
      path: '/caregiver/cognitive-analytics',
      icon: '📈',
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
      label: 'Appointments',
      path: '/doctor/appointments',
      icon: '📅',
      roles: ['doctor']
    },
    {
      label: 'Prescriptions',
      path: '/doctor/prescriptions',
      icon: '💊',
      roles: ['doctor']
    },
    {
      label: 'Records',
      path: '/doctor/records',
      icon: '📄',
      roles: ['doctor']
    },{
      label: 'Checklist',
      path: '/doctor/checklist',
      icon: '📋',
      roles: ['doctor']
    },
    {
      label: 'Health Records',
      path: '/doctor/assessments',
      icon: '🧠',
      roles: ['doctor']
    },
    {
      label: 'Game Analytics',
      path: '/doctor/cognitive-analytics',
      icon: '📈',
      roles: ['doctor']
    },
    // Admin routes - 12 Axes Management
    {
      label: 'Dashboard',
      path: '/admin/dashboard',
      icon: '📊',
      roles: ['admin']
    },
    {
      label: 'Medical',
      path: '/admin/medical',
      icon: '🏥',
      roles: ['admin']
    },
    {
      label: 'Caregivers',
      path: '/admin/caregivers',
      icon: '🤝',
      roles: ['admin']
    },
    {
      label: 'Interactive',
      path: '/admin/interactive',
      icon: '🧩',
      roles: ['admin']
    },
    {
      label: 'Community',
      path: '/admin/community',
      icon: '💬',
      roles: ['admin']
    },
    {
      label: 'Users',
      path: '/admin/users',
      icon: '👥',
      roles: ['admin']
    },
    {
      label: 'Care Teams',
      path: '/admin/care-teams',
      icon: '👨‍⚕️',
      roles: ['admin']
    },
    {
      label: 'Analytics',
      path: '/admin/analytics',
      icon: '📈',
      roles: ['admin']
    },
    {
      label: 'Schedules',
      path: '/admin/schedules',
      icon: '📅',
      roles: ['admin']
    },
    {
      label: 'Cameras',
      path: '/admin/medical/cameras',
      icon: '📹',
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

  // Dynamic CSS variables based on role theme
  @HostBinding('style.--primary-color')
  get primaryColor(): string { return this.currentTheme.primary; }

  @HostBinding('style.--primary-light')
  get primaryLight(): string { return this.currentTheme.primaryLight; }

  @HostBinding('style.--primary-dark')
  get primaryDark(): string { return this.currentTheme.primaryDark; }

  @HostBinding('style.--gradient-from')
  get gradientFrom(): string { return this.currentTheme.gradientFrom; }

  @HostBinding('style.--gradient-to')
  get gradientTo(): string { return this.currentTheme.gradientTo; }

  @HostBinding('style.--border-color')
  get borderColor(): string { return this.currentTheme.borderColor; }

  @HostBinding('style.--hover-bg')
  get hoverBg(): string { return this.currentTheme.hoverBg; }

  @HostBinding('style.--active-bg')
  get activeBg(): string { return this.currentTheme.activeBg; }

  @HostBinding('style.--active-text')
  get activeText(): string { return this.currentTheme.activeText; }

  constructor(private authService: AuthService, private router: Router) { }

  ngOnInit(): void {
    // First try to load directly from localStorage as fallback
    const stored = localStorage.getItem('currentUser');
    if (stored) {
      try {
        const user = JSON.parse(stored);
        this.currentUser = user;
        const role = user.role as UserRole;
        this.roleLabel = this.capitalizeRole(role);
        this.currentTheme = this.roleThemes[role];
      } catch (e) {
        console.error('Failed to parse stored user', e);
      }
    }

    // Subscribe to auth changes so sidebar updates when user logs in/out
    this.authSubscription = this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      if (user) {
        const role = user.role as UserRole;
        this.roleLabel = this.capitalizeRole(role);
        this.currentTheme = this.roleThemes[role];
      } else {
        this.roleLabel = '';
        this.currentTheme = this.roleThemes['patient'];
      }
    });
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

  ngOnDestroy(): void {
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
  }
}

