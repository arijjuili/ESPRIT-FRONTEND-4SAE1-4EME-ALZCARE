import {
  Component,
  Input,
  Output,
  EventEmitter,
  HostBinding,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Toast, ToastType } from './toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="toast-item"
      [class]="'toast-' + toast.type"
      [class.has-title]="toast.title"
      [@slideIn]="animationState"
    >
      <div class="toast-content">
        <div class="toast-icon">
          <svg
            *ngIf="toast.type === 'success'"
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>

          <svg
            *ngIf="toast.type === 'error'"
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="15" y1="9" x2="9" y2="15"></line>
            <line x1="9" y1="9" x2="15" y2="15"></line>
          </svg>

          <svg
            *ngIf="toast.type === 'warning'"
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path
              d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
            ></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>

          <svg
            *ngIf="toast.type === 'info'"
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="16" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12.01" y2="8"></line>
          </svg>

          <svg
            *ngIf="toast.type === 'emergency'"
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
        </div>

        <div class="toast-text">
          <h4 *ngIf="toast.title" class="toast-title">{{ toast.title }}</h4>
          <p class="toast-message">{{ toast.message }}</p>
        </div>

        <button class="toast-close" (click)="onClose()" aria-label="Close">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      <!-- Progress bar for non-emergency toasts -->
      <div
        *ngIf="toast.type !== 'emergency' && toast.duration > 0"
        class="toast-progress"
      >
        <div
          class="toast-progress-bar"
          [style.width.%]="toast.progress"
        ></div>
      </div>

      <!-- Emergency pulse animation indicator -->
      <div *ngIf="toast.type === 'emergency'" class="emergency-indicator">
        <span class="pulse-dot"></span>
        <span class="emergency-text">Emergency Alert</span>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .toast-item {
        background: white;
        border-radius: 12px;
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1),
          0 8px 10px -6px rgba(0, 0, 0, 0.1);
        overflow: hidden;
        min-width: 320px;
        max-width: 480px;
        border-left: 4px solid transparent;
      }

      /* Toast Type Variants */
      .toast-success {
        border-left-color: #10b981;
      }
      .toast-success .toast-icon {
        color: #10b981;
      }
      .toast-success .toast-progress-bar {
        background: linear-gradient(90deg, #10b981, #34d399);
      }

      .toast-error {
        border-left-color: #ef4444;
      }
      .toast-error .toast-icon {
        color: #ef4444;
      }
      .toast-error .toast-progress-bar {
        background: linear-gradient(90deg, #ef4444, #f87171);
      }

      .toast-warning {
        border-left-color: #f59e0b;
      }
      .toast-warning .toast-icon {
        color: #f59e0b;
      }
      .toast-warning .toast-progress-bar {
        background: linear-gradient(90deg, #f59e0b, #fbbf24);
      }

      .toast-info {
        border-left-color: #3b82f6;
      }
      .toast-info .toast-icon {
        color: #3b82f6;
      }
      .toast-info .toast-progress-bar {
        background: linear-gradient(90deg, #3b82f6, #60a5fa);
      }

      /* Emergency Alert Special Styling */
      .toast-emergency {
        border-left-color: #dc2626;
        background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
        border: 2px solid #ef4444;
        animation: emergencyPulse 2s infinite;
      }

      .toast-emergency .toast-icon {
        color: #dc2626;
        animation: iconPulse 1s infinite;
      }

      @keyframes emergencyPulse {
        0%,
        100% {
          box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4);
        }
        50% {
          box-shadow: 0 0 0 12px rgba(239, 68, 68, 0);
        }
      }

      @keyframes iconPulse {
        0%,
        100% {
          transform: scale(1);
        }
        50% {
          transform: scale(1.1);
        }
      }

      .emergency-indicator {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 16px;
        background: #dc2626;
        color: white;
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .pulse-dot {
        width: 8px;
        height: 8px;
        background: white;
        border-radius: 50%;
        animation: pulseDot 1s infinite;
      }

      @keyframes pulseDot {
        0%,
        100% {
          opacity: 1;
          transform: scale(1);
        }
        50% {
          opacity: 0.5;
          transform: scale(0.8);
        }
      }

      /* Content Layout */
      .toast-content {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        padding: 16px;
      }

      .toast-icon {
        flex-shrink: 0;
        margin-top: 2px;
      }

      .toast-emergency .toast-icon {
        margin-top: 0;
      }

      .toast-text {
        flex: 1;
        min-width: 0;
      }

      .toast-title {
        margin: 0 0 4px 0;
        font-size: 14px;
        font-weight: 600;
        color: #1f2937;
        line-height: 1.4;
      }

      .toast-message {
        margin: 0;
        font-size: 13px;
        color: #6b7280;
        line-height: 1.5;
      }

      .toast-emergency .toast-title {
        color: #991b1b;
        font-weight: 700;
      }

      .toast-emergency .toast-message {
        color: #7f1d1d;
        font-weight: 500;
      }

      .toast-close {
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 28px;
        height: 28px;
        border: none;
        background: transparent;
        color: #9ca3af;
        cursor: pointer;
        border-radius: 6px;
        transition: all 0.2s ease;
      }

      .toast-close:hover {
        background: #f3f4f6;
        color: #374151;
      }

      .toast-emergency .toast-close:hover {
        background: #fecaca;
        color: #991b1b;
      }

      /* Progress Bar */
      .toast-progress {
        height: 3px;
        background: #e5e7eb;
        overflow: hidden;
      }

      .toast-progress-bar {
        height: 100%;
        transition: width 0.05s linear;
      }

      /* Animation State */
      .toast-enter {
        animation: slideInRight 0.3s ease-out;
      }

      .toast-exit {
        animation: slideOutRight 0.3s ease-in forwards;
      }

      @keyframes slideInRight {
        from {
          opacity: 0;
          transform: translateX(100%);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }

      @keyframes slideOutRight {
        from {
          opacity: 1;
          transform: translateX(0);
        }
        to {
          opacity: 0;
          transform: translateX(100%);
        }
      }
    `,
  ],
})
export class ToastComponent {
  @Input({ required: true }) toast!: Toast;
  @Output() close = new EventEmitter<void>();

  animationState = 'in';

  onClose(): void {
    this.animationState = 'out';
    setTimeout(() => {
      this.close.emit();
    }, 300);
  }
}
