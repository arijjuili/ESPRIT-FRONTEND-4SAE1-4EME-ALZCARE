import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { PatientService } from '../../../core/services/patient.service';
import { SpeechCommandService } from '../../../core/services/speech-command.service';
import { DifficultyLevel, GameActivity, GameCatalogItem, GameType } from '../../../core/models/api.model';

interface GameCardView extends GameCatalogItem {
  route: string;
  accent: string;
  glow: string;
  badge: string;
  recommendedDifficulty: DifficultyLevel;
}

@Component({
  selector: 'app-patient-games',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './patient-games.component.html',
  styleUrls: ['./patient-games.component.scss']
})
export class PatientGamesComponent implements OnInit, OnDestroy {
  loading = false;
  error = '';
  games: GameCardView[] = [];
  dailyTarget = 2;
  todaySessions = 0;
  latestBadge: { title: string; description: string; icon: string } | null = null;
  voiceSupported = false;
  voiceListening = false;
  voiceStatus = '';
  recommendedByType: Partial<Record<GameType, DifficultyLevel>> = {};

  constructor(
    private apiService: ApiService,
    private authService: AuthService,
    private patientService: PatientService,
    private speechCommandService: SpeechCommandService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.voiceSupported = this.speechCommandService.isSupported();
    this.loadCatalog();
  }

  ngOnDestroy(): void {
    this.speechCommandService.stopListening();
  }

  loadCatalog(): void {
    this.loading = true;
    this.error = '';
    this.apiService.getGameCatalog().subscribe({
      next: (items) => {
        this.games = (items || []).map(item => this.toCardView(item));
        this.loadRecommendations();
        this.loadStats();
        this.loading = false;
      },
      error: (err) => {
        this.error = err.error?.detail || 'Failed to load games';
        this.loading = false;
      }
    });
  }

  playGame(game: GameCardView): void {
    this.router.navigate([game.route], {
      queryParams: { difficulty: game.recommendedDifficulty }
    });
  }

  get dailyProgressPercent(): number {
    return Math.min(100, Math.round((this.todaySessions / this.dailyTarget) * 100));
  }

  private loadStats(): void {
    const today = new Date().toISOString().split('T')[0];
    const sessions = this.readList('alzcare_game_sessions');
    this.todaySessions = sessions.filter(date => date === today).length;
    this.latestBadge = this.readObject('alzcare_latest_badge');
  }

  private toCardView(item: GameCatalogItem): GameCardView {
    const meta = this.gameMeta[item.gameType];
    const recommendedDifficulty = this.recommendedByType[item.gameType] || item.difficulty;
    return {
      ...item,
      route: meta.route,
      accent: meta.accent,
      glow: meta.glow,
      badge: meta.badge,
      recommendedDifficulty
    };
  }

  private loadRecommendations(): void {
    const userId = this.authService.getCurrentUser()?.id;
    if (!userId) return;

    this.apiService.getGameActivities(userId).subscribe({
      next: (activities) => {
        this.recommendedByType = this.computeRecommendations(activities || []);
        this.games = this.games.map(game => ({
          ...game,
          recommendedDifficulty: this.recommendedByType[game.gameType] || game.difficulty
        }));
      },
      error: () => {}
    });
  }

  private computeRecommendations(activities: GameActivity[]): Partial<Record<GameType, DifficultyLevel>> {
    const result: Partial<Record<GameType, DifficultyLevel>> = {};
    const gameTypes: GameType[] = ['MEMORY_MATCH', 'PATTERN_RECOGNITION', 'WORD_RECALL', 'SPATIAL_NAVIGATION', 'ATTENTION_TASK'];

    gameTypes.forEach(gameType => {
      const recent = activities
        .filter(activity => activity.gameType === gameType)
        .sort((a, b) => new Date(b.completedAt || b.createdAt).getTime() - new Date(a.completedAt || a.createdAt).getTime())
        .slice(0, 5);
      if (!recent.length) return;

      const avgAccuracy = recent.reduce((sum, activity) => {
        if (typeof activity.accuracyPercent === 'number') return sum + activity.accuracyPercent;
        if (activity.maxScore && activity.maxScore > 0 && typeof activity.score === 'number') {
          return sum + (activity.score / activity.maxScore) * 100;
        }
        return sum;
      }, 0) / recent.length;

      const avgMistakes = recent.reduce((sum, activity) => sum + (activity.mistakesMade || 0), 0) / recent.length;
      if (avgAccuracy >= 85 && avgMistakes <= 1) {
        result[gameType] = 'HARD';
      } else if (avgAccuracy >= 60) {
        result[gameType] = 'MEDIUM';
      } else {
        result[gameType] = 'EASY';
      }
    });

    return result;
  }

  toggleVoiceCommands(): void {
    if (!this.voiceSupported) {
      this.voiceStatus = 'Voice commands are not supported in this browser.';
      return;
    }

    if (this.voiceListening) {
      this.speechCommandService.stopListening();
      this.voiceListening = false;
      this.voiceStatus = 'Voice commands stopped.';
      return;
    }

    const started = this.speechCommandService.startListening(
      (command) => this.handleVoiceCommand(command),
      () => {}
    );
    this.voiceListening = started;
    if (started) {
      this.voiceStatus = 'Listening. Try: "play attention task".';
    }
  }

  private handleVoiceCommand(command: string): void {
    const game = this.findGameFromVoice(command);
    if (!game) {
      this.voiceStatus = 'I could not match a game name. Please repeat.';
      return;
    }
    this.voiceStatus = `Opening ${game.name}.`;
    this.playGame(game);
  }

  private findGameFromVoice(command: string): GameCardView | null {
    const normalized = command.toLowerCase();
    for (const game of this.games) {
      const name = game.name.toLowerCase();
      if (normalized.includes(name)) return game;
    }

    const tokens = normalized.replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
    const hasClose = (target: string): boolean => tokens.some(token => this.isClose(token, target));

    if (normalized.includes('attention') || hasClose('attention')) {
      return this.games.find(game => game.gameType === 'ATTENTION_TASK') || null;
    }
    if (normalized.includes('memory') || hasClose('memory')) {
      return this.games.find(game => game.gameType === 'MEMORY_MATCH') || null;
    }
    if (normalized.includes('pattern') || hasClose('pattern')) {
      return this.games.find(game => game.gameType === 'PATTERN_RECOGNITION') || null;
    }
    if (normalized.includes('word') || hasClose('word')) {
      return this.games.find(game => game.gameType === 'WORD_RECALL') || null;
    }
    if (normalized.includes('spatial') || normalized.includes('navigation') || hasClose('spatial') || hasClose('navigation')) {
      return this.games.find(game => game.gameType === 'SPATIAL_NAVIGATION') || null;
    }
    return null;
  }

  private isClose(input: string, target: string): boolean {
    if (input === target) return true;
    if (!input || !target) return false;
    const distance = this.levenshtein(input, target);
    return target.length <= 4 ? distance <= 1 : distance <= 2;
  }

  private levenshtein(a: string, b: string): number {
    const dp: number[][] = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
    for (let i = 0; i <= a.length; i++) dp[i][0] = i;
    for (let j = 0; j <= b.length; j++) dp[0][j] = j;
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,
          dp[i][j - 1] + 1,
          dp[i - 1][j - 1] + cost
        );
      }
    }
    return dp[a.length][b.length];
  }

  private gameMeta: Record<GameType, { route: string; accent: string; glow: string; badge: string }> = {
    MEMORY_MATCH: {
      route: '/patient/games/memory-match',
      accent: 'from-sky-100 via-blue-100 to-indigo-100',
      glow: 'shadow-[0_20px_50px_-20px_rgba(56,189,248,0.7)]',
      badge: 'bg-sky-600'
    },
    PATTERN_RECOGNITION: {
      route: '/patient/games/pattern-recognition',
      accent: 'from-pink-100 via-rose-100 to-orange-100',
      glow: 'shadow-[0_20px_50px_-20px_rgba(244,114,182,0.65)]',
      badge: 'bg-rose-600'
    },
    WORD_RECALL: {
      route: '/patient/games/word-recall',
      accent: 'from-emerald-100 via-lime-100 to-yellow-100',
      glow: 'shadow-[0_20px_50px_-20px_rgba(16,185,129,0.65)]',
      badge: 'bg-emerald-600'
    },
    SPATIAL_NAVIGATION: {
      route: '/patient/games/spatial-navigation',
      accent: 'from-indigo-100 via-violet-100 to-purple-100',
      glow: 'shadow-[0_20px_50px_-20px_rgba(99,102,241,0.6)]',
      badge: 'bg-indigo-600'
    },
    ATTENTION_TASK: {
      route: '/patient/games/attention-task',
      accent: 'from-amber-100 via-yellow-100 to-orange-100',
      glow: 'shadow-[0_20px_50px_-20px_rgba(245,158,11,0.6)]',
      badge: 'bg-amber-600'
    }
  };

  private readList(key: string): string[] {
    try {
      const raw = localStorage.getItem(key);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private readObject(key: string): { title: string; description: string; icon: string } | null {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { title: string; description: string; icon: string } | null;
      if (!parsed || !parsed.title) return null;
      return parsed;
    } catch {
      return null;
    }
  }
}
