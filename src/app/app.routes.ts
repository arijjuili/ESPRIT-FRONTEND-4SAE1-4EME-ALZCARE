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
    loadComponent: () => import('./modules/patient/patient-layout.component').then(m => m.PatientLayoutComponent),
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      {
        path: 'dashboard',
        loadComponent: () => import('./modules/patient/patient-dashboard.component').then(m => m.PatientDashboardComponent)
      },
      {
        path: 'activities',
        loadComponent: () => import('./modules/patient/patient-activities.component').then(m => m.PatientActivitiesComponent)
      },
      {
        path: 'medications',
        loadComponent: () => import('./modules/patient/patient-medications.component').then(m => m.PatientMedicationsComponent)
      },
      {
        path: 'games',
        loadComponent: () => import('./modules/patient/patient-games.component').then(m => m.PatientGamesComponent)
      },
      {
        path: 'community',
        loadComponent: () => import('./modules/patient/patient-community.component').then(m => m.PatientCommunityComponent)
      },
      {
        path: 'profile',
        loadComponent: () => import('./modules/patient/patient-profile.component').then(m => m.PatientProfileComponent)
      }
    ]
  },
  {
    path: 'caregiver',
    canActivate: [AuthGuard],
    loadComponent: () => import('./modules/caregiver/caregiver-layout.component').then(m => m.CaregiverLayoutComponent),
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      {
        path: 'dashboard',
        loadComponent: () => import('./modules/caregiver/caregiver-dashboard.component').then(m => m.CaregiverDashboardComponent)
      }
    ]
  },
  {
    path: 'doctor',
    canActivate: [AuthGuard],
    loadComponent: () => import('./modules/doctor/doctor-layout.component').then(m => m.DoctorLayoutComponent),
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      {
        path: 'dashboard',
        loadComponent: () => import('./modules/doctor/doctor-dashboard.component').then(m => m.DoctorDashboardComponent)
      }
    ]
  },
  {
    path: 'admin',
    canActivate: [AuthGuard],
    loadComponent: () => import('./modules/admin/admin-layout.component').then(m => m.AdminLayoutComponent),
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      {
        path: 'dashboard',
        loadComponent: () => import('./modules/admin/admin-dashboard.component').then(m => m.AdminDashboardComponent)
      }
    ]
  },
  {
    path: '**',
    redirectTo: '/landing'
  }
];
