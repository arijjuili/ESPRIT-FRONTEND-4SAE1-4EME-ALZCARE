import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

interface PatternColor {
  label: string;
  className: string;
}

@Component({
  selector: 'app-pattern-recognition',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './pattern-recognition.component.html',
  styleUrls: ['./pattern-recognition.component.scss']
})
export class PatternRecognitionComponent implements OnDestroy {
  colors: PatternColor[] = [
    { label: 'Rose', className: 'bg-rose-500' },
    { label: 'Amber', className: 'bg-amber-400' },
    { label: 'Indigo', className: 'bg-indigo-500' },
    { label: 'Emerald', className: 'bg-emerald-500' }
  ];
  sequence: number[] = [];
  playerInput: number[] = [];
  round = 1;
  message = 'Press Start to see the pattern.';
  showing = false;
  activeIndex: number | null = null;
  started = false;
  newBadge: { title: string; description: string; icon: string } | null = null;
  lastRoundReached = 0;
  finishRound = 5;
  private timeouts: number[] = [];

  startGame(): void {
    this.started = true;
    this.round = 1;
    this.sequence = [];
    this.lastRoundReached = 0;
    this.nextRound();
  }

  nextRound(): void {
    this.playerInput = [];
    this.sequence.push(Math.floor(Math.random() * this.colors.length));
    this.playSequence();
  }

  playSequence(): void {
    this.clearTimers();
    this.showing = true;
    this.message = 'Watch the pattern.';
    this.sequence.forEach((index, i) => {
      const timeoutId = window.setTimeout(() => {
        this.activeIndex = index;
        window.setTimeout(() => (this.activeIndex = null), 400);
        if (i === this.sequence.length - 1) {
          window.setTimeout(() => {
            this.showing = false;
            this.message = 'Your turn! Repeat the pattern.';
          }, 600);
        }
      }, 700 * (i + 1));
      this.timeouts.push(timeoutId);
    });
  }

  pickColor(index: number): void {
    if (this.showing) return;
    this.playerInput.push(index);
    const currentIndex = this.playerInput.length - 1;
    if (this.playerInput[currentIndex] !== this.sequence[currentIndex]) {
      const encouragements = [
        'Great effort!',
        'You are doing awesome!',
        'Nice try!'
      ];
      const picked = encouragements[Math.floor(Math.random() * encouragements.length)];
      const achieved = Math.max(1, this.round - 1);
      this.lastRoundReached = achieved;
      this.message = `${picked} You reached round ${achieved}.`;
      this.started = false;
      this.playerInput = [];
      return;
    }

    if (this.playerInput.length === this.sequence.length) {
      this.round += 1;
      if (this.round > this.finishRound) {
        this.started = false;
        this.recordCompletion();
        this.awardBadge();
        this.message = 'You completed the rhythm challenge!';
        return;
      }
      this.message = 'Nice! Get ready for the next round.';
      window.setTimeout(() => this.nextRound(), 800);
    }
  }

  closeBadge(): void {
    this.newBadge = null;
  }

  ngOnDestroy(): void {
    this.clearTimers();
  }

  private clearTimers(): void {
    this.timeouts.forEach(timeoutId => clearTimeout(timeoutId));
    this.timeouts = [];
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
    if (!badges.includes('pattern-recognition')) {
      badges.push('pattern-recognition');
      localStorage.setItem('alzcare_game_badges', JSON.stringify(badges));
      localStorage.setItem('alzcare_latest_badge', JSON.stringify({
        id: 'pattern-recognition',
        title: 'Rhythm Rider',
        description: 'Reached round 3 in Pattern Recognition.',
        icon: '🎨'
      }));
      this.newBadge = { title: 'Rhythm Rider', description: 'Reached round 3 in Pattern Recognition.', icon: '🎨' };
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
