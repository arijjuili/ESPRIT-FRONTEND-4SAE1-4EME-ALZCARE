import { Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/landing',
    pathMatch: 'full'
  },
  {
    path: 'landing',
    loadComponent: () => import('./modules/landing/landing.component').then(m => m.LandingComponent)
  },
  {
    path: 'login',
    loadComponent: () => import('./modules/auth/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'patient',
    canActivate: [AuthGuard],
    loadComponent: () => import('./modules/patient/layout/patient-layout.component').then(m => m.PatientLayoutComponent),
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      {
        path: 'dashboard',
        loadComponent: () => import('./modules/patient/dashboard/patient-dashboard.component').then(m => m.PatientDashboardComponent)
      },
      {
        path: 'activities',
        loadComponent: () => import('./modules/patient/activities/patient-activities.component').then(m => m.PatientActivitiesComponent)
      },
      {
        path: 'medications',
        loadComponent: () => import('./modules/patient/medications/patient-medications.component').then(m => m.PatientMedicationsComponent)
      },
      {
        path: 'games',
        loadComponent: () => import('./modules/patient/games/patient-games.component').then(m => m.PatientGamesComponent)
      },
      {
        path: 'community',
        loadComponent: () => import('./modules/patient/community/patient-community.component').then(m => m.PatientCommunityComponent)
      },
      {
        path: 'profile',
        loadComponent: () => import('./modules/patient/profile/patient-profile.component').then(m => m.PatientProfileComponent)
      }
    ]
  },
  {
    path: 'caregiver',
    canActivate: [AuthGuard],
    loadComponent: () => import('./modules/caregiver/layout/caregiver-layout.component').then(m => m.CaregiverLayoutComponent),
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      {
        path: 'dashboard',
        loadComponent: () => import('./modules/caregiver/dashboard/caregiver-dashboard.component').then(m => m.CaregiverDashboardComponent)
      }
    ]
  },
  {
    path: 'doctor',
    canActivate: [AuthGuard],
    loadComponent: () => import('./modules/doctor/layout/doctor-layout.component').then(m => m.DoctorLayoutComponent),
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      {
        path: 'dashboard',
        loadComponent: () => import('./modules/doctor/dashboard/doctor-dashboard.component').then(m => m.DoctorDashboardComponent)
      }
    ]
  },
  {
    path: 'admin',
    canActivate: [AuthGuard],
    loadComponent: () => import('./modules/admin/layout/admin-layout.component').then(m => m.AdminLayoutComponent),
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      {
        path: 'dashboard',
        loadComponent: () => import('./modules/admin/dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent)
      },
      {
        path: 'medical',
        loadComponent: () => import('./modules/admin/medical/admin-medical.component').then(m => m.AdminMedicalComponent)
      },
      {
        path: 'caregivers',
        loadComponent: () => import('./modules/admin/caregivers/admin-caregivers.component').then(m => m.AdminCaregiversComponent)
      },
      {
        path: 'interactive',
        loadComponent: () => import('./modules/admin/interactive/admin-interactive.component').then(m => m.AdminInteractiveComponent)
      },
      {
        path: 'community',
        loadComponent: () => import('./modules/admin/community/admin-community.component').then(m => m.AdminCommunityComponent)
      },
      {
        path: 'users',
        loadComponent: () => import('./modules/admin/users/admin-users.component').then(m => m.AdminUsersComponent)
      },
      {
        path: 'analytics',
        loadComponent: () => import('./modules/admin/analytics/admin-analytics.component').then(m => m.AdminAnalyticsComponent)
      },
      {
        path: 'settings',
        loadComponent: () => import('./modules/admin/settings/admin-settings.component').then(m => m.AdminSettingsComponent)
      }
    ]
  },
  {
    path: '**',
    redirectTo: '/landing'
  }
];
