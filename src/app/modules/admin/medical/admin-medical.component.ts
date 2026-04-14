import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { forkJoin, of, Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { MedicalFollowupService } from '../../../core/services/medical-followup.service';
import { SafetyAlertService } from '../../../core/services/safety-alert.service';
import { PatientService, PatientProfileResponse } from '../../../core/services/patient.service';
import { CareTeamService } from '../../../core/services/care-team.service';
import { CameraDeviceService } from '../../../core/services/camera-device.service';

interface MedicalModule {
  id: number;
  name: string;
  description: string;
  icon: string;
  count: number;
  status: 'active' | 'maintenance' | 'warning';
  lastUpdated: string;
  route?: string;
}

interface MedicalStat {
  label: string;
  value: number;
  icon: string;
  color: string;
  trend: string;
}

interface MedicalActivity {
  action: string;
  user: string;
  patient: string;
  time: string;
  icon: string;
  color: string;
}

@Component({
  selector: 'app-admin-medical',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './admin-medical.component.html',
  styleUrls: ['./admin-medical.component.scss']
})
export class AdminMedicalComponent implements OnInit {
  currentDate = new Date();
  loading = false;

  medicalStats: MedicalStat[] = [
    { label: 'Active Prescriptions', value: 0, icon: '💊', color: 'violet', trend: '—' },
    { label: 'Appointments Today', value: 0, icon: '📅', color: 'blue', trend: '—' },
    { label: 'Behavior Incidents', value: 0, icon: '📊', color: 'amber', trend: '—' },
    { label: 'Active Alerts', value: 0, icon: '🔔', color: 'rose', trend: '—' }
  ];

  medicalModules: MedicalModule[] = [
    {
      id: 1,
      name: 'Medication & Reminders',
      description: 'Drug inventory, schedules & adherence tracking',
      icon: '💊',
      count: 0,
      status: 'active',
      lastUpdated: '—',
      route: '/admin/schedules'
    },
    {
      id: 11,
      name: 'Camera Devices',
      description: 'Manage ESP32 cameras for patient monitoring',
      icon: '📹',
      count: 0,
      status: 'active',
      lastUpdated: '—',
      route: '/admin/medical/cameras'
    },
    {
      id: 2,
      name: 'Appointments',
      description: 'Scheduling & calendar management',
      icon: '📅',
      count: 0,
      status: 'active',
      lastUpdated: '—'
    },
    {
      id: 3,
      name: 'Behavior Monitoring',
      description: 'Pattern tracking & incident reports',
      icon: '📊',
      count: 0,
      status: 'active',
      lastUpdated: '—'
    },
    {
      id: 4,
      name: 'Alert System',
      description: 'Critical alerts & escalation rules',
      icon: '🔔',
      count: 0,
      status: 'active',
      lastUpdated: '—'
    },
    {
      id: 6,
      name: 'Doctor Workflows',
      description: 'Prescriptions & consultations',
      icon: '👨‍⚕️',
      count: 0,
      status: 'active',
      lastUpdated: '—'
    },
    {
      id: 10,
      name: 'Patient Profiles',
      description: 'Demographics & medical history',
      icon: '🏥',
      count: 0,
      status: 'active',
      lastUpdated: '—'
    }
  ];

  recentActivities: MedicalActivity[] = [];

  constructor(
    private medicalService: MedicalFollowupService,
    private safetyAlertService: SafetyAlertService,
    private patientService: PatientService,
    private careTeamService: CareTeamService,
    private cameraService: CameraDeviceService
  ) {}

  ngOnInit(): void {
    this.loadMedicalData();
  }

  private loadMedicalData(): void {
    this.loading = true;
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
    const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59).toISOString();
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

    forkJoin({
      medicationPlans: this.medicalService.getAllMedicationPlans().pipe(catchError(() => of([]))),
      pendingValidations: this.safetyAlertService.getPendingValidations().pipe(catchError(() => of([]))),
      activeAlerts: this.safetyAlertService.getActiveAlerts().pipe(catchError(() => of([]))),
      patients: this.patientService.getPatients().pipe(catchError(() => of([]))),
      doctorAssignments: this.careTeamService.getAllDoctorAssignments().pipe(catchError(() => of([])))
    }).subscribe(({ medicationPlans, pendingValidations, activeAlerts, patients, doctorAssignments }) => {
      const activePrescriptions = medicationPlans.filter(p => p.status === 'ACTIVE').length;
      const behaviorCount = pendingValidations.length;
      const alertCount = activeAlerts.length;
      const criticalAlerts = activeAlerts.filter(a => a.severity === 'CRITICAL' || a.severity === 'HIGH').length;

      const patientMap = new Map<string, string>();
      patients.forEach(p => patientMap.set(p.id, `${p.firstName} ${p.lastName}`));

      this.medicalStats = [
        { label: 'Active Prescriptions', value: activePrescriptions, icon: '💊', color: 'violet', trend: activePrescriptions > 0 ? 'Active plans' : 'No active plans' },
        { label: 'Appointments Today', value: 0, icon: '📅', color: 'blue', trend: 'Loading...' },
        { label: 'Behavior Incidents', value: behaviorCount, icon: '📊', color: 'amber', trend: behaviorCount > 0 ? 'Pending validation' : 'No pending incidents' },
        { label: 'Active Alerts', value: alertCount, icon: '🔔', color: 'rose', trend: criticalAlerts > 0 ? `${criticalAlerts} critical` : 'All clear' }
      ];

      this.medicalModules = this.medicalModules.map(m => {
        switch (m.id) {
          case 1:
            return { ...m, count: activePrescriptions, status: 'active', lastUpdated: 'Just now' };
          case 11:
            return { ...m, count: 0, status: 'active', lastUpdated: 'Loading...' };
          case 3:
            return { ...m, count: behaviorCount, status: behaviorCount > 0 ? 'warning' : 'active', lastUpdated: 'Just now' };
          case 4:
            return { ...m, count: alertCount, status: alertCount > 0 ? 'warning' : 'active', lastUpdated: 'Just now' };
          case 6:
            return { ...m, count: doctorAssignments.length, status: 'active', lastUpdated: 'Just now' };
          case 10:
            return { ...m, count: patients.length, status: 'active', lastUpdated: 'Just now' };
          default:
            return m;
        }
      });

      // Show page immediately — don't wait for slow camera/appointment calls
      this.loading = false;

      // Appointments require per-patient fetching because the backend requires doctorId/patientId/caregiverId
      const appointmentRequests: {
        appointmentsToday: Observable<any[]>;
        appointmentsRecent: Observable<any[]>;
      } = {
        appointmentsToday: this.medicalService.getAllAppointments(patients, todayStart, todayEnd).pipe(catchError(() => of([]))),
        appointmentsRecent: this.medicalService.getAllAppointments(patients, weekAgo, todayEnd).pipe(catchError(() => of([])))
      };

      forkJoin(appointmentRequests).subscribe(({ appointmentsToday, appointmentsRecent }) => {
        this.medicalStats = [
          { label: 'Active Prescriptions', value: activePrescriptions, icon: '💊', color: 'violet', trend: activePrescriptions > 0 ? 'Active plans' : 'No active plans' },
          { label: 'Appointments Today', value: appointmentsToday.length, icon: '📅', color: 'blue', trend: appointmentsToday.length > 0 ? 'Scheduled today' : 'No appointments today' },
          { label: 'Behavior Incidents', value: behaviorCount, icon: '📊', color: 'amber', trend: behaviorCount > 0 ? 'Pending validation' : 'No pending incidents' },
          { label: 'Active Alerts', value: alertCount, icon: '🔔', color: 'rose', trend: criticalAlerts > 0 ? `${criticalAlerts} critical` : 'All clear' }
        ];

        const appointmentsModule = this.medicalModules.find(m => m.id === 2);
        if (appointmentsModule) {
          appointmentsModule.count = appointmentsToday.length;
          appointmentsModule.lastUpdated = 'Just now';
        }

        this.recentActivities = this.buildRecentActivities(appointmentsRecent, pendingValidations, activeAlerts, patientMap);
      });

      // Load cameras in background without blocking the UI
      if (patients.length > 0) {
        forkJoin(
          patients.map(p => this.cameraService.getCamerasByPatient(p.id).pipe(catchError(() => of([]))))
        ).pipe(catchError(() => of([]))).subscribe(cameraLists => {
          const lists = Array.isArray(cameraLists) ? cameraLists : [];
          const totalCameras = lists.reduce((sum, list) => sum + (Array.isArray(list) ? list.length : 0), 0);
          const camModule = this.medicalModules.find(m => m.id === 11);
          if (camModule) {
            camModule.count = totalCameras;
            camModule.lastUpdated = 'Just now';
          }
        });
      }
    });
  }

  private buildRecentActivities(
    appointments: any[],
    behaviors: any[],
    alerts: any[],
    patientMap: Map<string, string>
  ): MedicalActivity[] {
    const activities: MedicalActivity[] = [];

    appointments
      .sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime())
      .slice(0, 3)
      .forEach(appt => {
        activities.push({
          action: appt.title || 'Appointment scheduled',
          user: 'Medical System',
          patient: patientMap.get(appt.patientId) || 'Unknown Patient',
          time: this.timeAgo(appt.dateTime),
          icon: '📅',
          color: 'blue'
        });
      });

    behaviors
      .sort((a, b) => new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime())
      .slice(0, 2)
      .forEach(log => {
        activities.push({
          action: `${log.behaviorType} incident logged`,
          user: 'Caregiver',
          patient: patientMap.get(log.patientId) || 'Unknown Patient',
          time: this.timeAgo(log.reportedAt),
          icon: '📊',
          color: 'amber'
        });
      });

    alerts
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 2)
      .forEach(alert => {
        activities.push({
          action: alert.message || 'Alert triggered',
          user: 'Safety System',
          patient: patientMap.get(alert.patientId) || 'Unknown Patient',
          time: this.timeAgo(alert.createdAt),
          icon: '🔔',
          color: 'rose'
        });
      });

    return activities
      .sort((a, b) => this.parseTimeAgo(a.time) - this.parseTimeAgo(b.time))
      .slice(0, 6);
  }

  private timeAgo(date: string | Date): string {
    const now = new Date().getTime();
    const then = new Date(date).getTime();
    const seconds = Math.floor((now - then) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  }

  private parseTimeAgo(timeAgo: string): number {
    if (timeAgo === 'Just now') return 0;
    const match = timeAgo.match(/(\d+)\s+(min|hour|day)/);
    if (!match) return Infinity;
    const value = parseInt(match[1], 10);
    const unit = match[2];
    if (unit === 'min') return value;
    if (unit === 'hour') return value * 60;
    return value * 60 * 24;
  }

  getStatusClass(status: string): string {
    const classes: Record<string, string> = {
      active: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      maintenance: 'bg-amber-100 text-amber-700 border-amber-200',
      warning: 'bg-rose-100 text-rose-700 border-rose-200'
    };
    return classes[status] || 'bg-gray-100 text-gray-700';
  }

  getModuleColor(id: number): string {
    const colors: Record<number, string> = {
      1: 'from-rose-500 to-pink-600',
      2: 'from-blue-500 to-indigo-600',
      3: 'from-amber-500 to-orange-600',
      4: 'from-red-500 to-rose-600',
      6: 'from-cyan-500 to-blue-600',
      10: 'from-violet-500 to-purple-600',
      11: 'from-fuchsia-500 to-purple-600'
    };
    return colors[id] || 'from-gray-500 to-gray-600';
  }
}
