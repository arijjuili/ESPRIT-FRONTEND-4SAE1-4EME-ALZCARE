import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { FormsModule } from '@angular/forms';
import { SafetyAlertService } from '../../../../core/services/safety-alert.service';
import { PatientService, PatientProfileResponse } from '../../../../core/services/patient.service';
import { BehaviorLogResponse, BehaviorType, BehaviorSeverity } from '../../../../core/models/safety-alert.model';
import { BehaviorLogFormComponent } from '../behavior-log-form/behavior-log-form.component';

interface BehaviorFilters {
  patientId: string;
  severity: BehaviorSeverity | null;
  type: BehaviorType | '';
  dateFrom: string;
  dateTo: string;
  searchQuery: string;
}

@Component({
  selector: 'app-behaviors-page',
  templateUrl: './behaviors-page.component.html',
  styleUrls: ['./behaviors-page.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, BehaviorLogFormComponent]
})
export class BehaviorsPageComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  // Route param
  routePatientId: string | null = null;
  
  // Data
  allBehaviors: BehaviorLogResponse[] = [];
  filteredBehaviors: BehaviorLogResponse[] = [];
  patients: PatientProfileResponse[] = [];
  
  // UI State
  isLoading = false;
  showForm = false;
  showFilters = false;
  selectedBehavior: BehaviorLogResponse | null = null;
  showDetailModal = false;
  
  // Filters
  filters: BehaviorFilters = {
    patientId: '',
    severity: null,
    type: '',
    dateFrom: '',
    dateTo: '',
    searchQuery: ''
  };
  
  // Sorting
  sortField: 'timestamp' | 'severity' | 'type' | 'patientName' = 'timestamp';
  sortDirection: 'asc' | 'desc' = 'desc';
  
  // Enums and Constants
  behaviorTypes: BehaviorType[] = [
    'FALL', 'WANDERING', 'AGITATION', 'SLEEP_DISORDER', 
    'HALLUCINATION', 'CONFUSION', 'AGGRESSION', 'MEDICATION_REFUSAL', 'OTHER'
  ];
  
  behaviorTypeIcons: Record<string, string> = {
    'FALL': '💥',
    'WANDERING': '🚶',
    'AGITATION': '😤',
    'SLEEP_DISORDER': '😴',
    'HALLUCINATION': '👁️',
    'CONFUSION': '😵',
    'AGGRESSION': '😠',
    'MEDICATION_REFUSAL': '💊',
    'OTHER': '📝'
  };
  
  severityOptions = [
    { value: 'ONE' as BehaviorSeverity, label: '1 - Mild', color: 'bg-green-100 text-green-800' },
    { value: 'TWO' as BehaviorSeverity, label: '2 - Low', color: 'bg-emerald-100 text-emerald-800' },
    { value: 'THREE' as BehaviorSeverity, label: '3 - Moderate', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'FOUR' as BehaviorSeverity, label: '4 - High', color: 'bg-orange-100 text-orange-800' },
    { value: 'FIVE' as BehaviorSeverity, label: '5 - Severe', color: 'bg-red-100 text-red-800' }
  ];
  
  constructor(
    private route: ActivatedRoute,
    private safetyService: SafetyAlertService,
    private patientService: PatientService
  ) {}
  
  ngOnInit(): void {
    this.route.params.pipe(
      takeUntil(this.destroy$)
    ).subscribe(params => {
      this.routePatientId = params['patientId'] || null;
      if (this.routePatientId) {
        this.filters.patientId = this.routePatientId;
      }
      this.loadPatients();
    });
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  loadPatients(): void {
    this.patientService.getPatients().pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (patients) => {
        this.patients = patients;
        this.loadBehaviors();
      },
      error: (err) => {
        console.error('Error loading patients:', err);
        this.patients = [];
        this.loadBehaviors();
      }
    });
  }
  
  loadBehaviors(): void {
    this.isLoading = true;
    
    if (this.routePatientId) {
      // Load behaviors for specific patient
      this.safetyService.getBehaviorLogsByPatient(this.routePatientId).subscribe({
        next: (logs) => {
          this.allBehaviors = logs;
          this.applyFilters();
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Error loading behavior logs:', err);
          this.allBehaviors = [];
          this.applyFilters();
          this.isLoading = false;
        }
      });
    } else {
      // Load behaviors for all patients
      this.loadAllPatientsBehaviors();
    }
  }
  
  loadAllPatientsBehaviors(): void {
    if (this.patients.length === 0) {
      this.allBehaviors = [];
      this.applyFilters();
      this.isLoading = false;
      return;
    }
    
    const allBehaviors: BehaviorLogResponse[] = [];
    let completedRequests = 0;
    
    this.patients.forEach(patient => {
      this.safetyService.getBehaviorLogsByPatient(patient.id).pipe(
        takeUntil(this.destroy$)
      ).subscribe({
        next: (logs) => {
          allBehaviors.push(...logs);
          completedRequests++;
          if (completedRequests === this.patients.length) {
            this.allBehaviors = allBehaviors;
            this.applyFilters();
            this.isLoading = false;
          }
        },
        error: () => {
          completedRequests++;
          if (completedRequests === this.patients.length) {
            this.allBehaviors = allBehaviors;
            this.applyFilters();
            this.isLoading = false;
          }
        }
      });
    });
  }
  
  applyFilters(): void {
    let result = [...this.allBehaviors];
    
    // Filter by patient
    if (this.filters.patientId) {
      result = result.filter(b => b.patientId === this.filters.patientId);
    }
    
    // Filter by severity
    if (this.filters.severity !== null) {
      result = result.filter(b => b.severity === this.filters.severity);
    }
    
    // Filter by type
    if (this.filters.type) {
      result = result.filter(b => b.type === this.filters.type);
    }
    
    // Filter by date range
    if (this.filters.dateFrom) {
      const fromDate = new Date(this.filters.dateFrom);
      result = result.filter(b => new Date(b.timestamp) >= fromDate);
    }
    if (this.filters.dateTo) {
      const toDate = new Date(this.filters.dateTo);
      toDate.setHours(23, 59, 59);
      result = result.filter(b => new Date(b.timestamp) <= toDate);
    }
    
    // Filter by search query
    if (this.filters.searchQuery.trim()) {
      const query = this.filters.searchQuery.toLowerCase();
      result = result.filter(b => 
        b.type.toLowerCase().includes(query) ||
        b.description?.toLowerCase().includes(query) ||
        b.location?.toLowerCase().includes(query) ||
        this.getPatientName(b.patientId).toLowerCase().includes(query)
      );
    }
    
    // Apply sorting
    result.sort((a, b) => {
      let comparison = 0;
      
      switch (this.sortField) {
        case 'timestamp':
          comparison = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
          break;
        case 'severity':
          comparison = this.severityToNumber(a.severity) - this.severityToNumber(b.severity);
          break;
        case 'type':
          comparison = a.type.localeCompare(b.type);
          break;
        case 'patientName':
          comparison = this.getPatientName(a.patientId).localeCompare(this.getPatientName(b.patientId));
          break;
      }
      
      return this.sortDirection === 'asc' ? comparison : -comparison;
    });
    
    this.filteredBehaviors = result;
  }
  
  clearFilters(): void {
    this.filters = {
      patientId: this.routePatientId || '',
      severity: null,
      type: '',
      dateFrom: '',
      dateTo: '',
      searchQuery: ''
    };
    this.applyFilters();
  }
  
  hasActiveFilters(): boolean {
    return !!(
      (this.filters.patientId && !this.routePatientId) ||
      this.filters.severity !== null ||
      this.filters.type ||
      this.filters.dateFrom ||
      this.filters.dateTo ||
      this.filters.searchQuery
    );
  }
  
  setSort(field: 'timestamp' | 'severity' | 'type' | 'patientName'): void {
    if (this.sortField === field) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortDirection = 'desc';
    }
    this.applyFilters();
  }
  
  getSortIcon(field: string): string {
    if (this.sortField !== field) return '↕️';
    return this.sortDirection === 'asc' ? '↑' : '↓';
  }
  
  getPatientName(patientId: string): string {
    const patient = this.patients.find(p => p.id === patientId);
    return patient ? `${patient.firstName} ${patient.lastName}` : 'Unknown Patient';
  }
  
  severityToNumber(severity: BehaviorSeverity): number {
    const map: Record<BehaviorSeverity, number> = {
      'ONE': 1,
      'TWO': 2,
      'THREE': 3,
      'FOUR': 4,
      'FIVE': 5
    };
    return map[severity] || 1;
  }

  getSeverityColor(severity: BehaviorSeverity): string {
    const option = this.severityOptions.find(o => o.value === severity);
    return option?.color || 'bg-gray-100 text-gray-800';
  }
  
  getSeverityLabel(severity: BehaviorSeverity): string {
    const option = this.severityOptions.find(o => o.value === severity);
    return option?.label || severity;
  }
  
  getBehaviorTypeLabel(type: string): string {
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }
  
  formatDateTime(timestamp: string): string {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return this.formatDateTime(timestamp);
  }
  
  openDetailModal(behavior: BehaviorLogResponse): void {
    this.selectedBehavior = behavior;
    this.showDetailModal = true;
    document.body.style.overflow = 'hidden';
  }
  
  closeDetailModal(): void {
    this.showDetailModal = false;
    this.selectedBehavior = null;
    document.body.style.overflow = '';
  }
  
  toggleForm(): void {
    this.showForm = !this.showForm;
  }
  
  toggleFilters(): void {
    this.showFilters = !this.showFilters;
  }
  
  onFormSubmitted(): void {
    this.showForm = false;
    this.loadBehaviors();
  }
  
  onFormCancelled(): void {
    this.showForm = false;
  }
  
  get activeFiltersCount(): number {
    let count = 0;
    if (this.filters.patientId && !this.routePatientId) count++;
    if (this.filters.severity !== null) count++;
    if (this.filters.type) count++;
    if (this.filters.dateFrom) count++;
    if (this.filters.dateTo) count++;
    if (this.filters.searchQuery) count++;
    return count;
  }
  
  get validationStatusIcon(): string {
    if (!this.selectedBehavior) return '';
    switch (this.selectedBehavior.validationStatus) {
      case 'CONFIRMED': return '✅';
      case 'FALSE_ALARM': return '❌';
      case 'PENDING': return '⏳';
      default: return '❓';
    }
  }
  
  get sourceIcon(): string {
    if (!this.selectedBehavior) return '';
    return this.selectedBehavior.source === 'AUTO' ? '🤖' : '👤';
  }
}
