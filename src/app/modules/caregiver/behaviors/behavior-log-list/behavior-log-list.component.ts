import { Component, Input, OnInit, OnChanges, SimpleChanges, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SafetyAlertService } from '../../../../core/services/safety-alert.service';
import { BehaviorLogResponse } from '../../../../core/models/safety-alert.model';
import { ImageUploadService } from '../../../../core/services/image-upload.service';
import { ApiService } from '../../../../core/services/api.service';
import { CaregiverProfile, DoctorProfile } from '../../../../core/models/api.model';

@Component({
  selector: 'app-behavior-log-list',
  templateUrl: './behavior-log-list.component.html',
  styleUrls: ['./behavior-log-list.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterModule]
})
export class BehaviorLogListComponent implements OnInit, OnChanges {
  @Input() patientId!: string;
  
  // Outputs for communicating with parent
  @Output() editLog = new EventEmitter<BehaviorLogResponse>();
  @Output() deleteLog = new EventEmitter<BehaviorLogResponse>();
  
  behaviorLogs: BehaviorLogResponse[] = [];
  isLoading = false;
  
  // Lightbox state
  lightboxOpen = false;
  lightboxImages: string[] = [];
  lightboxCurrentIndex = 0;
  
  // Track which log is being deleted for loading state
  logBeingDeleted: string | null = null;
  // Confirmation dialog state
  showDeleteConfirm = false;
  logToDelete: BehaviorLogResponse | null = null;
  
  // Reporter name cache (userId -> name)
  reporterNames: Map<string, string> = new Map();
  
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
  
  constructor(
    private safetyService: SafetyAlertService,
    private imageUploadService: ImageUploadService,
    private apiService: ApiService
  ) {}
  
  ngOnInit(): void {
    console.log('[BehaviorLogList] ngOnInit - patientId:', this.patientId);
    this.loadBehaviorLogs();
  }

  ngOnChanges(changes: SimpleChanges): void {
    console.log('[BehaviorLogList] ngOnChanges:', changes);
    if (changes['patientId'] && !changes['patientId'].firstChange) {
      console.log('[BehaviorLogList] patientId changed, reloading...');
      this.loadBehaviorLogs();
    }
  }
  
  loadBehaviorLogs(): void {
    console.log('[BehaviorLogList] loadBehaviorLogs called for patient:', this.patientId);
    if (!this.patientId) {
      console.warn('[BehaviorLogList] No patientId provided!');
      return;
    }
    this.isLoading = true;
    this.safetyService.getBehaviorLogsByPatient(this.patientId).subscribe({
      next: (logs) => {
        console.log('[BehaviorLogList] Loaded', logs.length, 'logs');
        this.behaviorLogs = logs.sort((a, b) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        this.loadReporterNames(this.behaviorLogs);
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading behavior logs:', err);
        this.isLoading = false;
      }
    });
  }

  /**
   * Load reporter names for all unique reportedBy IDs
   * Tries caregiver first, then falls back to doctor
   */
  loadReporterNames(logs: BehaviorLogResponse[]): void {
    console.log('[BehaviorLogList] loadReporterNames called with', logs.length, 'logs');
    const uniqueReporterIds = [...new Set(logs
      .filter(log => log.reportedBy)
      .map(log => log.reportedBy!)
    )];
    
    console.log('[BehaviorLogList] Unique reporter IDs:', uniqueReporterIds);
    
    if (uniqueReporterIds.length === 0) {
      console.log('[BehaviorLogList] No reporter IDs found in logs');
      return;
    }

    uniqueReporterIds.forEach(id => {
      // Try caregiver first
      this.apiService.getCaregiverByUserId(id).subscribe({
        next: (caregiver: CaregiverProfile) => {
          console.log(`[BehaviorLogList] Found caregiver for ${id}:`, caregiver.firstName, caregiver.lastName);
          this.reporterNames.set(id, `${caregiver.firstName} ${caregiver.lastName}`);
        },
        error: (err) => {
          console.log(`[BehaviorLogList] Caregiver not found for ${id}, trying doctor...`, err.status);
          // Fallback to doctor
          this.apiService.getDoctorByUserId(id).subscribe({
            next: (doctor: DoctorProfile) => {
              console.log(`[BehaviorLogList] Found doctor for ${id}:`, doctor.firstName, doctor.lastName);
              this.reporterNames.set(id, `${doctor.firstName} ${doctor.lastName}`);
            },
            error: (err2) => {
              console.error(`[BehaviorLogList] Neither caregiver nor doctor found for ${id}:`, err2.status);
              // Both failed, mark as unknown
              this.reporterNames.set(id, 'Unknown');
            }
          });
        }
      });
    });
  }

  /**
   * Get reporter name for a behavior log
   */
  getReporterName(log: BehaviorLogResponse): string {
    if (!log.reportedBy) {
      return '—';
    }
    return this.reporterNames.get(log.reportedBy) || 'Loading...';
  }
  
  getSeverityColor(severity: number): string {
    if (severity <= 2) return 'bg-emerald-100 text-emerald-800';
    if (severity <= 3) return 'bg-yellow-100 text-yellow-800';
    if (severity <= 4) return 'bg-orange-100 text-orange-800';
    return 'bg-red-100 text-red-800';
  }

  /**
   * Check if a behavior log has images
   */
  hasImages(log: BehaviorLogResponse): boolean {
    return log.imageUrls && log.imageUrls.length > 0;
  }

  /**
   * Get thumbnail URL for an image
   */
  getThumbnailUrl(url: string): string {
    return this.imageUploadService.getThumbnailUrl(url, 60);
  }

  /**
   * Get optimized image URL for lightbox
   */
  getLightboxImageUrl(url: string): string {
    return this.imageUploadService.getOptimizedUrl(url, 1200, 800);
  }

  /**
   * Open lightbox to view images
   */
  openLightbox(images: string[], startIndex: number = 0): void {
    this.lightboxImages = images;
    this.lightboxCurrentIndex = startIndex;
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
    this.lightboxCurrentIndex = (this.lightboxCurrentIndex + 1) % this.lightboxImages.length;
  }

  /**
   * Go to previous image in lightbox
   */
  previousImage(): void {
    this.lightboxCurrentIndex = (this.lightboxCurrentIndex - 1 + this.lightboxImages.length) % this.lightboxImages.length;
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

  /**
   * Check if a behavior log can be edited (only MANUAL source logs)
   */
  canEdit(log: BehaviorLogResponse): boolean {
    return log.source === 'MANUAL';
  }

  /**
   * Check if a behavior log can be deleted (only MANUAL source logs)
   */
  canDelete(log: BehaviorLogResponse): boolean {
    return log.source === 'MANUAL';
  }

  /**
   * Open delete confirmation dialog
   */
  confirmDelete(log: BehaviorLogResponse): void {
    this.logToDelete = log;
    this.showDeleteConfirm = true;
  }

  /**
   * Cancel delete
   */
  cancelDelete(): void {
    this.showDeleteConfirm = false;
    this.logToDelete = null;
  }

  /**
   * Confirm and emit delete event
   */
  confirmDeleteAction(): void {
    if (this.logToDelete) {
      this.deleteLog.emit(this.logToDelete);
      this.showDeleteConfirm = false;
      this.logToDelete = null;
    }
  }

  /**
   * Emit edit event
   */
  onEdit(log: BehaviorLogResponse): void {
    this.editLog.emit(log);
  }
}
