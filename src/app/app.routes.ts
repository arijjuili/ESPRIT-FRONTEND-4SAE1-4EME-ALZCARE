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
    path: 'accept-invite',
    loadComponent: () => import('./modules/auth/accept-invite.component').then(m => m.AcceptInviteComponent)
  },
  {
    path: 'accept/:token',
    loadComponent: () =>
      import('./modules/auth/accept-invite-redirect.component').then(m => m.AcceptInviteRedirectComponent)
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
        path: 'activities/registrations',
        loadComponent: () => import('./modules/patient/activities/my-registrations/my-registrations.component').then(m => m.MyRegistrationsComponent)
      },
      {
        path: 'activities/:id',
        loadComponent: () => import('./modules/patient/activities/activity-detail/activity-detail.component').then(m => m.ActivityDetailComponent)
      },
      {
        path: 'routines',
        loadComponent: () => import('./modules/patient/routines/patient-routines.component').then(m => m.PatientRoutinesComponent)
      },
      {
        path: 'medications',
        loadComponent: () => import('./modules/patient/medications/patient-medications.component').then(m => m.PatientMedicationsComponent)
      },
      {
        path: 'appointments',
        loadComponent: () => import('./modules/patient/appointments/patient-appointments.component').then(m => m.PatientAppointmentsComponent)
      },
      {
        path: 'games',
        loadComponent: () => import('./modules/patient/games/patient-games.component').then(m => m.PatientGamesComponent)
      },
      {
        path: 'games/memory-match',
        loadComponent: () => import('./modules/patient/games/memory-match/memory-match.component').then(m => m.MemoryMatchComponent)
      },
      {
        path: 'games/pattern-recognition',
        loadComponent: () => import('./modules/patient/games/pattern-recognition/pattern-recognition.component').then(m => m.PatternRecognitionComponent)
      },
      {
        path: 'games/word-recall',
        loadComponent: () => import('./modules/patient/games/word-recall/word-recall.component').then(m => m.WordRecallComponent)
      },
      {
        path: 'games/spatial-navigation',
        loadComponent: () => import('./modules/patient/games/spatial-navigation/spatial-navigation.component').then(m => m.SpatialNavigationComponent)
      },
      {
        path: 'games/attention-task',
        loadComponent: () => import('./modules/patient/games/attention-task/attention-task.component').then(m => m.AttentionTaskComponent)
      },
      {
        path: 'memory-wallet',
        loadComponent: () => import('./modules/patient/memory-wallet/patient-memory-wallet.component').then(m => m.PatientMemoryWalletComponent)
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
      },
      {
        path: 'assessment',
        loadComponent: () => import('./modules/patient/assessment/patient-assessment.component').then(m => m.PatientAssessmentComponent)
      },
      {
        path: 'routines',
        loadComponent: () => import('./modules/patient/routines/patient-routines.component').then(m => m.PatientRoutinesComponent)
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
        path: 'appointments',
        loadComponent: () => import('./modules/caregiver/appointments/caregiver-appointments.component').then(m => m.CaregiverAppointmentsComponent)
      },
      {

        path: 'memory-items',
        loadComponent: () => import('./modules/caregiver/memory-items/caregiver-memory-items.component').then(m => m.CaregiverMemoryItemsComponent)
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
        path: 'events',
        loadComponent: () => import('./modules/caregiver/events/caregiver-events.component').then(m => m.CaregiverEventsComponent)
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
      },
      {
        path: 'medications',
        loadComponent: () => import('./modules/caregiver/medications/caregiver-medications.component').then(m => m.CaregiverMedicationsComponent)

      },
      {
        path: 'cognitive-analytics',
        loadComponent: () => import('./modules/caregiver/game-analytics/caregiver-game-analytics.component').then(m => m.CaregiverGameAnalyticsComponent)
      },
      {
        path: 'cognitive-patient/:id',
        loadComponent: () => import('./modules/doctor/patient-analytics/patient-analytics.component').then(m => m.PatientAnalyticsComponent)
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
        path: 'appointments',
        loadComponent: () => import('./modules/doctor/appointments/doctor-appointments.component').then(m => m.DoctorAppointmentsComponent)
      },
      {
        path: 'prescriptions',
        loadComponent: () => import('./modules/doctor/prescriptions/doctor-prescriptions.component').then(m => m.DoctorPrescriptionsComponent)
      },
      {
        path: 'patients',
        loadComponent: () => import('./modules/doctor/patients/doctor-patients.component').then(m => m.DoctorPatientsComponent)
      },
      {
        path: 'patients/:patientId',
        loadComponent: () => import('./modules/doctor/patient-detail/doctor-patient-detail.component').then(m => m.DoctorPatientDetailComponent)
      },
      {
        path: 'patients/:id/prescriptions',
        loadComponent: () => import('./modules/doctor/prescriptions/doctor-prescriptions.component').then(m => m.DoctorPrescriptionsComponent)
      },
      {
        path: 'patients/:id/appointments',
        loadComponent: () => import('./modules/doctor/appointments/doctor-appointments.component').then(m => m.DoctorAppointmentsComponent)
      },
      {
        path: 'records',
        loadComponent: () => import('./modules/doctor/records/doctor-records.component').then(m => m.DoctorRecordsComponent)
      },
      {
        path: 'patients/:id/records',
        loadComponent: () => import('./modules/doctor/records/doctor-records.component').then(m => m.DoctorRecordsComponent)
      },
      {
        path: 'checklist',
        loadComponent: () => import('./modules/doctor/checklist/doctor-checklist.component').then(m => m.DoctorChecklistComponent)
      },
      {
        path: 'assessments',
        loadComponent: () => import('./modules/doctor/assessments/doctor-assessments.component').then(m => m.DoctorAssessmentsComponent)
      },
      {
        path: 'assessments/:id',
        loadComponent: () => import('./modules/doctor/assessments/doctor-assessment-result.component').then(m => m.DoctorAssessmentResultComponent)
      },
      {
        path: 'cognitive-analytics',
        loadComponent: () => import('./modules/doctor/game-analytics/doctor-game-analytics.component').then(m => m.DoctorGameAnalyticsComponent)
      },
      {
        path: 'cognitive-patient/:id',
        loadComponent: () => import('./modules/doctor/patient-analytics/patient-analytics.component').then(m => m.PatientAnalyticsComponent)
      },
      {
        path: 'habits',
        loadComponent: () => import('./modules/doctor/habits/doctor-habits.component').then(m => m.DoctorHabitsComponent)
      },
      {
        path: 'statistics',
        loadComponent: () => import('./modules/doctor/statistics/doctor-statistics.component').then(m => m.DoctorStatisticsComponent)
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
        path: 'routines',
        loadComponent: () => import('./modules/admin/routines/admin-routines.component').then(m => m.AdminRoutinesComponent)
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
      },
      {
        path: 'medical/camera-provisioning',
        loadComponent: () => import('./modules/admin/camera-provisioning/admin-camera-provisioning.component')
          .then(m => m.AdminCameraProvisioningComponent)
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
    path: 'alerts',
    canActivate: [AuthGuard],
    loadComponent: () => import('./modules/alerts/alert-list/alert-list.component').then(m => m.AlertListComponent)
  },
  {
    path: '**',
    redirectTo: '/landing'
  }
];
