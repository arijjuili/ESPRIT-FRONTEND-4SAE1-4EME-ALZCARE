import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth.service';
import { DataService } from '../../../core/services/data.service';
import { SafetyAlertService } from '../../../core/services/safety-alert.service';
import { PatientService, PatientProfileResponse } from '../../../core/services/patient.service';
import { StatCardComponent } from '../../../shared/components/stat-card.component';
import { AlertCardComponent } from '../../../shared/components/alert-card.component';
import { BehaviorLogFormComponent } from '../../../shared/components/behavior-log-form.component';
import { NotificationBellComponent } from '../../../shared/components/notification-bell/notification-bell.component';
import { RoleTheme } from '../../../shared/components/navbar.component';
import { CareTask } from '../../../core/models/user.model';
import { BehaviorLogResponse, BehaviorSeverity } from '../../../core/models/safety-alert.model';

@Component({
  selector: 'app-caregiver-dashboard',
  standalone: true,
  imports: [CommonModule, StatCardComponent, AlertCardComponent, BehaviorLogFormComponent, NotificationBellComponent],
  templateUrl: './caregiver-dashboard.component.html',
  styleUrls: ['./caregiver-dashboard.component.scss']
})
export class CaregiverDashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  caregiverName = '';
  
  // Role theme for notification bell (emerald for caregiver)
  currentTheme: RoleTheme = {
    name: 'Caregiver',
    primary: '#10b981',
    primaryLight: '#ecfdf5',
    primaryDark: '#047857',
    gradientFrom: '#10b981',
    gradientTo: '#059669',
    borderColor: '#d1fae5',
    hoverBg: '#d1fae5',
    activeBg: '#10b981',
    activeText: '#ffffff'
  };
  caregiverId = '';
  patients: PatientProfileResponse[] = [];
  allTasks: CareTask[] = [];
  
  // Behavior tracking
  showBehaviorLogModal = false;
  recentBehaviors: BehaviorLogResponse[] = [];
  isLoadingBehaviors = false;
  selectedPatientId = '';

  constructor(
    private authService: AuthService, 
    private dataService: DataService,
    private safetyAlertService: SafetyAlertService,
    private patientService: PatientService,
    private router: Router
  ) {}

  ngOnInit(): void {
    const currentUser = this.authService.getCurrentUser();
    
    if (currentUser) {
      this.caregiverName = currentUser.name;
      this.caregiverId = currentUser.id;
      
      // Get tasks assigned to this caregiver (still from mock for now)
      this.allTasks = this.dataService.getTasksForCaregiver(currentUser.id);
      
      // Load real patients from backend
      this.loadRealPatients();
    }
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadRealPatients(): void {
    this.patientService.getPatients().pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (patients) => {
        this.patients = patients;
        // Load behaviors after patients are loaded
        this.loadRecentBehaviors();
      },
      error: (err) => {
        console.error('Failed to load patients:', err);
        // Fallback to empty array if API fails
        this.patients = [];
        this.loadRecentBehaviors();
      }
    });
  }

  toggleTask(taskId: string): void {
    const task = this.allTasks.find(t => t.id === taskId);
    if (task) {
      task.completed = !task.completed;
      this.dataService.updateTaskStatus(taskId, task.completed);
    }
  }

  getPatientName(patientId: string): string {
    const patient = this.patients.find(p => p.id === patientId);
    return patient ? `${patient.firstName} ${patient.lastName}` : 'Unknown';
  }

  // ==================== Behavior Tracking ====================

  openBehaviorLogModal(patientId: string = ''): void {
    this.selectedPatientId = patientId;
    this.showBehaviorLogModal = true;
  }

  closeBehaviorLogModal(): void {
    this.showBehaviorLogModal = false;
    this.selectedPatientId = '';
  }

  onBehaviorLogged(): void {
    // Refresh the recent behaviors list after a new behavior is logged
    this.loadRecentBehaviors();
  }

  loadRecentBehaviors(): void {
    if (this.patients.length === 0) {
      this.recentBehaviors = [];
      return;
    }

    this.isLoadingBehaviors = true;
    this.recentBehaviors = [];

    // Load behaviors for all patients and combine them
    let completedRequests = 0;
    const allBehaviors: BehaviorLogResponse[] = [];

    this.patients.forEach(patient => {
      this.safetyAlertService.getBehaviorLogsByPatient(patient.id).pipe(
        takeUntil(this.destroy$)
      ).subscribe({
        next: (behaviors) => {
          allBehaviors.push(...behaviors);
          completedRequests++;
          
          if (completedRequests === this.patients.length) {
            // Sort by timestamp (newest first) and take last 5
            this.recentBehaviors = allBehaviors
              .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
              .slice(0, 5);
            this.isLoadingBehaviors = false;
          }
        },
        error: () => {
          completedRequests++;
          if (completedRequests === this.patients.length) {
            this.recentBehaviors = allBehaviors
              .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
              .slice(0, 5);
            this.isLoadingBehaviors = false;
          }
        }
      });
    });
  }

  getBehaviorTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      'FALL': 'Fall',
      'WANDERING': 'Wandering',
      'AGITATION': 'Agitation',
      'SLEEP_DISORDER': 'Sleep Disorder',
      'HALLUCINATION': 'Hallucination',
      'CONFUSION': 'Confusion',
      'AGGRESSION': 'Aggression',
      'MEDICATION_REFUSAL': 'Medication Refusal',
      'OTHER': 'Other'
    };
    return labels[type] || type;
  }

  getBehaviorIcon(type: string): string {
    const icons: Record<string, string> = {
      'FALL': '💥',
      'WANDERING': '🚶',
      'AGITATION': '😰',
      'SLEEP_DISORDER': '😴',
      'HALLUCINATION': '👁️',
      'CONFUSION': '😕',
      'AGGRESSION': '😠',
      'MEDICATION_REFUSAL': '💊',
      'OTHER': '📝'
    };
    return icons[type] || '📝';
  }

  severityToNumber(severity: BehaviorSeverity): number {
    const map: Record<BehaviorSeverity, number> = {
      'ONE': 1, 'TWO': 2, 'THREE': 3, 'FOUR': 4, 'FIVE': 5
    };
    return map[severity] || 1;
  }

  getSeverityColor(severity: BehaviorSeverity): string {
    const num = this.severityToNumber(severity);
    switch (num) {
      case 1: return 'border-green-400 bg-green-50';
      case 2: return 'border-emerald-400 bg-emerald-50';
      case 3: return 'border-yellow-400 bg-yellow-50';
      case 4: return 'border-orange-400 bg-orange-50';
      case 5: return 'border-red-400 bg-red-50';
      default: return 'border-gray-400 bg-gray-50';
    }
  }

  getSeverityLabel(severity: BehaviorSeverity): string {
    const num = this.severityToNumber(severity);
    const labels: Record<number, string> = {
      1: 'Mild', 2: 'Low', 3: 'Moderate', 4: 'High', 5: 'Severe'
    };
    return labels[num] || 'Unknown';
  }

  formatTimeAgo(timestamp: string): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  }

  viewAllBehaviors(): void {
    // Navigate to behaviors page
    this.router.navigate(['/caregiver/behaviors']);
  }
}
