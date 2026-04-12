import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { Subject, of } from 'rxjs';
import { takeUntil, catchError } from 'rxjs/operators';
import { FormsModule } from '@angular/forms';
import { SafetyAlertService } from '../../../../core/services/safety-alert.service';
import { PatientProfileResponse } from '../../../../core/services/patient.service';
import { ApiService } from '../../../../core/services/api.service';
import { AuthService } from '../../../../core/services/auth.service';
import { BehaviorLogResponse, BehaviorType, BehaviorSeverity } from '../../../../core/models/safety-alert.model';
import { CaregiverProfile, DoctorProfile } from '../../../../core/models/api.model';
import { CaregiverPatientContextService } from '../../../../core/services/caregiver-patient-context.service';
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
  viewMode: 'table' | 'timeline' = 'table';
  
  // Lightbox State
  lightboxOpen = false;
  lightboxCurrentIndex = 0;
  
  // Edit mode
  editMode = false;
  logToEdit: BehaviorLogResponse | null = null;

  // Delete confirmation
  showDeleteConfirm = false;
  logToDelete: BehaviorLogResponse | null = null;
  isDeleting = false;
  
  // Validation modal
  showValidationModal = false;
  behaviorToValidate: BehaviorLogResponse | null = null;
  validationAction: 'CONFIRM' | 'FALSE_ALARM' = 'CONFIRM';
  validationNotes = '';
  isValidating = false;
  
  // Reporter name cache
  reporterName: string = '';
  
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
  
  // Pagination
  currentPage = 1;
  pageSize = 10;
  pageSizeOptions = [5, 10, 25, 50, 100];
  
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
  
  // Caregiver info
  caregiverId = '';
  hasNoAssignedPatients = false;
  
  constructor(
    private route: ActivatedRoute,
    private safetyService: SafetyAlertService,
    private apiService: ApiService,
    private authService: AuthService,
    private caregiverPatientContext: CaregiverPatientContextService
  ) {}
  
  ngOnInit(): void {
    // Get current caregiver ID from auth service
    const currentUser = this.authService.getCurrentUser();
    if (currentUser) {
      this.caregiverId = currentUser.id;
    }
    
    this.route.params.pipe(
      takeUntil(this.destroy$)
    ).subscribe(params => {
      this.routePatientId = params['patientId'] || null;
      if (this.routePatientId) {
        this.filters.patientId = this.routePatientId;
      }
      this.loadMyPatients();
    });
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  /**
   * Load patients assigned to the current caregiver
   */
  loadMyPatients(): void {
    if (!this.caregiverId) {
      console.error('No caregiver ID available');
      this.patients = [];
      this.hasNoAssignedPatients = true;
      this.loadBehaviors();
      return;
    }
    
    this.isLoading = true;
    this.hasNoAssignedPatients = false;
    
    this.caregiverPatientContext.getAssignedPatients().pipe(
      takeUntil(this.destroy$),
      catchError(error => {
        console.error('Error loading caregiver patients:', error);
        return of([] as PatientProfileResponse[]);
      })
    ).subscribe({
      next: (patients) => {
        this.patients = patients;
        this.hasNoAssignedPatients = patients.length === 0;
        this.isLoading = false;
        this.loadBehaviors();
      },
      error: (err) => {
        console.error('Error in loadMyPatients:', err);
        this.patients = [];
        this.hasNoAssignedPatients = true;
        this.isLoading = false;
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
    this.currentPage = 1; // Reset to first page when filters change
  }
  
  // Pagination getters
  get paginatedBehaviors(): BehaviorLogResponse[] {
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    return this.filteredBehaviors.slice(start, end);
  }
  
  get totalPages(): number {
    return Math.ceil(this.filteredBehaviors.length / this.pageSize);
  }
  
  get startIndex(): number {
    return (this.currentPage - 1) * this.pageSize + 1;
  }
  
  get endIndex(): number {
    return Math.min(this.currentPage * this.pageSize, this.filteredBehaviors.length);
  }
  
  get paginationInfo(): string {
    if (this.filteredBehaviors.length === 0) return 'No results';
    return `${this.startIndex}-${this.endIndex} of ${this.filteredBehaviors.length}`;
  }
  
  // Pagination methods
  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }
  
  goToFirstPage(): void {
    this.currentPage = 1;
  }
  
  goToLastPage(): void {
    this.currentPage = this.totalPages;
  }
  
  goToPreviousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }
  
  goToNextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }
  
  onPageSizeChange(newSize: number): void {
    this.pageSize = newSize;
    this.currentPage = 1; // Reset to first page when page size changes
  }
  
  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxVisiblePages = 5;
    
    if (this.totalPages <= maxVisiblePages) {
      // Show all pages if total is small
      for (let i = 1; i <= this.totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Show pages around current page
      let startPage = Math.max(1, this.currentPage - Math.floor(maxVisiblePages / 2));
      let endPage = startPage + maxVisiblePages - 1;
      
      if (endPage > this.totalPages) {
        endPage = this.totalPages;
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
      }
      
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
    }
    
    return pages;
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
    this.currentPage = 1;
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
    // patientId from behavior logs is the profile id (not userId/Keycloak ID)
    const patient = this.patients.find(p => p.id === patientId || p.userId === patientId);
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
    this.reporterName = '';
    document.body.style.overflow = 'hidden';
    this.loadReporterName(behavior.reportedBy);
  }
  
  /**
   * Load reporter name from Identity Service
   */
  loadReporterName(userId: string | undefined): void {
    if (!userId) {
      this.reporterName = 'Unknown';
      return;
    }
    
    console.log('[BehaviorsPage] Loading reporter name for:', userId);
    
    // Try caregiver first
    this.apiService.getCaregiverByUserId(userId).subscribe({
      next: (caregiver: CaregiverProfile) => {
        console.log('[BehaviorsPage] Found caregiver:', caregiver.firstName, caregiver.lastName);
        this.reporterName = `${caregiver.firstName} ${caregiver.lastName}`;
      },
      error: (err) => {
        console.log('[BehaviorsPage] Caregiver not found, trying doctor...', err?.status);
        // Fallback to doctor
        this.apiService.getDoctorByUserId(userId).subscribe({
          next: (doctor: DoctorProfile) => {
            console.log('[BehaviorsPage] Found doctor:', doctor.firstName, doctor.lastName);
            this.reporterName = `${doctor.firstName} ${doctor.lastName}`;
          },
          error: (err2) => {
            console.error('[BehaviorsPage] Neither found:', err2?.status);
            this.reporterName = 'Unknown';
          }
        });
      }
    });
  }
  
  closeDetailModal(): void {
    this.showDetailModal = false;
    this.selectedBehavior = null;
    this.reporterName = '';
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
    this.editMode = false;
    this.logToEdit = null;
    this.loadBehaviors();
  }
  
  onFormCancelled(): void {
    this.showForm = false;
    this.editMode = false;
    this.logToEdit = null;
  }
  
  // Edit methods
  canEdit(log: BehaviorLogResponse): boolean {
    return log.source === 'MANUAL';
  }

  canDelete(log: BehaviorLogResponse): boolean {
    return log.source === 'MANUAL';
  }

  openEditForm(log: BehaviorLogResponse): void {
    this.logToEdit = log;
    this.editMode = true;
    this.showForm = true;
    // Close detail modal if open
    this.showDetailModal = false;
  }

  onEditComplete(): void {
    this.showForm = false;
    this.editMode = false;
    this.logToEdit = null;
    this.loadBehaviors();
  }
  
  // Delete methods
  confirmDelete(log: BehaviorLogResponse, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.logToDelete = log;
    this.showDeleteConfirm = true;
  }

  cancelDelete(): void {
    this.showDeleteConfirm = false;
    this.logToDelete = null;
  }

  deleteBehavior(): void {
    if (!this.logToDelete) return;
    
    this.isDeleting = true;
    this.safetyService.deleteBehaviorLog(this.logToDelete.id).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: () => {
        this.isDeleting = false;
        this.showDeleteConfirm = false;
        // Close detail modal if the deleted log was being viewed
        if (this.selectedBehavior?.id === this.logToDelete?.id) {
          this.closeDetailModal();
        }
        this.logToDelete = null;
        this.loadBehaviors();
      },
      error: (err) => {
        this.isDeleting = false;
        console.error('Error deleting behavior log:', err);
        alert('Failed to delete behavior log. Please try again.');
      }
    });
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
  
  // Timeline Methods
  setViewMode(mode: 'table' | 'timeline'): void {
    this.viewMode = mode;
  }
  
  /**
   * Group behaviors by date for timeline view
   */
  getTimelineGroups(): { date: string; label: string; behaviors: BehaviorLogResponse[] }[] {
    const groups = new Map<string, BehaviorLogResponse[]>();
    
    // Sort behaviors by timestamp (newest first)
    const sortedBehaviors = [...this.filteredBehaviors].sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    
    sortedBehaviors.forEach(behavior => {
      const dateKey = this.formatDateKey(behavior.timestamp);
      if (!groups.has(dateKey)) {
        groups.set(dateKey, []);
      }
      groups.get(dateKey)!.push(behavior);
    });
    
    // Convert to array with labels
    return Array.from(groups.entries()).map(([date, behaviors]) => ({
      date,
      label: this.formatTimelineDateLabel(date),
      behaviors
    }));
  }
  
  /**
   * Format date for grouping key (YYYY-MM-DD)
   */
  private formatDateKey(timestamp: string): string {
    const date = new Date(timestamp);
    return date.toISOString().split('T')[0];
  }
  
  /**
   * Format date label for timeline (Today, Yesterday, or date)
   */
  private formatTimelineDateLabel(dateKey: string): string {
    const date = new Date(dateKey);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Reset time for comparison
    today.setHours(0, 0, 0, 0);
    yesterday.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    
    if (date.getTime() === today.getTime()) {
      return 'Today';
    } else if (date.getTime() === yesterday.getTime()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric'
      });
    }
  }
  
  /**
   * Get severity color for timeline dots
   */
  getTimelineDotColor(severity: BehaviorSeverity): string {
    const numSeverity = this.severityToNumber(severity);
    if (numSeverity <= 2) return 'bg-emerald-500 border-emerald-200';
    if (numSeverity === 3) return 'bg-yellow-500 border-yellow-200';
    if (numSeverity === 4) return 'bg-orange-500 border-orange-200';
    return 'bg-red-500 border-red-200';
  }
  
  /**
   * Get timeline connector color based on severity
   */
  getTimelineConnectorColor(severity: BehaviorSeverity): string {
    const numSeverity = this.severityToNumber(severity);
    if (numSeverity <= 2) return 'bg-emerald-200';
    if (numSeverity === 3) return 'bg-yellow-200';
    if (numSeverity === 4) return 'bg-orange-200';
    return 'bg-red-200';
  }
  
  /**
   * Format time for timeline (e.g., "2:30 PM")
   */
  formatTimelineTime(timestamp: string): string {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
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

  /**
   * Check if behavior can be validated (only AUTO-detected with PENDING status)
   */
  canValidate(behavior: BehaviorLogResponse): boolean {
    return behavior.source === 'AUTO' && behavior.validationStatus === 'PENDING';
  }

  /**
   * Open validation modal for confirming behavior
   */
  confirmBehavior(behavior: BehaviorLogResponse, event?: Event): void {
    event?.stopPropagation();
    if (!this.canValidate(behavior)) return;

    this.behaviorToValidate = behavior;
    this.validationAction = 'CONFIRM';
    this.validationNotes = '';
    this.showValidationModal = true;
  }

  /**
   * Open validation modal for false alarm
   */
  markAsFalseAlarm(behavior: BehaviorLogResponse, event?: Event): void {
    event?.stopPropagation();
    if (!this.canValidate(behavior)) return;

    this.behaviorToValidate = behavior;
    this.validationAction = 'FALSE_ALARM';
    this.validationNotes = '';
    this.showValidationModal = true;
  }

  /**
   * Close validation modal
   */
  closeValidationModal(): void {
    this.showValidationModal = false;
    this.behaviorToValidate = null;
    this.validationNotes = '';
    this.isValidating = false;
  }

  /**
   * Submit validation with notes
   */
  submitValidation(): void {
    if (!this.behaviorToValidate) return;

    this.isValidating = true;
    
    const request = {
      validationStatus: this.validationAction === 'CONFIRM' ? 'CONFIRMED' as const : 'FALSE_ALARM' as const,
      validatedBy: this.caregiverId,
      validationNotes: this.validationNotes.trim() || (this.validationAction === 'CONFIRM' ? 'Confirmed by caregiver' : 'Marked as false alarm by caregiver')
    };

    this.safetyService.validateBehavior(this.behaviorToValidate.id, request).subscribe({
      next: () => {
        this.isValidating = false;
        this.closeValidationModal();
        // Refresh the list
        this.loadBehaviors();
        // Close detail modal if open
        this.closeDetailModal();
      },
      error: (err) => {
        this.isValidating = false;
        console.error('Failed to validate behavior:', err);
        alert('Failed to validate behavior. Please try again.');
      }
    });
  }
  
  get sourceIcon(): string {
    if (!this.selectedBehavior) return '';
    return this.selectedBehavior.source === 'AUTO' ? '🤖' : '👤';
  }
  
  // Lightbox Methods
  
  /**
   * Get optimized image URL for display
   */
  getOptimizedImageUrl(url: string): string {
    // For now, return the URL as-is; can be enhanced with image optimization later
    return url;
  }
  
  /**
   * Open lightbox to view images
   */
  openLightbox(index: number): void {
    if (!this.selectedBehavior?.imageUrls?.length) return;
    this.lightboxCurrentIndex = index;
    this.lightboxOpen = true;
    document.body.style.overflow = 'hidden';
  }
  
  /**
   * Close lightbox
   */
  closeLightbox(): void {
    this.lightboxOpen = false;
    document.body.style.overflow = '';
  }
  
  /**
   * Go to next image in lightbox
   */
  nextImage(): void {
    if (!this.selectedBehavior?.imageUrls?.length) return;
    this.lightboxCurrentIndex = (this.lightboxCurrentIndex + 1) % this.selectedBehavior.imageUrls.length;
  }
  
  /**
   * Go to previous image in lightbox
   */
  previousImage(): void {
    if (!this.selectedBehavior?.imageUrls?.length) return;
    const count = this.selectedBehavior.imageUrls.length;
    this.lightboxCurrentIndex = (this.lightboxCurrentIndex - 1 + count) % count;
  }
  
  /**
   * Handle keyboard navigation in lightbox
   */
  onLightboxKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.closeLightbox();
    } else if (event.key === 'ArrowRight') {
      this.nextImage();
    } else if (event.key === 'ArrowLeft') {
      this.previousImage();
    }
  }
}
