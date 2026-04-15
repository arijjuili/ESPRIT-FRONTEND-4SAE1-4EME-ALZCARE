import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ApiService } from '../../../core/services/api.service';
import { ActivityService } from '../../../core/services/activity.service';
import { PatientService, PatientProfileResponse } from '../../../core/services/patient.service';
import { GameCatalogItem, GameActivity, MemoryItem } from '../../../core/models/api.model';
import { ActivityResponse } from '../../../core/models/activity.model';

interface Game {
  id: number;
  name: string;
  category: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  plays: number;
  avgScore: number;
  status: 'active' | 'maintenance';
  icon: string;
}

interface MemoryItemUi {
  id: string;
  patientName: string;
  type: 'photo' | 'audio' | 'video' | 'note';
  title: string;
  dateAdded: string;
  size: string;
}

interface ActivityUi {
  id: string;
  name: string;
  date: string;
  participants: number;
  maxParticipants: number;
  location: string;
}

@Component({
  selector: 'app-admin-interactive',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './admin-interactive.component.html',
  styleUrls: ['./admin-interactive.component.scss']
})
export class AdminInteractiveComponent implements OnInit {
  loading = false;

  interactiveStats = [
    { label: 'Cognitive Games', value: 0, icon: '🎮', color: 'violet', change: '—' },
    { label: 'Games Played Today', value: 0, icon: '📊', color: 'success', change: '—' },
    { label: 'Memory Items', value: 0, icon: '📷', color: 'blue', change: '—' },
    { label: 'Social Activities', value: 0, icon: '🎉', color: 'amber', change: '—' }
  ];

  games: Game[] = [];
  memoryItems: MemoryItemUi[] = [];
  activities: ActivityUi[] = [];

  constructor(
    private apiService: ApiService,
    private activityService: ActivityService,
    private patientService: PatientService
  ) {}

  ngOnInit(): void {
    this.loadInteractiveData();
  }

  private loadInteractiveData(): void {
    this.loading = true;

    forkJoin({
      gameCatalog: this.apiService.getGameCatalog().pipe(catchError(() => of([]))),
      gameActivities: this.apiService.getGameActivities().pipe(catchError(() => of([]))),
      memoryItems: this.apiService.getMemoryItems().pipe(catchError(() => of([]))),
      activities: this.activityService.getUpcomingActivities().pipe(catchError(() => of([]))),
      patients: this.patientService.getPatients().pipe(catchError(() => of([])))
    }).subscribe(({ gameCatalog, gameActivities, memoryItems, activities, patients }) => {
      const patientMap = new Map<string, string>();
      patients.forEach(p => patientMap.set(p.id, `${p.firstName} ${p.lastName}`));

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayPlays = gameActivities.filter(a => {
        const d = new Date(a.createdAt);
        return d >= today;
      });

      this.interactiveStats = [
        { label: 'Cognitive Games', value: gameCatalog.length, icon: '🎮', color: 'violet', change: 'Available catalog' },
        { label: 'Games Played Today', value: todayPlays.length, icon: '📊', color: 'success', change: todayPlays.length > 0 ? 'Sessions today' : 'No sessions today' },
        { label: 'Memory Items', value: memoryItems.length, icon: '📷', color: 'blue', change: 'Total stored memories' },
        { label: 'Social Activities', value: activities.length, icon: '🎉', color: 'amber', change: activities.length > 0 ? 'Upcoming events' : 'No upcoming events' }
      ];

      this.games = this.mapGames(gameCatalog, gameActivities);
      this.memoryItems = this.mapMemoryItems(memoryItems, patientMap);
      this.activities = this.mapActivities(activities);

      this.loading = false;
    });
  }

  private mapGames(catalog: GameCatalogItem[], activities: GameActivity[]): Game[] {
    const statsByType = new Map<string, { plays: number; totalScore: number; scoredPlays: number }>();
    activities.forEach(a => {
      const s = statsByType.get(a.gameType) || { plays: 0, totalScore: 0, scoredPlays: 0 };
      s.plays++;
      if (a.score != null && a.maxScore != null && a.maxScore > 0) {
        s.totalScore += (a.score / a.maxScore) * 100;
        s.scoredPlays++;
      }
      statsByType.set(a.gameType, s);
    });

    return catalog.map((item, index) => {
      const stats = statsByType.get(item.gameType);
      const avgScore = stats && stats.scoredPlays > 0
        ? Math.round(stats.totalScore / stats.scoredPlays)
        : 0;
      const plays = stats?.plays || 0;

      return {
        id: index + 1,
        name: item.name,
        category: this.formatGameCategory(item.gameType),
        description: item.description,
        difficulty: item.difficulty.toLowerCase() as 'easy' | 'medium' | 'hard',
        plays,
        avgScore,
        status: 'active' as const,
        icon: item.icon || '🎮'
      };
    });
  }

  private mapMemoryItems(items: MemoryItem[], patientMap: Map<string, string>): MemoryItemUi[] {
    return items.map(item => ({
      id: item.id,
      patientName: patientMap.get(item.patientId) || 'Unknown Patient',
      type: this.inferMemoryType(item),
      title: item.title,
      dateAdded: item.createdAt ? item.createdAt.split('T')[0] : '—',
      size: '—'
    }));
  }

  private mapActivities(activities: ActivityResponse[]): ActivityUi[] {
    return activities.map(a => ({
      id: a.id,
      name: a.title,
      date: this.formatActivityDate(a.startDate),
      participants: a.registeredCount,
      maxParticipants: a.maxCapacity,
      location: a.location
    }));
  }

  private formatGameCategory(gameType: string): string {
    return gameType
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, c => c.toUpperCase());
  }

  private inferMemoryType(item: MemoryItem): 'photo' | 'audio' | 'video' | 'note' {
    if (!item.imageUrl) return 'note';
    const url = item.imageUrl.toLowerCase();
    if (url.endsWith('.mp4') || url.endsWith('.webm') || url.endsWith('.mov')) return 'video';
    if (url.endsWith('.mp3') || url.endsWith('.wav') || url.endsWith('.ogg')) return 'audio';
    return 'photo';
  }

  private formatActivityDate(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const isTomorrow = date.toDateString() === tomorrow.toDateString();

    const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

    if (isToday) return `Today, ${time}`;
    if (isTomorrow) return `Tomorrow, ${time}`;
    const month = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `${month}, ${time}`;
  }

  getDifficultyClass(difficulty: string): string {
    const classes: Record<string, string> = {
      easy: 'bg-emerald-100 text-emerald-700',
      medium: 'bg-amber-100 text-amber-700',
      hard: 'bg-rose-100 text-rose-700'
    };
    return classes[difficulty] || 'bg-gray-100 text-gray-700';
  }

  getTypeIcon(type: string): string {
    const icons: Record<string, string> = {
      photo: '📷',
      audio: '🎵',
      video: '🎬',
      note: '📝'
    };
    return icons[type] || '📄';
  }

  getTypeClass(type: string): string {
    const classes: Record<string, string> = {
      photo: 'bg-blue-100 text-blue-600',
      audio: 'bg-violet-100 text-violet-600',
      video: 'bg-rose-100 text-rose-600',
      note: 'bg-amber-100 text-amber-600'
    };
    return classes[type] || 'bg-gray-100 text-gray-600';
  }
}
