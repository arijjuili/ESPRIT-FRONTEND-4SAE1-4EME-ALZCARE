import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'emergency';

export interface Toast {
  id: string;
  message: string;
  title?: string;
  type: ToastType;
  duration: number;
  progress: number;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private toastsSubject = new BehaviorSubject<Toast[]>([]);
  toasts$ = this.toastsSubject.asObservable();
  
  // Track active timers to prevent duplicates
  private activeTimers = new Map<string, any>();

  private idCounter = 0;
  private generateId(): string {
    this.idCounter++;
    return `toast-${Date.now()}-${this.idCounter}`;
  }

  show(
    message: string,
    type: ToastType = 'info',
    title?: string,
    duration = 5000
  ): void {
    // Prevent duplicate toasts with same message (within last 2 seconds)
    const now = Date.now();
    const recentDuplicate = this.toastsSubject.value.find(
      t => t.message === message && t.type === type && (now - parseInt(t.id.split('-')[1])) < 2000
    );
    if (recentDuplicate) {
      return; // Skip duplicate
    }

    const toast: Toast = {
      id: this.generateId(),
      message,
      title,
      type,
      duration,
      progress: 100,
    };

    const currentToasts = this.toastsSubject.value;
    // Limit to max 5 toasts, remove oldest if needed
    const newToasts = [...currentToasts, toast].slice(-5);
    this.toastsSubject.next(newToasts);

    // Emergency alerts don't auto-dismiss
    if (type !== 'emergency' && duration > 0) {
      this.startProgressTimer(toast.id, duration);
    }
  }

  success(message: string, title?: string): void {
    this.show(message, 'success', title, 5000);
  }

  error(message: string, title?: string): void {
    this.show(message, 'error', title, 8000);
  }

  warning(message: string, title?: string): void {
    this.show(message, 'warning', title, 6000);
  }

  info(message: string, title?: string): void {
    this.show(message, 'info', title, 5000);
  }

  emergencyAlert(title: string, message: string): void {
    this.show(message, 'emergency', title, 0);
  }

  remove(id: string): void {
    // Clear any active timer for this toast
    if (this.activeTimers.has(id)) {
      clearTimeout(this.activeTimers.get(id));
      this.activeTimers.delete(id);
    }
    
    const currentToasts = this.toastsSubject.value;
    this.toastsSubject.next(currentToasts.filter((t) => t.id !== id));
  }

  private startProgressTimer(id: string, duration: number): void {
    // Clear any existing timer for this ID
    if (this.activeTimers.has(id)) {
      clearTimeout(this.activeTimers.get(id));
    }

    // Use requestAnimationFrame for smooth progress updates
    let startTime: number | null = null;
    let animationFrameId: number;

    const updateProgress = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const remaining = Math.max(0, duration - elapsed);
      const progress = (remaining / duration) * 100;

      const currentToasts = this.toastsSubject.value;
      const toastIndex = currentToasts.findIndex((t) => t.id === id);

      if (toastIndex === -1) {
        // Toast was removed, cancel animation
        if (animationFrameId) {
          cancelAnimationFrame(animationFrameId);
        }
        this.activeTimers.delete(id);
        return;
      }

      if (remaining <= 0) {
        // Time's up, remove the toast
        this.activeTimers.delete(id);
        this.remove(id);
      } else {
        // Update progress
        const updatedToasts = [...currentToasts];
        updatedToasts[toastIndex] = {
          ...updatedToasts[toastIndex],
          progress,
        };
        this.toastsSubject.next(updatedToasts);
        
        // Schedule next update (throttle to ~30fps for performance)
        const timer = setTimeout(() => {
          animationFrameId = requestAnimationFrame(updateProgress);
        }, 33);
        this.activeTimers.set(id, timer);
      }
    };

    // Start the animation loop
    const initialTimer = setTimeout(() => {
      animationFrameId = requestAnimationFrame(updateProgress);
    }, 33);
    this.activeTimers.set(id, initialTimer);
  }
}
