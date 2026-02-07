import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type AlertType = 'info' | 'warning' | 'danger' | 'success';

@Component({
  selector: 'app-alert-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="rounded-xl p-5 border" [ngClass]="alertClass">
      <div class="flex items-start gap-4">
        <div class="text-2xl flex-shrink-0">{{ icon }}</div>
        <div class="flex-1">
          <p class="font-bold text-sm" [ngClass]="titleClass">{{ title }}</p>
          <p class="text-sm mt-2" [ngClass]="messageClass">{{ message }}</p>
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class AlertCardComponent {
  @Input() type: AlertType = 'info';
  @Input() title: string = '';
  @Input() message: string = '';

  get alertClass(): string {
    const classes: Record<AlertType, string> = {
      info: 'bg-info bg-opacity-5 border-info border-opacity-20',
      warning: 'bg-warning bg-opacity-5 border-warning border-opacity-20',
      danger: 'bg-danger bg-opacity-5 border-danger border-opacity-20',
      success: 'bg-success bg-opacity-5 border-success border-opacity-20'
    };
    return classes[this.type];
  }

  get titleClass(): string {
    const classes: Record<AlertType, string> = {
      info: 'text-info',
      warning: 'text-warning',
      danger: 'text-danger',
      success: 'text-success'
    };
    return classes[this.type];
  }

  get messageClass(): string {
    const classes: Record<AlertType, string> = {
      info: 'text-info text-opacity-80',
      warning: 'text-warning text-opacity-80',
      danger: 'text-danger text-opacity-80',
      success: 'text-success text-opacity-80'
    };
    return classes[this.type];
  }

  get icon(): string {
    const icons: Record<AlertType, string> = {
      info: 'ℹ️',
      warning: '⚠️',
      danger: '🚨',
      success: '✅'
    };
    return icons[this.type];
  }
}
