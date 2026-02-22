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

  private generateId(): string {
    return `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  show(
    message: string,
    type: ToastType = 'info',
    title?: string,
    duration = 5000
  ): void {
    const toast: Toast = {
      id: this.generateId(),
      message,
      title,
      type,
      duration,
      progress: 100,
    };

    const currentToasts = this.toastsSubject.value;
    this.toastsSubject.next([...currentToasts, toast]);

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
    const currentToasts = this.toastsSubject.value;
    this.toastsSubject.next(currentToasts.filter((t) => t.id !== id));
  }

  private startProgressTimer(id: string, duration: number): void {
    const startTime = Date.now();
    const interval = 50; // Update every 50ms for smooth animation

    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, duration - elapsed);
      const progress = (remaining / duration) * 100;

      const currentToasts = this.toastsSubject.value;
      const toastIndex = currentToasts.findIndex((t) => t.id === id);

      if (toastIndex === -1) {
        clearInterval(timer);
        return;
      }

      if (remaining <= 0) {
        clearInterval(timer);
        this.remove(id);
      } else {
        const updatedToasts = [...currentToasts];
        updatedToasts[toastIndex] = {
          ...updatedToasts[toastIndex],
          progress,
        };
        this.toastsSubject.next(updatedToasts);
      }
    }, interval);
  }
}
