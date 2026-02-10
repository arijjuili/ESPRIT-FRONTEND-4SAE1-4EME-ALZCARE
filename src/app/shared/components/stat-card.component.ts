import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-stat-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './stat-card.component.html',
  styleUrls: ['./stat-card.component.scss']
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
