import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData } from 'chart.js';
import { Chart, registerables } from 'chart.js';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { PatientService, PatientProfileResponse } from '../../../core/services/patient.service';
import { GameActivity } from '../../../core/models/api.model';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

Chart.register(...registerables);

interface PatientGameDetail {
  gameType: string;
  gameName: string;
  icon: string;
  color: string;
  totalPlays: number;
  avgScore: number;
  bestScore: number;
  recentScores: number[];
  trend: 'improving' | 'stable' | 'declining';
}

@Component({
  selector: 'app-patient-analytics',
  standalone: true,
  imports: [CommonModule, RouterModule, BaseChartDirective],
  templateUrl: './patient-analytics.component.html',
  styleUrls: ['./patient-analytics.component.scss']
})
export class PatientAnalyticsComponent implements OnInit, OnDestroy {
  patient: PatientProfileResponse | null = null;
  gameDetails: PatientGameDetail[] = [];
  overallStats = {
    totalGames: 0,
    avgScore: 0,
    totalTime: 0,
    favoriteGame: '',
    trend: 'stable' as 'improving' | 'stable' | 'declining'
  };
  isLoading = true;
  error = '';

  radarChartData: ChartData<'radar'> = { datasets: [] };
  radarChartOptions: ChartConfiguration<'radar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      r: {
        beginAtZero: true,
        max: 100,
        ticks: { stepSize: 20, display: false },
        grid: { color: '#e5e7eb' },
        pointLabels: { font: { size: 12 }, color: '#6b7280' }
      }
    },
    plugins: { legend: { display: false } }
  };

  lineChartData: ChartData<'line'> = { datasets: [] };
  lineChartOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: { grid: { display: false }, ticks: { color: '#9ca3af' } },
      y: { beginAtZero: true, max: 100, grid: { color: '#e5e7eb' }, ticks: { color: '#9ca3af' } }
    },
    plugins: { legend: { display: false } },
    elements: { line: { tension: 0.4 }, point: { radius: 4, hoverRadius: 6 } }
  };

  private destroy$ = new Set<void>();

  constructor(
    private route: ActivatedRoute,
    private apiService: ApiService,
    private authService: AuthService,
    private patientService: PatientService
  ) {}

  ngOnInit(): void {
    const patientId = this.route.snapshot.paramMap.get('id');
    if (!patientId) {
      this.error = 'Patient ID not found';
      this.isLoading = false;
      return;
    }
    this.loadPatientData(patientId);
  }

  ngOnDestroy(): void {
    this.destroy$.forEach(d => d);
  }

  private loadPatientData(userId: string): void {
    this.isLoading = true;
    this.error = '';

    this.patientService.getPatientByUserId(userId).pipe(
      catchError(err => {
        console.error('Error loading patient:', err);
        return of(null);
      })
    ).subscribe(patient => {
      if (!patient) {
        this.error = 'Patient not found';
        this.isLoading = false;
        return;
      }

      this.patient = patient;
      this.apiService.getGameActivities(userId).pipe(
        catchError(err => {
          console.error('Error loading game activities:', err);
          return of([]);
        })
      ).subscribe(activities => {
        this.processGameData(activities);
        this.isLoading = false;
      });
    });
  }

  private processGameData(activities: GameActivity[]): void {
    const gameNames: Record<string, string> = {
      'MEMORY_MATCH': 'Memory Match',
      'PATTERN_RECOGNITION': 'Pattern Recognition',
      'WORD_RECALL': 'Word Recall',
      'SPATIAL_NAVIGATION': 'Spatial Navigation',
      'ATTENTION_TASK': 'Attention Task'
    };
    const gameIcons: Record<string, string> = {
      'MEMORY_MATCH': '🎴',
      'PATTERN_RECOGNITION': '🎨',
      'WORD_RECALL': '📝',
      'SPATIAL_NAVIGATION': '🧭',
      'ATTENTION_TASK': '🎯'
    };
    const gameColors: Record<string, string> = {
      'MEMORY_MATCH': '#8b5cf6',
      'PATTERN_RECOGNITION': '#ec4899',
      'WORD_RECALL': '#14b8a6',
      'SPATIAL_NAVIGATION': '#f59e0b',
      'ATTENTION_TASK': '#3b82f6'
    };

    const gameMap = new Map<string, GameActivity[]>();
    activities.forEach(activity => {
      const existing = gameMap.get(activity.gameType) || [];
      existing.push(activity);
      gameMap.set(activity.gameType, existing);
    });

    this.gameDetails = Array.from(gameMap.entries()).map(([gameType, gameActivities]) => {
      const scores = gameActivities.map(a => a.score || 0).filter(s => s > 0);
      const recentScores = gameActivities
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 10)
        .map(a => a.score || 0);

      let trend: 'improving' | 'stable' | 'declining' = 'stable';
      if (recentScores.length >= 5) {
        const recent = recentScores.slice(0, Math.floor(recentScores.length / 2));
        const older = recentScores.slice(Math.floor(recentScores.length / 2));
        const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
        const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
        if (recentAvg > olderAvg + 10) trend = 'improving';
        else if (olderAvg > recentAvg + 10) trend = 'declining';
      }

      return {
        gameType,
        gameName: gameNames[gameType] || gameType,
        icon: gameIcons[gameType] || '🎮',
        color: gameColors[gameType] || '#6b7280',
        totalPlays: gameActivities.length,
        avgScore: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0,
        bestScore: scores.length ? Math.max(...scores) : 0,
        recentScores: recentScores.reverse(),
        trend
      };
    });

    const totalGames = activities.length;
    const allScores = activities.map(a => a.score || 0).filter(s => s > 0);
    const avgScore = allScores.length ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length) : 0;
    const totalTime = activities.reduce((sum, a) => sum + (a.durationSeconds || 0), 0);

    const gamePlays = Array.from(gameMap.entries()).sort((a, b) => b[1].length - a[1].length);
    const favoriteGame = gamePlays.length ? (gameNames[gamePlays[0][0]] || gamePlays[0][0]) : '';

    let overallTrend: 'improving' | 'stable' | 'declining' = 'stable';
    if (allScores.length >= 5) {
      const sorted = activities.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      const recent = sorted.slice(0, Math.floor(sorted.length / 2));
      const older = sorted.slice(Math.floor(sorted.length / 2));
      const recentAvg = recent.reduce((sum, a) => sum + (a.score || 0), 0) / recent.length;
      const olderAvg = older.reduce((sum, a) => sum + (a.score || 0), 0) / older.length;
      if (recentAvg > olderAvg + 10) overallTrend = 'improving';
      else if (olderAvg > recentAvg + 10) overallTrend = 'declining';
    }

    this.overallStats = {
      totalGames,
      avgScore,
      totalTime,
      favoriteGame,
      trend: overallTrend
    };

    this.buildCharts(activities);
  }

  private buildCharts(activities: GameActivity[]): void {
    const domains = ['memory', 'cognitive', 'attention', 'spatial'];
    const domainScores = domains.map(domain => {
      const domainActivities = activities.filter(a => 
        (a.targetDomain || '').toLowerCase() === domain.toLowerCase()
      );
      const scores = domainActivities.map(a => a.score || 0).filter(s => s > 0);
      return scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    });

    this.radarChartData = {
      labels: ['Memory', 'Cognitive', 'Attention', 'Spatial'],
      datasets: [{
        data: domainScores,
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        borderColor: '#3b82f6',
        borderWidth: 2,
        pointBackgroundColor: '#3b82f6',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: '#3b82f6'
      }]
    };

    const days = this.getLast14Days();
    const datasets = this.gameDetails.slice(0, 3).map((game, idx) => {
      const colors = ['#8b5cf6', '#ec4899', '#14b8a6'];
      return {
        label: game.gameName,
        data: days.map(day => {
          const dayActivities = activities.filter(a =>
            a.gameType === game.gameType &&
            this.isSameDay(new Date(a.createdAt), day)
          );
          const scores = dayActivities.map(a => a.score || 0).filter(s => s > 0);
          return scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
        }),
        borderColor: colors[idx],
        backgroundColor: colors[idx] + '20',
        fill: true
      };
    });

    this.lineChartData = {
      labels: days.map(d => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
      datasets
    };
  }

  private getLast14Days(): Date[] {
    const days: Date[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(d);
    }
    return days;
  }

  private isSameDay(date1: Date, date2: Date): boolean {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  }

  getTrendClass(trend: string): string {
    return trend === 'improving' ? 'text-green-500' :
           trend === 'declining' ? 'text-red-500' : 'text-gray-500';
  }

  getTrendIcon(trend: string): string {
    return trend === 'improving' ? '↑' :
           trend === 'declining' ? '↓' : '→';
  }

  formatTime(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  }
}
