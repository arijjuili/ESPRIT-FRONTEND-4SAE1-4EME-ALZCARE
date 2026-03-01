import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ApiService } from '../../../../core/services/api.service';
import { AuthService } from '../../../../core/services/auth.service';
import { GameActivityCreateRequest } from '../../../../core/models/api.model';
import { GameSplashComponent } from '../../../../shared/components/game-splash/game-splash.component';
import { GameGuidelinesComponent, GuidelineStep } from '../../../../shared/components/game-guidelines/game-guidelines.component';

interface MemoryCard {
  id: number;
  value: string;
  flipped: boolean;
  matched: boolean;
}

@Component({
  selector: 'app-memory-match',
  standalone: true,
  imports: [CommonModule, RouterModule, GameSplashComponent, GameGuidelinesComponent],
  templateUrl: './memory-match.component.html',
  styleUrls: ['./memory-match.component.scss']
})
export class MemoryMatchComponent {
  showSplash = true;
  showGuidelines = false;
  
  private icons = ['🍎', '🎸', '🚲', '🌸', '🦋', '⭐'];
  deck: MemoryCard[] = [];
  moves = 0;
  matches = 0;
  busy = false;
  newBadge: { title: string; description: string; icon: string } | null = null;

  guidelineSteps: GuidelineStep[] = [
    { title: 'Flip Cards', description: 'Click on any card to flip it over and reveal the hidden symbol.', icon: '👆' },
    { title: 'Find Pairs', description: 'Try to find two cards with the same symbol.', icon: '🃏' },
    { title: 'Match All', description: 'Find all 6 pairs to win the game!', icon: '🏆' }
  ];

  constructor(
    private apiService: ApiService,
    private authService: AuthService
  ) {
    this.resetGame();
  }

  onSplashComplete(): void {
    this.showSplash = false;
    this.showGuidelines = true;
  }

  onGuidelinesClose(): void {
    this.showGuidelines = false;
  }

  resetGame(): void {
    const cards: MemoryCard[] = [];
    this.icons.forEach((icon, index) => {
      cards.push({ id: index * 2, value: icon, flipped: false, matched: false });
      cards.push({ id: index * 2 + 1, value: icon, flipped: false, matched: false });
    });
    this.deck = this.shuffle(cards);
    this.moves = 0;
    this.matches = 0;
    this.busy = false;
  }

  flipCard(card: MemoryCard): void {
    if (this.busy || card.flipped || card.matched) return;
    card.flipped = true;

    const flipped = this.deck.filter(c => c.flipped && !c.matched);
    if (flipped.length === 2) {
      this.busy = true;
      this.moves += 1;
      const [first, second] = flipped;
      if (first.value === second.value) {
        first.matched = true;
        second.matched = true;
        this.matches += 1;
        this.busy = false;
        if (this.complete) {
          this.recordCompletion();
          this.awardBadge();
        }
      } else {
        setTimeout(() => {
          first.flipped = false;
          second.flipped = false;
          this.busy = false;
        }, 700);
      }
    }
  }

  get complete(): boolean {
    return this.matches === this.icons.length;
  }

  closeBadge(): void {
    this.newBadge = null;
  }

  private shuffle(cards: MemoryCard[]): MemoryCard[] {
    const copy = [...cards];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  private recordCompletion(): void {
    const today = new Date().toISOString().split('T')[0];
    const sessions = this.readList('alzcare_game_sessions');
    sessions.push(today);
    localStorage.setItem('alzcare_game_sessions', JSON.stringify(sessions));
    this.checkDailyFocusBadge(sessions, today);
    this.recordToDb();
  }

  private recordToDb(): void {
    const userId = this.authService.getCurrentUser()?.id;
    if (!userId) return;
    const totalPairs = 6;
    const score = Math.round((this.matches / totalPairs) * 100);
    const payload: GameActivityCreateRequest = {
      patientId: userId,
      gameType: 'MEMORY_MATCH',
      difficulty: 'EASY',
      targetDomain: 'memory',
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      durationSeconds: 0,
      score,
      maxScore: 100,
      voiceUsed: false,
      mistakesMade: this.moves - this.matches,
      pointsEarned: score,
      adaptiveMode: false,
      difficultyAdjustments: 0,
      voiceCommandCount: 0,
      accuracyPercent: score
    };
    this.apiService.createGameActivity(payload).subscribe({
      next: () => {},
      error: () => {}
    });
  }

  private awardBadge(): void {
    const badges = this.readList('alzcare_game_badges');
    if (!badges.includes('memory-match')) {
      badges.push('memory-match');
      localStorage.setItem('alzcare_game_badges', JSON.stringify(badges));
      localStorage.setItem('alzcare_latest_badge', JSON.stringify({
        id: 'memory-match',
        title: 'Memory Matcher',
        description: 'Completed Memory Match.',
        icon: '🧠'
      }));
      this.newBadge = { title: 'Memory Matcher', description: 'Completed Memory Match.', icon: '🧠' };
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
