import { Injectable } from '@angular/core';
import { Notification } from '../models/notification.model';
import { NotificationService } from './notification.service';
import { ToastService } from '../../shared/components/toast/toast.service';

@Injectable({
  providedIn: 'root'
})
export class HydrationReminderService {
  private readonly pollIntervalMs = 20_000;
  private pollTimerId: ReturnType<typeof setInterval> | null = null;
  private activeUserId: string | null = null;
  private seenReminderIds = new Set<string>();
  private isChecking = false;

  constructor(
    private notificationService: NotificationService,
    private toastService: ToastService
  ) {}

  startForPatient(userId: string): void {
    if (this.activeUserId === userId) {
      return;
    }

    this.stop();
    this.activeUserId = userId;
    this.checkHydrationNotifications();
    this.pollTimerId = setInterval(() => this.checkHydrationNotifications(), this.pollIntervalMs);
  }

  stop(): void {
    if (this.pollTimerId) {
      clearInterval(this.pollTimerId);
      this.pollTimerId = null;
    }
    this.activeUserId = null;
    this.seenReminderIds.clear();
    this.isChecking = false;
  }

  private checkHydrationNotifications(): void {
    if (!this.activeUserId || this.isChecking) {
      return;
    }
    this.isChecking = true;

    this.notificationService.getUserNotifications(this.activeUserId, {
      page: 0,
      size: 30,
      hours: 12
    }).subscribe({
      next: (response) => {
        const newHydrationReminders = response.content.filter(notification =>
          this.isHydrationReminder(notification) &&
          notification.status === 'DELIVERED' &&
          !this.seenReminderIds.has(notification.id)
        );

        newHydrationReminders.forEach(notification => {
          this.seenReminderIds.add(notification.id);
          this.triggerReminder(notification.title || 'Hydration reminder');
        });

        this.isChecking = false;
      },
      error: () => {
        this.isChecking = false;
      }
    });
  }

  private isHydrationReminder(notification: Notification): boolean {
    if (notification.type !== 'REMINDER') {
      return false;
    }

    const metadataReminderType = (notification.metadata?.['reminderType'] as string | undefined)?.toUpperCase();
    if (metadataReminderType === 'DRINK_WATER') {
      return true;
    }

    const title = (notification.title || '').toLowerCase();
    const message = (notification.message || '').toLowerCase();
    return title.includes('hydration') || message.includes('drink water') || message.includes('drink a glass');
  }

  private triggerReminder(title: string): void {
    this.toastService.warning(
      'It is time to drink water. Please drink a glass now.',
      title
    );
    this.playEscalatingAlert();
  }

  private playEscalatingAlert(): void {
    const audioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!audioContextClass) {
      return;
    }

    try {
      const audioContext = new audioContextClass();
      const startAt = audioContext.currentTime + 0.05;

      this.playBeep(audioContext, startAt, 0.12, 620, 0.08);
      this.playBeep(audioContext, startAt + 0.4, 0.16, 720, 0.16);
      this.playBeep(audioContext, startAt + 0.85, 0.22, 820, 0.26);

      setTimeout(() => {
        audioContext.close().catch(() => undefined);
      }, 2200);
    } catch (error) {
      console.warn('[HydrationReminder] Unable to play alert sound:', error);
    }
  }

  private playBeep(
    audioContext: AudioContext,
    startTime: number,
    durationSeconds: number,
    frequency: number,
    volume: number
  ): void {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;

    gainNode.gain.setValueAtTime(0.0001, startTime);
    gainNode.gain.exponentialRampToValueAtTime(volume, startTime + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + durationSeconds);

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.start(startTime);
    oscillator.stop(startTime + durationSeconds);
  }
}
