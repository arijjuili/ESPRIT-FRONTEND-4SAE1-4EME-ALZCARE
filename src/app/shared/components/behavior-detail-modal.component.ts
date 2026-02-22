/**
 * Behavior Detail Modal Component
 * 
 * Displays full details of a behavior log in a modal dialog.
 * Used by caregiver dashboard and behavior log list components.
 */

import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BehaviorLogResponse, BehaviorType, BehaviorSource, BehaviorValidationStatus } from '../../core/models/safety-alert.model';

@Component({
  selector: 'app-behavior-detail-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto" (click)="onBackdropClick($event)">
      <div class="bg-white rounded-xl shadow-2xl w-full max-w-2xl my-8 relative" (click)="$event.stopPropagation()" style="max-height: calc(100vh - 4rem); overflow-y: auto;">
        
        <!-- Header -->
        <div class="bg-emerald-600 px-6 py-4 rounded-t-xl flex justify-between items-center">
          <div class="flex items-center gap-3">
            <span class="text-3xl">{{ getBehaviorIcon(behavior.type) }}</span>
            <div>
              <h2 class="text-xl font-bold text-white">{{ getBehaviorTypeLabel(behavior.type) }}</h2>
              <p class="text-emerald-100 text-sm">Behavior Log Details</p>
            </div>
          </div>
          <button (click)="onClose()" class="text-white hover:text-emerald-100 text-3xl leading-none transition">&times;</button>
        </div>

        <!-- Content -->
        <div class="p-6 space-y-6">
          
          <!-- Top Section: Patient, Severity, Status -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <!-- Patient -->
            <div class="bg-gray-50 rounded-lg p-4">
              <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Patient</p>
              <p class="text-lg font-bold text-gray-900">{{ patientName }}</p>
            </div>
            
            <!-- Severity -->
            <div class="bg-gray-50 rounded-lg p-4">
              <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Severity</p>
              <span [class]="getSeverityBadgeClass(behavior.severity)" class="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold">
                {{ getSeverityLabel(behavior.severity) }}
              </span>
            </div>
            
            <!-- Source & Validation -->
            <div class="bg-gray-50 rounded-lg p-4">
              <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Source</p>
              <div class="flex items-center gap-2">
                <span [class]="getSourceBadgeClass(behavior.source)">
                  {{ getSourceLabel(behavior.source) }}
                </span>
              </div>
            </div>
          </div>

          <!-- Description Section -->
          <div *ngIf="behavior.description" class="border-l-4 border-emerald-500 pl-4 py-2">
            <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Description</p>
            <p class="text-gray-800 leading-relaxed">{{ behavior.description }}</p>
          </div>

          <!-- Details Grid -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <!-- Location -->
            <div *ngIf="behavior.location" class="flex items-start gap-3">
              <div class="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                <span class="text-lg">📍</span>
              </div>
              <div>
                <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Location</p>
                <p class="text-gray-900 font-medium">{{ behavior.location }}</p>
              </div>
            </div>

            <!-- Timestamp -->
            <div class="flex items-start gap-3">
              <div class="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                <span class="text-lg">🕐</span>
              </div>
              <div>
                <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Reported At</p>
                <p class="text-gray-900 font-medium">{{ formatDateTime(behavior.timestamp) }}</p>
              </div>
            </div>

            <!-- Reported By -->
            <div *ngIf="behavior.reportedBy" class="flex items-start gap-3">
              <div class="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                <span class="text-lg">👤</span>
              </div>
              <div>
                <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Reported By</p>
                <p class="text-gray-900 font-medium">Caregiver ID: {{ behavior.reportedBy }}</p>
              </div>
            </div>

            <!-- Validation Status -->
            <div class="flex items-start gap-3">
              <div class="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                <span class="text-lg">✓</span>
              </div>
              <div>
                <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Validation Status</p>
                <span [class]="getValidationBadgeClass(behavior.validationStatus)">
                  {{ getValidationLabel(behavior.validationStatus) }}
                </span>
              </div>
            </div>
          </div>

          <!-- Triggers -->
          <div *ngIf="behavior.triggers" class="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div class="flex items-start gap-3">
              <span class="text-xl">⚡</span>
              <div>
                <p class="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">Potential Triggers</p>
                <p class="text-amber-900">{{ behavior.triggers }}</p>
              </div>
            </div>
          </div>

          <!-- Witnesses -->
          <div *ngIf="behavior.witnesses" class="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div class="flex items-start gap-3">
              <span class="text-xl">👁️</span>
              <div>
                <p class="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1">Witnesses</p>
                <p class="text-blue-900">{{ behavior.witnesses }}</p>
              </div>
            </div>
          </div>

          <!-- Images -->
          <div *ngIf="behavior.imageUrls && behavior.imageUrls.length > 0">
            <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Attached Images</p>
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div *ngFor="let imageUrl of behavior.imageUrls; let i = index" class="relative group">
                <img [src]="imageUrl" alt="Behavior evidence" 
                     class="w-full h-32 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-90 transition"
                     (click)="openLightbox(i)">
                <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 rounded-lg transition flex items-center justify-center">
                  <span class="text-white opacity-0 group-hover:opacity-100 text-2xl">🔍</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Additional Info -->
          <div *ngIf="behavior.confidenceScore !== undefined || behavior.deviceId" 
               class="bg-gray-100 rounded-lg p-4 text-sm">
            <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">System Information</p>
            <div class="grid grid-cols-2 gap-2 text-gray-600">
              <p *ngIf="behavior.deviceId">Device ID: {{ behavior.deviceId }}</p>
              <p *ngIf="behavior.confidenceScore !== undefined">Confidence: {{ (behavior.confidenceScore * 100).toFixed(1) }}%</p>
              <p>Processed: {{ behavior.processedForAlert ? 'Yes' : 'No' }}</p>
              <p>Log ID: {{ behavior.id | slice:0:8 }}...</p>
            </div>
          </div>

          <!-- Validation Notes (if validated) -->
          <div *ngIf="behavior.validationNotes" class="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <p class="text-xs font-semibold text-purple-700 uppercase tracking-wide mb-1">Validation Notes</p>
            <p class="text-purple-900">{{ behavior.validationNotes }}</p>
            <p *ngIf="behavior.validatedBy" class="text-xs text-purple-600 mt-2">
              Validated by: {{ behavior.validatedBy }} 
              <span *ngIf="behavior.validatedAt">on {{ formatDateTime(behavior.validatedAt) }}</span>
            </p>
          </div>
        </div>

        <!-- Footer Actions -->
        <div class="px-6 py-4 bg-gray-50 rounded-b-xl border-t border-gray-200 flex flex-wrap gap-3 justify-between items-center">
          <button 
            type="button"
            (click)="onClose()"
            class="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 font-semibold transition">
            Close
          </button>
          
          <div class="flex gap-3">
            <button 
              type="button"
              (click)="onEdit()"
              class="px-6 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-semibold transition flex items-center gap-2">
              <span>✏️</span>
              Edit
            </button>
            <button 
              type="button"
              (click)="onDelete()"
              class="px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold transition flex items-center gap-2">
              <span>🗑️</span>
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Lightbox Modal -->
    <div 
      *ngIf="lightboxOpen"
      class="fixed inset-0 z-[200] flex items-center justify-center"
      (click)="closeLightbox()"
      (keydown)="onLightboxKeydown($event)"
      tabindex="0">
      
      <!-- Backdrop -->
      <div class="absolute inset-0 bg-black/90 transition-opacity"></div>
      
      <!-- Lightbox Content -->
      <div 
        class="relative z-10 w-full h-full flex flex-col"
        (click)="$event.stopPropagation()">
        
        <!-- Header -->
        <div class="flex items-center justify-between p-4 text-white">
          <span class="text-sm font-medium">
            {{ lightboxCurrentIndex + 1 }} / {{ behavior.imageUrls.length }}
          </span>
          <button
            type="button"
            class="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition"
            (click)="closeLightbox()"
            title="Close (Esc)">
            <span class="text-xl">×</span>
          </button>
        </div>

        <!-- Image Container -->
        <div class="flex-1 flex items-center justify-center p-4 relative">
          <!-- Previous Button -->
          <button
            *ngIf="behavior.imageUrls.length > 1"
            type="button"
            class="absolute left-4 w-12 h-12 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition"
            (click)="previousImage()"
            title="Previous (←)">
            <span class="text-xl">‹</span>
          </button>

          <!-- Image -->
          <img
            *ngIf="behavior.imageUrls.length > 0"
            [src]="behavior.imageUrls[lightboxCurrentIndex]"
            [alt]="'Image ' + (lightboxCurrentIndex + 1)"
            class="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
            (click)="$event.stopPropagation()" />

          <!-- Next Button -->
          <button
            *ngIf="behavior.imageUrls.length > 1"
            type="button"
            class="absolute right-4 w-12 h-12 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition"
            (click)="nextImage()"
            title="Next (→)">
            <span class="text-xl">›</span>
          </button>
        </div>

        <!-- Thumbnail Strip -->
        <div 
          *ngIf="behavior.imageUrls.length > 1"
          class="p-4 bg-black/50">
          <div class="flex justify-center gap-2 overflow-x-auto">
            <button
              *ngFor="let url of behavior.imageUrls; let i = index"
              type="button"
              class="w-16 h-16 rounded-lg overflow-hidden border-2 transition flex-shrink-0"
              [class.border-white]="i === lightboxCurrentIndex"
              [class.border-transparent]="i !== lightboxCurrentIndex"
              [class.opacity-100]="i === lightboxCurrentIndex"
              [class.opacity-50]="i !== lightboxCurrentIndex"
              (click)="lightboxCurrentIndex = i">
              <img 
                [src]="url" 
                [alt]="'Thumbnail ' + (i + 1)"
                class="w-full h-full object-cover" />
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [``]
})
export class BehaviorDetailModalComponent {
  @Input() behavior!: BehaviorLogResponse;
  @Input() patientName: string = 'Unknown Patient';
  
  @Output() close = new EventEmitter<void>();
  @Output() edit = new EventEmitter<BehaviorLogResponse>();
  @Output() delete = new EventEmitter<string>();

  // Lightbox state
  lightboxOpen = false;
  lightboxCurrentIndex = 0;

  // Behavior type icons mapping
  private behaviorTypeIcons: Record<BehaviorType, string> = {
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

  // Behavior type labels
  private behaviorTypeLabels: Record<BehaviorType, string> = {
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

  // Source labels
  private sourceLabels: Record<BehaviorSource, string> = {
    'MANUAL': 'Manual Entry',
    'AUTO': 'Auto-Detected'
  };

  // Validation status labels
  private validationLabels: Record<BehaviorValidationStatus, string> = {
    'PENDING': 'Pending Review',
    'CONFIRMED': 'Confirmed',
    'FALSE_ALARM': 'False Alarm'
  };

  // Lightbox methods
  openLightbox(index: number): void {
    this.lightboxCurrentIndex = index;
    this.lightboxOpen = true;
    // Prevent body scroll when lightbox is open
    document.body.style.overflow = 'hidden';
  }

  closeLightbox(): void {
    this.lightboxOpen = false;
    // Restore body scroll
    document.body.style.overflow = '';
  }

  nextImage(): void {
    if (this.behavior.imageUrls && this.behavior.imageUrls.length > 0) {
      this.lightboxCurrentIndex = (this.lightboxCurrentIndex + 1) % this.behavior.imageUrls.length;
    }
  }

  previousImage(): void {
    if (this.behavior.imageUrls && this.behavior.imageUrls.length > 0) {
      this.lightboxCurrentIndex = (this.lightboxCurrentIndex - 1 + this.behavior.imageUrls.length) % this.behavior.imageUrls.length;
    }
  }

  onLightboxKeydown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'Escape':
        this.closeLightbox();
        event.preventDefault();
        break;
      case 'ArrowLeft':
        this.previousImage();
        event.preventDefault();
        break;
      case 'ArrowRight':
        this.nextImage();
        event.preventDefault();
        break;
    }
  }

  getBehaviorIcon(type: BehaviorType): string {
    return this.behaviorTypeIcons[type] || '📝';
  }

  getBehaviorTypeLabel(type: BehaviorType): string {
    return this.behaviorTypeLabels[type] || type;
  }

  getSeverityLabel(severity: number): string {
    switch (severity) {
      case 1: return 'Mild';
      case 2: return 'Low';
      case 3: return 'Moderate';
      case 4: return 'High';
      case 5: return 'Severe';
      default: return 'Unknown';
    }
  }

  getSeverityBadgeClass(severity: number): string {
    switch (severity) {
      case 1: return 'bg-green-100 text-green-800 border border-green-200';
      case 2: return 'bg-emerald-100 text-emerald-800 border border-emerald-200';
      case 3: return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
      case 4: return 'bg-orange-100 text-orange-800 border border-orange-200';
      case 5: return 'bg-red-100 text-red-800 border border-red-200';
      default: return 'bg-gray-100 text-gray-800 border border-gray-200';
    }
  }

  getSourceLabel(source: BehaviorSource): string {
    return this.sourceLabels[source] || source;
  }

  getSourceBadgeClass(source: BehaviorSource): string {
    const baseClass = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ';
    switch (source) {
      case 'MANUAL':
        return baseClass + 'bg-blue-100 text-blue-800';
      case 'AUTO':
        return baseClass + 'bg-purple-100 text-purple-800';
      default:
        return baseClass + 'bg-gray-100 text-gray-800';
    }
  }

  getValidationLabel(status: BehaviorValidationStatus): string {
    return this.validationLabels[status] || status;
  }

  getValidationBadgeClass(status: BehaviorValidationStatus): string {
    const baseClass = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ';
    switch (status) {
      case 'PENDING':
        return baseClass + 'bg-yellow-100 text-yellow-800';
      case 'CONFIRMED':
        return baseClass + 'bg-green-100 text-green-800';
      case 'FALSE_ALARM':
        return baseClass + 'bg-red-100 text-red-800';
      default:
        return baseClass + 'bg-gray-100 text-gray-800';
    }
  }

  formatDateTime(timestamp: string): string {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  onClose(): void {
    this.close.emit();
  }

  onEdit(): void {
    this.edit.emit(this.behavior);
  }

  onDelete(): void {
    this.delete.emit(this.behavior.id);
  }

  onBackdropClick(event: MouseEvent): void {
    this.onClose();
  }
}
