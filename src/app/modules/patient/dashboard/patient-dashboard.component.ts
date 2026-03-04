import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { Router } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { DataService } from '../../../core/services/data.service';
import { AlertCardComponent } from '../../../shared/components/alert-card.component';
import { NotificationBellComponent } from '../../../shared/components/notification-bell/notification-bell.component';
import { RoleTheme } from '../../../shared/components/navbar.component';
import { HealthMetric } from '../../../core/models/user.model';
import { HealthRecord, HealthRecordCreateRequest, RecordType } from '../../../core/models/api.model';

interface AssessmentStatusItem {
  id: string;
  dueDate: Date;
  dueDateLabel: string;
  isDue: boolean;
  daysLeft: number;
}

@Component({
  selector: 'app-patient-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, AlertCardComponent, NotificationBellComponent],
  templateUrl: './patient-dashboard.component.html',
  styleUrls: ['./patient-dashboard.component.scss']
})
export class PatientDashboardComponent implements OnInit {
  patientName = '';
  
  // Role theme for notification bell (teal for patient)
  currentTheme: RoleTheme = {
    name: 'Patient',
    primary: '#14b8a6',
    primaryLight: '#f0fdfa',
    primaryDark: '#0f766e',
    gradientFrom: '#14b8a6',
    gradientTo: '#0d9488',
    borderColor: '#ccfbf1',
    hoverBg: '#ccfbf1',
    activeBg: '#14b8a6',
    activeText: '#ffffff'
  };
  appointments: any[] = [];
  medications: any[] = [];
  todayTasks: any[] = [];
  healthMetrics: HealthMetric[] = [];
  completedTasksCount = 0;

  showCheckInModal = false;
  checkInStepIndex = 0;
  checkInSubmitting = false;
  checkInError = '';
  checkInTouchStartX = 0;
  checkInAnswers: { mood: number | null; sleep: number | null; appetite: number | null } = {
    mood: null,
    sleep: null,
    appetite: null
  };

  assessmentItems: AssessmentStatusItem[] = [];
  isLoadingAssessment = false;

  assessmentSubmittedMessage = '';
  assessmentSubmittedDueDate = '';

  constructor(
    private authService: AuthService,
    private dataService: DataService,
    private apiService: ApiService,
    private router: Router
  ) {}

  ngOnInit(): void {
    const currentUser = this.authService.getCurrentUser();
    
    if (currentUser) {
      this.patientName = currentUser.name;
      
      // Get patient data (assuming patient 1 for demo)
      const patient = this.dataService.getPatients()[0];
      if (patient) {
        this.medications = patient.currentMedications;
        this.appointments = this.dataService.getAppointments(patient.id);
        this.todayTasks = this.dataService.getTasks(patient.id).filter(t => {
          const today = new Date();
          const taskDate = new Date(t.dueDate);
          return taskDate.toDateString() === today.toDateString();
        });
        this.healthMetrics = this.dataService.getHealthMetrics(patient.id);
      }
    }

    this.loadCheckInStatus();
    this.loadAssessmentStatus();

    const navState = history.state as { assessmentSubmitted?: boolean; nextDueDate?: string };
    if (navState?.assessmentSubmitted) {
      this.assessmentSubmittedMessage = 'Assessment submitted successfully.';
      this.assessmentSubmittedDueDate = navState.nextDueDate || '';
    }
  }

  toggleTask(taskId: string): void {
    const task = this.todayTasks.find(t => t.id === taskId);
    if (task) {
      task.completed = !task.completed;
      this.dataService.updateTaskStatus(taskId, task.completed);
      this.updateCompletedCount();
    }
  }

  getProgressPercentage(): number {
    if (this.todayTasks.length === 0) return 0;
    return (this.completedTasksCount / this.todayTasks.length) * 100;
  }

  private updateCompletedCount(): void {
    this.completedTasksCount = this.todayTasks.filter(t => t.completed).length;
  }

  getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning! 🌅 Hope you had a good sleep.';
    if (hour < 17) return 'Good afternoon! ☀️ Keep taking care of yourself.';
    return 'Good evening! 🌙 Relax and enjoy your evening.';
  }

  // ==================== Daily Check-In ==================== 

  loadCheckInStatus(): void {
    const patientId = this.authService.getCurrentUser()?.id;
    if (!patientId) return;

    this.apiService.getHealthRecords(patientId, undefined, RecordType.DAILY_CHECKIN).subscribe({
      next: (records) => {
        const latest = this.getLatestRecord(records);
        const now = Date.now();
        const lastTime = latest?.completedAt
          ? new Date(latest.completedAt).getTime()
          : latest?.date
            ? new Date(latest.date).getTime()
            : 0;

        const diffHours = lastTime ? (now - lastTime) / (1000 * 60 * 60) : 999;
        this.showCheckInModal = diffHours >= 24;
      },
      error: () => {
        // If API fails, still allow check-in so the user can proceed
        this.showCheckInModal = true;
      }
    });
  }

  handleCheckInTouchStart(event: TouchEvent): void {
    this.checkInTouchStartX = event.touches[0].clientX;
  }

  handleCheckInTouchEnd(event: TouchEvent): void {
    const endX = event.changedTouches[0].clientX;
    const deltaX = endX - this.checkInTouchStartX;
    if (Math.abs(deltaX) < 40) return;
    if (deltaX < 0) {
      this.nextCheckInStep();
    } else {
      this.prevCheckInStep();
    }
  }

  nextCheckInStep(): void {
    if (this.checkInStepIndex < 2) {
      this.checkInStepIndex += 1;
      return;
    }
    this.submitDailyCheckIn();
  }

  prevCheckInStep(): void {
    if (this.checkInStepIndex > 0) {
      this.checkInStepIndex -= 1;
    }
  }

  setCheckInAnswer(field: 'mood' | 'sleep' | 'appetite', value: number): void {
    this.checkInAnswers[field] = value;
  }

  autoAdvance(): void {
    if (this.checkInStepIndex < 2) {
      setTimeout(() => {
        this.nextCheckInStep();
      }, 400);
    }
  }

  submitDailyCheckIn(): void {
    const patientId = this.authService.getCurrentUser()?.id;
    if (!patientId || this.checkInSubmitting) return;

    this.checkInSubmitting = true;
    this.checkInError = '';

    const today = new Date();
    const request: HealthRecordCreateRequest = {
      patientId,
      recordType: RecordType.DAILY_CHECKIN,
      date: today.toISOString().slice(0, 10),
      completedAt: today.toISOString(),
      mood: this.checkInAnswers.mood ?? undefined,
      sleep: this.checkInAnswers.sleep ?? undefined,
      appetite: this.checkInAnswers.appetite ?? undefined,
      checkInFrequencyHours: 24,
      isActive: true
    };

    this.apiService.createHealthRecord(request).subscribe({
      next: () => {
        this.checkInSubmitting = false;
        this.showCheckInModal = false;
        this.checkInStepIndex = 0;
      },
      error: () => {
        this.checkInSubmitting = false;
        this.checkInError = 'Failed to save your check-in. Please try again.';
      }
    });
  }

  // ==================== Assessment Status ====================

  loadAssessmentStatus(): void {
    const patientId = this.authService.getCurrentUser()?.id;
    if (!patientId) return;

    this.isLoadingAssessment = true;
    this.apiService.getHealthRecords(patientId, undefined, RecordType.ASSESSMENT).subscribe({
      next: (records) => {
        const schedules = records.filter(record =>
          record.isActive === true && !record.completedAt
        );
        if (!schedules.length) {
          this.assessmentItems = [];
        } else {
          const todayStart = this.startOfDay(new Date());
          const items = schedules
            .map((record) => {
              const dueDate = this.parseDateOnly(record.nextDueDate || record.date);
              const diffMs = dueDate.getTime() - todayStart.getTime();
              const daysLeft = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
              return {
                id: record.id,
                dueDate,
                dueDateLabel: record.nextDueDate || record.date,
                isDue: diffMs <= 0,
                daysLeft
              } as AssessmentStatusItem;
            })
            .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

          this.assessmentItems = items;
        }
        this.isLoadingAssessment = false;
      },
      error: () => {
        this.assessmentItems = [];
        this.isLoadingAssessment = false;
      }
    });
  }

  private getLatestRecord(records: HealthRecord[]): HealthRecord | null {
    if (!records.length) return null;
    return records
      .slice()
      .sort((a, b) => {
        const aDate = a.completedAt || a.nextDueDate || a.date;
        const bDate = b.completedAt || b.nextDueDate || b.date;
        return new Date(bDate).getTime() - new Date(aDate).getTime();
      })[0];
  }

  private parseDateOnly(dateValue: string): Date {
    if (dateValue.length === 10) {
      return new Date(`${dateValue}T00:00:00`);
    }
    return new Date(dateValue);
  }

  private startOfDay(date: Date): Date {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    return start;
  }
}
