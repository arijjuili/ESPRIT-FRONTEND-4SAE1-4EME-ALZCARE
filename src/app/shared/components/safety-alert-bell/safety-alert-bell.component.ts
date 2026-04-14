import {
  Component, Input, OnInit, OnDestroy,
  ChangeDetectionStrategy, ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { AlertPollingService } from '../../../core/services/alert-polling.service';
import { RoleTheme } from '../navbar.component';

@Component({
  selector: 'app-safety-alert-bell',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './safety-alert-bell.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SafetyAlertBellComponent implements OnInit, OnDestroy {
  @Input() theme: RoleTheme | null = null;

  activeCount = 0;
  criticalCount = 0;

  private subs: Subscription[] = [];

  constructor(
    private polling: AlertPollingService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.subs.push(
      this.polling.alertCount$.subscribe(c => {
        this.activeCount = c;
        this.cdr.markForCheck();
      }),
      this.polling.criticalCount$.subscribe(c => {
        this.criticalCount = c;
        this.cdr.markForCheck();
      })
    );
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  get hasCritical(): boolean {
    return this.criticalCount > 0;
  }
}
