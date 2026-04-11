import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ApiService } from '../../../../core/services/api.service';
import { AuthService } from '../../../../core/services/auth.service';
import { DifficultyLevel, GameActivityCreateRequest } from '../../../../core/models/api.model';
import { GameSplashComponent } from '../../../../shared/components/game-splash/game-splash.component';
import { GameGuidelinesComponent, GuidelineStep } from '../../../../shared/components/game-guidelines/game-guidelines.component';

interface PatternColor {
  label: string;
  className: string;
}

@Component({
  selector: 'app-pattern-recognition',
  standalone: true,
  imports: [CommonModule, RouterModule, GameSplashComponent, GameGuidelinesComponent],
  templateUrl: './pattern-recognition.component.html',
  styleUrls: ['./pattern-recognition.component.scss']
})
export class PatternRecognitionComponent implements OnDestroy, OnInit {
  showSplash = true;
  showGuidelines = false;
  
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
  currentDifficulty: DifficultyLevel = 'EASY';
  assistedMode = false;
  hintLevel = 0;
  timeMultiplier = 1;
  cueMode = 'none';
  breakSuggestion = false;
  adaptationReason = '';
  hintIndices: number[] = [];
  private revealLeadCount = 0;

  guidelineSteps: GuidelineStep[] = [
    { title: 'Watch the Pattern', description: 'Pay attention to the color sequence shown.', icon: '👀' },
    { title: 'Repeat the Sequence', description: 'Click the colors in the same order as shown.', icon: '🔁' },
    { title: 'Advance Rounds', description: 'Each round adds one more color to remember!', icon: '🎯' }
  ];

  constructor(
    private apiService: ApiService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadAdaptationProfile();
  }

  onSplashComplete(): void {
    this.showSplash = false;
    this.showGuidelines = true;
  }

  onGuidelinesClose(): void {
    this.showGuidelines = false;
  }

  startGame(): void {
    this.started = true;
    this.round = 1;
    this.sequence = [];
    this.lastRoundReached = 0;
    this.finishRound = this.currentDifficulty === 'HARD' ? 6 : this.currentDifficulty === 'MEDIUM' ? 5 : 4;
    this.message = 'Press Start to see the pattern.';
    this.hintIndices = [];
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
    this.hintIndices = [];
    this.revealLeadCount = this.resolveRevealLeadCount();
    this.sequence.forEach((index, i) => {
      const timeoutId = window.setTimeout(() => {
        this.activeIndex = index;
        window.setTimeout(() => (this.activeIndex = null), Math.round(400 * this.timeMultiplier));
        if (i === this.sequence.length - 1) {
          window.setTimeout(() => {
            this.showing = false;
            this.activateHintGuidance();
            this.message = this.effectiveHintLevel > 0
              ? `Your turn! Repeat the pattern. ${this.getHintPrompt()}`
              : 'Your turn! Repeat the pattern.';
          }, Math.round(600 * this.timeMultiplier));
        }
      }, Math.round(700 * this.timeMultiplier) * (i + 1));
      this.timeouts.push(timeoutId);
    });
  }

  pickColor(index: number): void {
    if (this.showing) return;
    this.playerInput.push(index);
    this.hintIndices = [];
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
      this.message = `${picked} You reached round ${achieved}.${this.effectiveHintLevel >= 2 ? ` ${this.getRecoveryHint(currentIndex)}` : ''}`;
      this.started = false;
      this.playerInput = [];
      this.recordToDb();
      return;
    }

    if (this.playerInput.length === this.sequence.length) {
      this.round += 1;
      if (this.round > this.finishRound) {
        this.started = false;
        this.lastRoundReached = this.finishRound;
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
    this.recordToDb();
  }

  private recordToDb(): void {
    const userId = this.authService.getCurrentUser()?.id;
    if (!userId) return;
    const reached = Math.max(1, this.lastRoundReached);
    const roundScore = Math.round((reached / this.finishRound) * 100);
    const mistakes = reached >= this.finishRound ? 0 : 1;
    const payload: GameActivityCreateRequest = {
      patientId: userId,
      gameType: 'PATTERN_RECOGNITION',
      difficulty: this.currentDifficulty,
      targetDomain: 'cognitive',
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      durationSeconds: 0,
      score: roundScore,
      maxScore: 100,
      voiceUsed: false,
      mistakesMade: mistakes,
      pointsEarned: roundScore,
      adaptiveMode: this.assistedMode,
      difficultyAdjustments: 0,
      voiceCommandCount: 0,
      hintsUsed: this.effectiveHintLevel,
      accuracyPercent: roundScore
    };
    this.apiService.createGameActivity(payload).subscribe({
      next: () => this.loadAdaptationProfile(),
      error: () => {}
    });
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

  private loadAdaptationProfile(): void {
    const userId = this.authService.getCurrentUser()?.id;
    if (!userId) return;
    this.apiService.getGameAdaptation(userId, 'PATTERN_RECOGNITION').subscribe({
      next: (profile) => {
        this.currentDifficulty = profile.recommendedDifficulty || 'EASY';
        this.assistedMode = !!profile.assistedMode;
        this.hintLevel = profile.hintLevel || 0;
        this.timeMultiplier = Math.max(1, profile.timeMultiplier || 1);
        this.cueMode = profile.cueMode || 'none';
        this.breakSuggestion = !!profile.breakSuggestion;
        this.adaptationReason = profile.reason || '';
        this.finishRound = this.currentDifficulty === 'HARD' ? 6 : this.currentDifficulty === 'MEDIUM' ? 5 : 4;
      },
      error: () => {}
    });
  }

  isHintIndex(index: number): boolean {
    return this.hintIndices.includes(index);
  }

  get effectiveHintLevel(): number {
    const baseline = this.currentDifficulty === 'EASY' ? 3 : this.currentDifficulty === 'MEDIUM' ? 1 : 0;
    return Math.max(this.hintLevel, baseline);
  }

  private resolveRevealLeadCount(): number {
    if (this.effectiveHintLevel >= 3) return Math.min(3, this.sequence.length);
    if (this.effectiveHintLevel >= 2) return Math.min(2, this.sequence.length);
    if (this.effectiveHintLevel >= 1) return 1;
    return 0;
  }

  private activateHintGuidance(): void {
    if (this.revealLeadCount <= 0) return;
    this.hintIndices = this.sequence.slice(0, this.revealLeadCount);
    const timeoutId = window.setTimeout(() => {
      this.hintIndices = [];
    }, Math.round(1500 * Math.max(1, this.timeMultiplier)));
    this.timeouts.push(timeoutId);
  }

  private getHintPrompt(): string {
    if (this.effectiveHintLevel >= 3) return 'Hint: focus on the first 3 colors.';
    if (this.effectiveHintLevel >= 2) return 'Hint: focus on the first 2 colors.';
    return 'Hint: remember the first color.';
  }

  private getRecoveryHint(position: number): string {
    const safeIndex = Math.max(0, Math.min(position, this.sequence.length - 1));
    const correctIndex = this.sequence[safeIndex];
    const label = this.colors[correctIndex]?.label || 'color';
    return `Tip: color ${safeIndex + 1} should be ${label}.`;
  }
}
