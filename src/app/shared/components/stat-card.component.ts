import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-stat-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-white rounded-xl shadow-md p-6 border-l-4 hover:shadow-lg transition" [ngClass]="borderColorClass">
      <div class="flex justify-between items-start">
        <div>
          <p class="text-gray-500 text-xs font-bold uppercase tracking-wider">{{ label }}</p>
          <p class="text-4xl font-bold text-gray-900 mt-3">{{ value }}</p>
          <p *ngIf="subtitle" class="text-gray-500 text-sm mt-2">{{ subtitle }}</p>
        </div>
        <div class="text-4xl opacity-80">{{ icon }}</div>
      </div>
    </div>
  `,
  styles: []
})
export class StatCardComponent {
  @Input() label: string = '';
  @Input() value: string | number = '';
  @Input() icon: string = '';
  @Input() subtitle: string = '';
  @Input() color: 'primary' | 'success' | 'info' | 'warning' | 'danger' = 'primary';

  get borderColorClass(): string {
    const colors: Record<string, string> = {
      primary: 'border-primary-500',
      success: 'border-success',
      info: 'border-info',
      warning: 'border-warning',
      danger: 'border-danger'
    };
    return colors[this.color];
  }
}
