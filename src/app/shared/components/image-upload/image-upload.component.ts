import { Component, Input, Output, EventEmitter, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ImageUploadService, UploadResult } from '../../../core/services/image-upload.service';

interface UploadedImage extends UploadResult {
  id: string;
  isUploading?: boolean;
  uploadProgress?: number;
}

@Component({
  selector: 'app-image-upload',
  templateUrl: './image-upload.component.html',
  styleUrls: ['./image-upload.component.scss'],
  standalone: true,
  imports: [CommonModule]
})
export class ImageUploadComponent {
  @Input() maxImages = 5;
  @Input() maxFileSizeMB = 5;
  @Input() allowedFormats: string[] = ['jpg', 'jpeg', 'png', 'heic', 'heif'];
  
  @Output() imagesUploaded = new EventEmitter<string[]>();
  @Output() uploadError = new EventEmitter<string>();
  @Output() imagesChanged = new EventEmitter<string[]>();

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  @ViewChild('cameraInput') cameraInput!: ElementRef<HTMLInputElement>;

  uploadedImages: UploadedImage[] = [];
  isDragging = false;
  isUploading = false;
  errorMessage: string | null = null;

  constructor(private imageUploadService: ImageUploadService) {}

  /**
   * Get remaining slots available
   */
  get remainingSlots(): number {
    return this.maxImages - this.uploadedImages.length;
  }

  /**
   * Check if we can upload more images
   */
  get canUploadMore(): boolean {
    return this.uploadedImages.length < this.maxImages && !this.isUploading;
  }

  /**
   * Handle drag over event
   */
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    if (this.canUploadMore) {
      this.isDragging = true;
    }
  }

  /**
   * Handle drag leave event
   */
  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
  }

  /**
   * Handle drop event
   */
  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;

    if (!this.canUploadMore) {
      this.setError(`Maximum ${this.maxImages} images allowed`);
      return;
    }

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.handleFiles(Array.from(files));
    }
  }

  /**
   * Handle file input change
   */
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleFiles(Array.from(input.files));
    }
    // Reset input so same file can be selected again
    input.value = '';
  }

  /**
   * Open camera for capture
   */
  openCamera(): void {
    if (this.cameraInput) {
      this.cameraInput.nativeElement.click();
    }
  }

  /**
   * Handle camera capture
   */
  onCameraCapture(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleFiles(Array.from(input.files));
    }
    // Reset input so same photo can be taken again
    input.value = '';
  }

  /**
   * Process and upload files
   */
  private handleFiles(files: File[]): void {
    this.errorMessage = null;

    // Check if adding these files would exceed the limit
    if (files.length > this.remainingSlots) {
      this.setError(`Can only upload ${this.remainingSlots} more image${this.remainingSlots === 1 ? '' : 's'}`);
      // Still proceed with what we can upload
      files = files.slice(0, this.remainingSlots);
    }

    if (files.length === 0) return;

    // Validate files first
    const validation = this.imageUploadService.validateFiles(files);
    
    if (validation.errors.length > 0) {
      // Show first error but continue with valid files
      this.setError(validation.errors[0]);
    }

    if (validation.valid.length === 0) {
      return;
    }

    // Upload valid files
    this.uploadFiles(validation.valid);
  }

  /**
   * Upload files to Cloudinary
   */
  private async uploadFiles(files: File[]): Promise<void> {
    this.isUploading = true;
    
    // Create placeholder entries for each file being uploaded
    const uploadIds = files.map(() => this.generateId());
    
    files.forEach((file, index) => {
      this.uploadedImages.push({
        id: uploadIds[index],
        url: '',
        publicId: '',
        format: '',
        width: 0,
        height: 0,
        isUploading: true,
        uploadProgress: 0
      });
    });

    // Upload each file with progress tracking
    const uploadPromises = files.map((file, index) => 
      this.uploadSingleFile(file, uploadIds[index])
    );

    try {
      await Promise.all(uploadPromises);
      this.emitImageUrls();
    } finally {
      this.isUploading = false;
    }
  }

  /**
   * Upload a single file with progress tracking
   */
  private async uploadSingleFile(file: File, uploadId: string): Promise<void> {
    try {
      const result = await this.imageUploadService.uploadWithProgress(
        file,
        (progress) => {
          const image = this.uploadedImages.find(img => img.id === uploadId);
          if (image) {
            image.uploadProgress = progress.percentage;
          }
        }
      );

      // Update the image entry with the result
      const imageIndex = this.uploadedImages.findIndex(img => img.id === uploadId);
      if (imageIndex !== -1) {
        this.uploadedImages[imageIndex] = {
          ...result,
          id: uploadId,
          isUploading: false,
          uploadProgress: 100
        };
      }
    } catch (error) {
      // Remove the failed upload placeholder
      this.uploadedImages = this.uploadedImages.filter(img => img.id !== uploadId);
      
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      this.setError(`${file.name}: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Remove an uploaded image
   */
  removeImage(index: number): void {
    if (index >= 0 && index < this.uploadedImages.length) {
      this.uploadedImages.splice(index, 1);
      this.errorMessage = null;
      this.emitImageUrls();
    }
  }

  /**
   * Get thumbnail URL for an image
   */
  getThumbnailUrl(image: UploadedImage): string {
    return this.imageUploadService.getThumbnailUrl(image.url, 80);
  }

  /**
   * Set error message and emit error event
   */
  private setError(message: string): void {
    this.errorMessage = message;
    this.uploadError.emit(message);
  }

  /**
   * Generate unique ID for tracking uploads
   */
  private generateId(): string {
    return `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Emit current image URLs
   */
  private emitImageUrls(): void {
    const urls = this.uploadedImages.map(img => img.url);
    this.imagesUploaded.emit(urls);
    this.imagesChanged.emit(urls);
  }

  /**
   * Get accepted file types for input
   */
  get acceptedFileTypes(): string {
    return 'image/jpeg,image/jpg,image/png,image/heic,image/heif';
  }
}
