import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Subscription } from 'rxjs';
import { NotificationService } from './core/services/notification.service';
import { AuthService } from './core/services/auth.service';
import { HydrationReminderService } from './core/services/hydration-reminder.service';
import { ToastContainerComponent } from './shared/components/toast/toast-container.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ToastContainerComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'Alzheimer Care Platform';
  private authSubscription?: Subscription;

  constructor(
    private notificationService: NotificationService,
    private authService: AuthService,
    private hydrationReminderService: HydrationReminderService
  ) {}

  ngOnInit(): void {
    // Subscribe to auth state changes
    this.authSubscription = this.authService.currentUser$.subscribe(user => {
      if (user) {
        // User logged in - start polling for notifications
        this.notificationService.startPolling(user.id);
        if (user.role === 'patient') {
          this.hydrationReminderService.startForPatient(user.id);
        } else {
          this.hydrationReminderService.stop();
        }
      } else {
        // User logged out - stop polling
        this.notificationService.stopPolling();
        this.hydrationReminderService.stop();
      }
    });
  }

  ngOnDestroy(): void {
    this.authSubscription?.unsubscribe();
    this.notificationService.stopPolling();
    this.hydrationReminderService.stop();
  }
}
