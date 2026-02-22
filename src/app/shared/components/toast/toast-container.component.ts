import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { trigger, transition, style, animate } from '@angular/animations';
import { Subscription } from 'rxjs';
import { ToastService, Toast } from './toast.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './toast-container.component.html',
  styleUrls: ['./toast-container.component.scss'],
  animations: [
    trigger('slideIn', [
      transition(':enter', [
        style({ transform: 'translateX(100%)', opacity: 0 }),
        animate('300ms ease-out', style({ transform: 'translateX(0)', opacity: 1 }))
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ transform: 'translateX(100%)', opacity: 0 }))
      ])
    ])
  ]
})
export class ToastContainerComponent implements OnInit, OnDestroy {
  toasts: Toast[] = [];
  private toastSubscription?: Subscription;

  constructor(private toastService: ToastService) { }

  ngOnInit(): void {
    this.toastSubscription = this.toastService.toasts$.subscribe(
      toasts => this.toasts = toasts
    );
  }

  ngOnDestroy(): void {
    this.toastSubscription?.unsubscribe();
  }

  removeToast(id: string): void {
    this.toastService.remove(id);
  }

  getToastIcon(type: string): string {
    switch (type) {
      case 'success': return '✓';
      case 'error': return '✕';
      case 'warning': return '⚠';
      case 'emergency': return '🚨';
      case 'info':
      default: return 'ℹ';
    }
  }
}
