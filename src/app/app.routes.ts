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
        path: 'community/post/:id',
        loadComponent: () => import('./modules/patient/community/post-detail/post-detail.component').then(m => m.PostDetailComponent)
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
      },
      {
        path: 'behaviors',
        loadComponent: () => import('./modules/caregiver/behaviors/behaviors-page/behaviors-page.component').then(m => m.BehaviorsPageComponent)
      },
      {
        path: 'behaviors/:patientId',
        loadComponent: () => import('./modules/caregiver/behaviors/behaviors-page/behaviors-page.component').then(m => m.BehaviorsPageComponent)
      },
      {
        path: 'tasks',
        loadComponent: () => import('./modules/caregiver/tasks/caregiver-tasks.component').then(m => m.CaregiverTasksComponent)
      },
      {
        path: 'handovers',
        loadComponent: () => import('./modules/caregiver/handovers/caregiver-handover.component').then(m => m.CaregiverHandoverComponent)
      },
      {
        path: 'patients',
        loadComponent: () => import('./modules/caregiver/patients/caregiver-patients.component').then(m => m.CaregiverPatientsComponent)
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
      },
      {
        path: 'patients/:patientId',
        loadComponent: () => import('./modules/doctor/patient-detail/doctor-patient-detail.component').then(m => m.DoctorPatientDetailComponent)
      },
      {
        path: 'checklist',
        loadComponent: () => import('./modules/doctor/checklist/doctor-checklist.component').then(m => m.DoctorChecklistComponent)
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
        path: 'care-teams',
        loadComponent: () => import('./modules/admin/care-teams/admin-care-teams.component').then(m => m.AdminCareTeamsComponent)
      },
      {
        path: 'analytics',
        loadComponent: () => import('./modules/admin/analytics/admin-analytics.component').then(m => m.AdminAnalyticsComponent)
      },
      {
        path: 'settings',
        loadComponent: () => import('./modules/admin/settings/admin-settings.component').then(m => m.AdminSettingsComponent)
      },
      {
        path: 'schedules',
        loadComponent: () => import('./modules/admin/schedules/schedule-list/schedule-list.component').then(m => m.ScheduleListComponent)
      },
      {
        path: 'schedules/new',
        loadComponent: () => import('./modules/admin/schedules/schedule-form/schedule-form.component').then(m => m.ScheduleFormComponent)
      },
      {
        path: 'schedules/edit/:id',
        loadComponent: () => import('./modules/admin/schedules/schedule-form/schedule-form.component').then(m => m.ScheduleFormComponent)
      },
      {
        path: 'medical/cameras',
        loadComponent: () => import('./modules/admin/camera-devices/admin-camera-devices.component')
          .then(m => m.AdminCameraDevicesComponent)
      }
    ]
  },
  {
    path: 'dashboard',
    canActivate: [AuthGuard],
    loadComponent: () => import('./core/components/dashboard-redirect.component').then(m => m.DashboardRedirectComponent)
  },
  {
    path: 'notifications',
    canActivate: [AuthGuard],
    loadComponent: () => import('./shared/components/notification-list/notification-list.component').then(m => m.NotificationListComponent)
  },
  {
    path: '**',
    redirectTo: '/landing'
  }
];
