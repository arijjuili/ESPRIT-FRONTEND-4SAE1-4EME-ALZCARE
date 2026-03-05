import { Routes } from '@angular/router';

export const caregiverRoutes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./dashboard/caregiver-dashboard.component').then(m => m.CaregiverDashboardComponent)
  },
  {
    path: 'behaviors',
    loadComponent: () => import('./behaviors/behaviors-page/behaviors-page.component').then(m => m.BehaviorsPageComponent)
  },
  {
    path: 'behaviors/:patientId',
    loadComponent: () => import('./behaviors/behaviors-page/behaviors-page.component').then(m => m.BehaviorsPageComponent)
  },
  {
    path: 'patients',
    loadComponent: () => import('./patients/caregiver-patients.component').then(m => m.CaregiverPatientsComponent)
  },
  {
    path: 'tasks',
    loadComponent: () => import('./tasks/caregiver-tasks.component').then(m => m.CaregiverTasksComponent)
  },
  {
    path: 'handovers',
    loadComponent: () => import('./handovers/caregiver-handover.component').then(m => m.CaregiverHandoverComponent)
  }
];
