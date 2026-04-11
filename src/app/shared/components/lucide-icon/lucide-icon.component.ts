import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'lucide-icon',
  standalone: true,
  imports: [CommonModule],
  template: `
    <svg
      *ngIf="name === 'audio-lines'; else fallback"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      [attr.aria-label]="ariaLabel"
      role="img"
      [ngStyle]="{ width: size, height: size }"
    >
      <path d="M2 10v4" stroke="currentColor" stroke-width="2" stroke-linecap="round"></path>
      <path d="M6 6v12" stroke="currentColor" stroke-width="2" stroke-linecap="round"></path>
      <path d="M10 3v18" stroke="currentColor" stroke-width="2" stroke-linecap="round"></path>
      <path d="M14 8v8" stroke="currentColor" stroke-width="2" stroke-linecap="round"></path>
      <path d="M18 5v14" stroke="currentColor" stroke-width="2" stroke-linecap="round"></path>
      <path d="M22 10v4" stroke="currentColor" stroke-width="2" stroke-linecap="round"></path>
    </svg>
    <ng-template #fallback>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        [attr.aria-label]="ariaLabel"
        role="img"
        [ngStyle]="{ width: size, height: size }"
      >
        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"></circle>
        <path d="M12 8v8" stroke="currentColor" stroke-width="2" stroke-linecap="round"></path>
      </svg>
    </ng-template>
  `
})
export class LucideIconComponent {
  @Input() name = '';
  @Input() size = '1.8rem';
  @Input() ariaLabel = 'icon';
}
