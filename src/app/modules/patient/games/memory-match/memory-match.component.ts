import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ApiService } from '../../../../core/services/api.service';
import { AuthService } from '../../../../core/services/auth.service';
import { DifficultyLevel, GameActivityCreateRequest } from '../../../../core/models/api.model';
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
export class MemoryMatchComponent implements OnInit, OnDestroy {
  showSplash = true;
  showGuidelines = false;
  
  private iconPool = ['🍎', '🎸', '🚲', '🌸', '🦋', '⭐', '🎯', '🚀', '🌙', '🎵'];
  icons = ['🍎', '🎸', '🚲', '🌸', '🦋', '⭐'];
  deck: MemoryCard[] = [];
  moves = 0;
  matches = 0;
  busy = false;
  newBadge: { title: string; description: string; icon: string } | null = null;
  currentDifficulty: DifficultyLevel = 'EASY';
  assistedMode = false;
  hintLevel = 0;
  timeMultiplier = 1;
  cueMode = 'none';
  breakSuggestion = false;
  adaptationReason = '';
  mismatchDelayMs = 700;
  hintCardIds: number[] = [];
  mismatchCardIds: number[] = [];
  private visualTimers: number[] = [];

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

  ngOnInit(): void {
    this.loadAdaptationProfile();
  }

  ngOnDestroy(): void {
    this.clearVisualTimers();
  }

  onSplashComplete(): void {
    this.showSplash = false;
    this.showGuidelines = true;
  }

  onGuidelinesClose(): void {
    this.showGuidelines = false;
    this.maybeShowStartupHint();
  }

  resetGame(): void {
    this.clearVisualHints();
    this.icons = this.resolveIconsByDifficulty(this.currentDifficulty);
    const cards: MemoryCard[] = [];
    this.icons.forEach((icon, index) => {
      cards.push({ id: index * 2, value: icon, flipped: false, matched: false });
      cards.push({ id: index * 2 + 1, value: icon, flipped: false, matched: false });
    });
    this.deck = this.shuffle(cards);
    this.moves = 0;
    this.matches = 0;
    this.busy = false;
    this.maybeShowStartupHint();
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
        this.markMismatch(first.id, second.id);
        if (this.effectiveHintLevel >= 2) {
          this.applyGuidedHint(first);
        }
        setTimeout(() => {
          first.flipped = false;
          second.flipped = false;
          this.busy = false;
        }, this.mismatchDelayMs);
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
    const totalPairs = this.icons.length || 1;
    const score = Math.round((this.matches / totalPairs) * 100);
    const moveEfficiency = Math.round((totalPairs / Math.max(this.moves, totalPairs)) * 100);
    const mistakes = Math.max(this.moves - this.matches, 0);
    const payload: GameActivityCreateRequest = {
      patientId: userId,
      gameType: 'MEMORY_MATCH',
      difficulty: this.currentDifficulty,
      targetDomain: 'memory',
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      durationSeconds: 0,
      score,
      maxScore: 100,
      voiceUsed: false,
      mistakesMade: mistakes,
      pointsEarned: score,
      adaptiveMode: this.assistedMode,
      difficultyAdjustments: 0,
      voiceCommandCount: 0,
      hintsUsed: this.effectiveHintLevel,
      accuracyPercent: moveEfficiency
    };
    this.apiService.createGameActivity(payload).subscribe({
      next: () => this.loadAdaptationProfile(),
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

  private loadAdaptationProfile(): void {
    const userId = this.authService.getCurrentUser()?.id;
    if (!userId) return;
    this.apiService.getGameAdaptation(userId, 'MEMORY_MATCH').subscribe({
      next: (profile) => {
        this.currentDifficulty = profile.recommendedDifficulty || 'EASY';
        this.assistedMode = this.currentDifficulty !== 'HARD';
        this.hintLevel = profile.hintLevel || 0;
        this.timeMultiplier = profile.timeMultiplier || 1;
        this.cueMode = this.currentDifficulty === 'HARD' ? 'none' : 'visual';
        this.breakSuggestion = !!profile.breakSuggestion;
        this.adaptationReason = profile.reason || '';
        this.mismatchDelayMs = Math.round(700 * Math.max(1, this.timeMultiplier));
        if (!this.complete) {
          this.resetGame();
        }
      },
      error: () => {}
    });
  }

  private resolveIconsByDifficulty(difficulty: DifficultyLevel): string[] {
    const pairCount = difficulty === 'HARD' ? 8 : difficulty === 'MEDIUM' ? 6 : 4;
    return this.iconPool.slice(0, pairCount);
  }

  isHintCard(cardId: number): boolean {
    return this.hintCardIds.includes(cardId);
  }

  isMismatchCard(cardId: number): boolean {
    return this.mismatchCardIds.includes(cardId);
  }

  get effectiveHintLevel(): number {
    if (this.currentDifficulty === 'EASY') return 3;
    if (this.currentDifficulty === 'MEDIUM') return 1;
    return 0;
  }

  private markMismatch(firstId: number, secondId: number): void {
    if (this.effectiveHintLevel < 1) return;
    this.mismatchCardIds = [firstId, secondId];
    this.pushTimer(window.setTimeout(() => {
      this.mismatchCardIds = [];
    }, 900));
  }

  private applyGuidedHint(sourceCard: MemoryCard): void {
    const hintTarget = this.deck.find(card => !card.matched && card.id !== sourceCard.id && card.value === sourceCard.value);
    if (!hintTarget) return;
    this.hintCardIds = [sourceCard.id, hintTarget.id];
    this.pushTimer(window.setTimeout(() => {
      this.hintCardIds = [];
    }, 1400));
  }

  private showStrongHintPreview(pairCount = 1): void {
    const candidates = this.deck.filter(card => !card.matched);
    if (candidates.length < 2 || pairCount <= 0) return;
    const previewPairs: Array<{ first: MemoryCard; second: MemoryCard }> = [];
    const usedIds = new Set<number>();
    for (const first of candidates) {
      if (usedIds.has(first.id)) continue;
      const second = candidates.find(card => !usedIds.has(card.id) && card.id !== first.id && card.value === first.value);
      if (!second) continue;
      previewPairs.push({ first, second });
      usedIds.add(first.id);
      usedIds.add(second.id);
      if (previewPairs.length >= pairCount) break;
    }
    if (previewPairs.length === 0) return;
    this.hintCardIds = previewPairs.flatMap(pair => [pair.first.id, pair.second.id]);
    const toRevert: MemoryCard[] = [];
    previewPairs.forEach(pair => {
      if (!pair.first.flipped) {
        pair.first.flipped = true;
        toRevert.push(pair.first);
      }
      if (!pair.second.flipped) {
        pair.second.flipped = true;
        toRevert.push(pair.second);
      }
    });
    this.pushTimer(window.setTimeout(() => {
      toRevert.forEach(card => {
        if (!card.matched) {
          card.flipped = false;
        }
      });
      this.hintCardIds = [];
    }, 800));
  }

  private pushTimer(timerId: number): void {
    this.visualTimers.push(timerId);
  }

  private clearVisualHints(): void {
    this.hintCardIds = [];
    this.mismatchCardIds = [];
  }

  private clearVisualTimers(): void {
    this.visualTimers.forEach(timerId => clearTimeout(timerId));
    this.visualTimers = [];
  }

  private maybeShowStartupHint(): void {
    if (this.showSplash || this.showGuidelines) return;
    if (this.complete) return;
    const startupPairs = this.currentDifficulty === 'EASY' ? 2 : this.currentDifficulty === 'MEDIUM' ? 1 : 0;
    if (startupPairs > 0) {
      this.showStrongHintPreview(startupPairs);
    }
  }
}
