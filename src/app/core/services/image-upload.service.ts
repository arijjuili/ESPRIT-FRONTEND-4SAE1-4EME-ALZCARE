import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

export interface UploadResult {
  url: string;
  publicId: string;
  format: string;
  width: number;
  height: number;
}

/**
 * Service for uploading images to Cloudinary
 * Uses unsigned uploads with a preset configured in Cloudinary dashboard
 */
@Injectable({
  providedIn: 'root'
})
export class ImageUploadService {
  private readonly cloudName = environment.cloudinary.cloudName;
  private readonly uploadPreset = environment.cloudinary.uploadPreset;
  private readonly apiUrl = `${environment.cloudinary.apiUrl}/${this.cloudName}`;
  private readonly maxFileSize = environment.cloudinary.maxFileSizeMB * 1024 * 1024;
  private readonly allowedFormats = environment.cloudinary.allowedFormats;

  /**
   * Validate a file before upload
   */
  validateFile(file: File): FileValidationResult {
    // Check file size
    if (file.size > this.maxFileSize) {
      return {
        valid: false,
        error: `File size exceeds ${environment.cloudinary.maxFileSizeMB}MB limit`
      };
    }

    // Check file type
    const extension = file.name.split('.').pop()?.toLowerCase() || '';
    if (!this.allowedFormats.includes(extension)) {
      return {
        valid: false,
        error: `Invalid file format. Allowed: ${this.allowedFormats.join(', ')}`
      };
    }

    // Check mime type starts with image/
    if (!file.type.startsWith('image/')) {
      return {
        valid: false,
        error: 'File must be an image'
      };
    }

    return { valid: true };
  }

  /**
   * Validate multiple files
   */
  validateFiles(files: File[]): { valid: File[]; errors: string[] } {
    const valid: File[] = [];
    const errors: string[] = [];

    for (const file of files) {
      const result = this.validateFile(file);
      if (result.valid) {
        valid.push(file);
      } else {
        errors.push(`${file.name}: ${result.error}`);
      }
    }

    return { valid, errors };
  }

  /**
   * Upload a single image to Cloudinary
   * Returns the secure URL of the uploaded image
   */
  async uploadImage(file: File): Promise<UploadResult> {
    const validation = this.validateFile(file);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', this.uploadPreset);
    formData.append('folder', environment.cloudinary.folder);

    try {
      const response = await fetch(`${this.apiUrl}/image/upload`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `Upload failed: ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        url: data.secure_url,
        publicId: data.public_id,
        format: data.format,
        width: data.width,
        height: data.height
      };
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Network error during upload. Please try again.');
    }
  }

  /**
   * Upload multiple images to Cloudinary
   * Returns array of URLs for successfully uploaded images
   */
  async uploadMultiple(files: File[]): Promise<UploadResult[]> {
    const validation = this.validateFiles(files);
    
    if (validation.errors.length > 0 && validation.valid.length === 0) {
      throw new Error(validation.errors.join('\n'));
    }

    const results: UploadResult[] = [];
    const errors: string[] = [];

    // Upload files sequentially to avoid overwhelming the API
    for (const file of validation.valid) {
      try {
        const result = await this.uploadImage(file);
        results.push(result);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`${file.name}: ${errorMessage}`);
      }
    }

    // If some uploads failed but others succeeded, return partial results
    if (errors.length > 0 && results.length === 0) {
      throw new Error(`All uploads failed:\n${errors.join('\n')}`);
    }

    return results;
  }

  /**
   * Upload multiple images with progress tracking
   * Uses XMLHttpRequest for progress events
   */
  uploadWithProgress(
    file: File,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadResult> {
    return new Promise((resolve, reject) => {
      const validation = this.validateFile(file);
      if (!validation.valid) {
        reject(new Error(validation.error));
        return;
      }

      const xhr = new XMLHttpRequest();
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', this.uploadPreset);
      formData.append('folder', environment.cloudinary.folder);

      // Track upload progress
      if (onProgress) {
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            onProgress({
              loaded: event.loaded,
              total: event.total,
              percentage: Math.round((event.loaded / event.total) * 100)
            });
          }
        });
      }

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            resolve({
              url: data.secure_url,
              publicId: data.public_id,
              format: data.format,
              width: data.width,
              height: data.height
            });
          } catch {
            reject(new Error('Invalid response from server'));
          }
        } else {
          try {
            const errorData = JSON.parse(xhr.responseText);
            reject(new Error(errorData.error?.message || `Upload failed: ${xhr.statusText}`));
          } catch {
            reject(new Error(`Upload failed: ${xhr.statusText}`));
          }
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Network error during upload. Please check your connection.'));
      });

      xhr.addEventListener('abort', () => {
        reject(new Error('Upload was cancelled'));
      });

      xhr.open('POST', `${this.apiUrl}/image/upload`);
      xhr.send(formData);
    });
  }

  /**
   * Get optimized image URL with transformations
   */
  getOptimizedUrl(url: string, width?: number, height?: number): string {
    if (!url || !url.includes('cloudinary.com')) {
      return url;
    }

    // Insert transformation parameters into the URL
    const transformations: string[] = [];
    
    if (width) transformations.push(`w_${width}`);
    if (height) transformations.push(`h_${height}`);
    if (width || height) transformations.push('c_fill');
    
    transformations.push('q_auto', 'f_auto'); // Auto quality and format

    if (transformations.length === 0) {
      return url;
    }

    const transformString = transformations.join(',');
    return url.replace('/upload/', `/upload/${transformString}/`);
  }

  /**
   * Get thumbnail URL
   */
  getThumbnailUrl(url: string, size: number = 150): string {
    return this.getOptimizedUrl(url, size, size);
  }
}
