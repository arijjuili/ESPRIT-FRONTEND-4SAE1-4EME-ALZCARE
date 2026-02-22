import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SafetyAlertService } from '../../../../core/services/safety-alert.service';
import { BehaviorLogResponse } from '../../../../core/models/safety-alert.model';
import { ImageUploadService } from '../../../../core/services/image-upload.service';

@Component({
  selector: 'app-behavior-log-list',
  templateUrl: './behavior-log-list.component.html',
  styleUrls: ['./behavior-log-list.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterModule]
})
export class BehaviorLogListComponent implements OnInit {
  @Input() patientId!: string;
  
  behaviorLogs: BehaviorLogResponse[] = [];
  isLoading = false;
  
  // Lightbox state
  lightboxOpen = false;
  lightboxImages: string[] = [];
  lightboxCurrentIndex = 0;
  
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
    private imageUploadService: ImageUploadService
  ) {}
  
  ngOnInit(): void {
    this.loadBehaviorLogs();
  }
  
  loadBehaviorLogs(): void {
    this.isLoading = true;
    this.safetyService.getBehaviorLogsByPatient(this.patientId).subscribe({
      next: (logs) => {
        this.behaviorLogs = logs.sort((a, b) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading behavior logs:', err);
        this.isLoading = false;
      }
    });
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
}
