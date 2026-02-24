import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { GameCatalogItem, GameType } from '../../../core/models/api.model';

interface GameCardView extends GameCatalogItem {
  route: string;
  accent: string;
  glow: string;
  badge: string;
}

@Component({
  selector: 'app-patient-games',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './patient-games.component.html',
  styleUrls: ['./patient-games.component.scss']
})
export class PatientGamesComponent implements OnInit {
  loading = false;
  error = '';
  games: GameCardView[] = [];
  dailyTarget = 2;
  todaySessions = 0;
  latestBadge: { title: string; description: string; icon: string } | null = null;

  constructor(private apiService: ApiService, private router: Router) {}

  ngOnInit(): void {
    this.loadCatalog();
  }

  loadCatalog(): void {
    this.loading = true;
    this.error = '';
    this.apiService.getGameCatalog().subscribe({
      next: (items) => {
        this.games = (items || []).map(item => this.toCardView(item));
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
    this.router.navigate([game.route]);
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
    return {
      ...item,
      route: meta.route,
      accent: meta.accent,
      glow: meta.glow,
      badge: meta.badge
    };
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
