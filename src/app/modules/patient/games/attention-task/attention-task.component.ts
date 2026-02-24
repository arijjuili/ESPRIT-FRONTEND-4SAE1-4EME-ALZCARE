import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ApiService } from '../../../../core/services/api.service';
import { AuthService } from '../../../../core/services/auth.service';
import { GameActivity, GameActivityCreateRequest } from '../../../../core/models/api.model';

@Component({
  selector: 'app-attention-task',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './attention-task.component.html',
  styleUrls: ['./attention-task.component.scss']
})
export class AttentionTaskComponent implements OnDestroy {
  status: 'idle' | 'waiting' | 'go' | 'done' | 'false-start' = 'idle';
  reactionMs: number | null = null;
  bestMs: number | null = null;
  newBadge: { title: string; description: string; icon: string } | null = null;
  private timerId: number | null = null;
  private startTime = 0;

  constructor(private apiService: ApiService, private authService: AuthService) {
    this.loadBestFromDb();
  }

  start(): void {
    this.clearTimer();
    this.status = 'waiting';
    this.reactionMs = null;
    const delay = 1200 + Math.random() * 1800;
    this.timerId = window.setTimeout(() => {
      this.status = 'go';
      this.startTime = performance.now();
    }, delay);
  }

  clickTarget(): void {
    if (this.status === 'waiting') {
      this.status = 'false-start';
      this.clearTimer();
      return;
    }
    if (this.status !== 'go') return;
    this.reactionMs = Math.round(performance.now() - this.startTime);
    this.status = 'done';
    this.recordCompletion();
    this.recordToDb();
    this.awardBadge();
  }

  ngOnDestroy(): void {
    this.clearTimer();
  }

  closeBadge(): void {
    this.newBadge = null;
  }

  private clearTimer(): void {
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  private loadBestFromDb(): void {
    const patientId = this.authService.getCurrentUser()?.id;
    if (!patientId) return;
    this.apiService.getGameActivities(patientId).subscribe({
      next: (activities: GameActivity[]) => {
        this.bestMs = this.computeBest(activities);
      },
      error: () => {
        // ignore if unavailable
      }
    });
  }

  private recordToDb(): void {
    const patientId = this.authService.getCurrentUser()?.id;
    if (!patientId || this.reactionMs === null) return;
    const payload: GameActivityCreateRequest = {
      patientId,
      gameType: 'ATTENTION_TASK',
      difficulty: 'EASY',
      targetDomain: 'attention',
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      durationSeconds: this.reactionMs,
      score: 1,
      maxScore: 1
    };
    this.apiService.createGameActivity(payload).subscribe({
      next: () => this.loadBestFromDb(),
      error: () => {
        // ignore if unavailable
      }
    });
  }

  private computeBest(activities: GameActivity[]): number | null {
    const times = activities
      .filter(activity => activity.gameType === 'ATTENTION_TASK' && activity.durationSeconds)
      .map(activity => activity.durationSeconds ?? null)
      .filter((value): value is number => value !== null);
    if (times.length === 0) return null;
    return Math.min(...times);
  }

  private recordCompletion(): void {
    const today = new Date().toISOString().split('T')[0];
    const sessions = this.readList('alzcare_game_sessions');
    sessions.push(today);
    localStorage.setItem('alzcare_game_sessions', JSON.stringify(sessions));
    this.checkDailyFocusBadge(sessions, today);
  }

  private awardBadge(): void {
    const badges = this.readList('alzcare_game_badges');
    if (!badges.includes('attention-task')) {
      badges.push('attention-task');
      localStorage.setItem('alzcare_game_badges', JSON.stringify(badges));
      localStorage.setItem('alzcare_latest_badge', JSON.stringify({
        id: 'attention-task',
        title: 'Lightning Focus',
        description: 'Completed Attention Task.',
        icon: '⚡'
      }));
      this.newBadge = { title: 'Lightning Focus', description: 'Completed Attention Task.', icon: '⚡' };
    }
  }

  private readList(key: string): string[] {
    try {
      const raw = localStorage.getItem(key);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private checkDailyFocusBadge(sessions: string[], today: string): void {
    const todayCount = sessions.filter(date => date === today).length;
    const dailyBadgeKey = `daily-focus-${today}`;
    const awarded = this.readList('alzcare_game_badges').includes(dailyBadgeKey);
    if (todayCount >= 2 && !awarded && !this.newBadge) {
      const badges = this.readList('alzcare_game_badges');
      badges.push(dailyBadgeKey);
      localStorage.setItem('alzcare_game_badges', JSON.stringify(badges));
      localStorage.setItem('alzcare_latest_badge', JSON.stringify({
        id: dailyBadgeKey,
        title: 'Daily Focus',
        description: 'Completed 2 games today.',
        icon: '🎯'
      }));
      this.newBadge = { title: 'Daily Focus', description: 'Completed 2 games today.', icon: '🎯' };
    }
  }
}
