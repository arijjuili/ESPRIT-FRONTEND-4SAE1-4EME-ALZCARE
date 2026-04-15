import { Component, OnInit, HostBinding, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData } from 'chart.js';
import { Chart, registerables } from 'chart.js';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { PdfExportService } from '../../../core/services/pdf-export.service';
import { PatientProfileResponse } from '../../../core/services/patient.service';
import { CaregiverPatientContextService } from '../../../core/services/caregiver-patient-context.service';
import { GameActivity, GamificationBadgeEvent, GameType } from '../../../core/models/api.model';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

Chart.register(...registerables);

interface GameStats {
  name: string;
  icon: string;
  totalPlays: number;
  avgScore: number;
  trend: number;
  color: string;
}

interface PatientProgress {
  id: string;
  name: string;
  avatar: string;
  totalGames: number;
  avgScore: number;
  lastPlayed: string;
  trend: 'up' | 'down' | 'stable';
}

@Component({
  selector: 'app-caregiver-game-analytics',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, BaseChartDirective],
  templateUrl: './caregiver-game-analytics.component.html',
  styleUrls: ['./caregiver-game-analytics.component.scss']
})
export class CaregiverGameAnalyticsComponent implements OnInit, OnDestroy {
  @HostBinding('style.--role-primary') primaryColor = '#10b981';
  
  selectedTimeRange = 'week';
  selectedGame = 'all';
  isLoading = true;
  animatedCards: number[] = [];
  error: string | null = null;
  hasData = false;
  badgeTimelineLoading = false;
  badgeTimeline: GamificationBadgeEvent[] = [];
  selectedTimelinePatientId = '';

  gameStats: GameStats[] = [];
  patients: PatientProgress[] = [];
  
  private allGameActivities: GameActivity[] = [];
  private allPatients: PatientProfileResponse[] = [];

  private readonly GAME_TYPE_MAP: Record<string, string> = {
    'memory': 'MEMORY_MATCH',
    'pattern': 'PATTERN_RECOGNITION',
    'word': 'WORD_RECALL',
    'attention': 'ATTENTION_TASK'
  };

  lineChartData: ChartData<'line'> = { labels: [], datasets: [] };
  doughnutChartData: ChartData<'doughnut'> = { labels: [], datasets: [] };
  barChartData: ChartData<'bar'> = { labels: [], datasets: [] };
  radarChartData: ChartData<'radar'> = { labels: [], datasets: [] };

  lineChartOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true, position: 'top', labels: { usePointStyle: true, padding: 20, font: { size: 12 } } },
      tooltip: { backgroundColor: 'rgba(0, 0, 0, 0.8)', titleFont: { size: 14 }, bodyFont: { size: 13 }, padding: 12, cornerRadius: 8 }
    },
    scales: {
      x: { grid: { display: false }, ticks: { font: { size: 11 } } },
      y: { beginAtZero: true, max: 100, grid: { color: 'rgba(0, 0, 0, 0.05)' }, ticks: { font: { size: 11 } } }
    },
    interaction: { intersect: false, mode: 'index' }
  };

  doughnutChartOptions: ChartConfiguration<'doughnut'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '65%',
    plugins: { legend: { display: true, position: 'right', labels: { usePointStyle: true, padding: 15, font: { size: 11 } } } }
  };

  barChartOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: true, position: 'top', labels: { usePointStyle: true, padding: 20, font: { size: 12 } } } },
    scales: {
      x: { grid: { display: false }, ticks: { font: { size: 11 } } },
      y: { beginAtZero: true, grid: { color: 'rgba(0, 0, 0, 0.05)' }, ticks: { font: { size: 11 } } }
    }
  };

  radarChartOptions: ChartConfiguration<'radar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: true, position: 'top', labels: { usePointStyle: true, padding: 15, font: { size: 12 } } } },
    scales: {
      r: { beginAtZero: true, max: 100, ticks: { stepSize: 20, font: { size: 10 } }, grid: { color: 'rgba(0, 0, 0, 0.1)' }, pointLabels: { font: { size: 11 } } }
    }
  };

  constructor(
    private apiService: ApiService,
    private authService: AuthService,
    private pdfExportService: PdfExportService,
    private caregiverPatientContext: CaregiverPatientContextService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  ngOnDestroy(): void {}

  viewPatientDetails(patientId: string): void {
    this.router.navigate(['/caregiver/cognitive-patient', patientId]);
  }

  private getFilteredActivities(): GameActivity[] {
    if (this.selectedGame === 'all') {
      return this.allGameActivities;
    }
    const targetType = this.GAME_TYPE_MAP[this.selectedGame];
    return this.allGameActivities.filter(a => a.gameType === targetType);
  }

  loadData(): void {
    this.isLoading = true;
    this.error = null;
    this.animatedCards = [];

    const user = this.authService.getCurrentUser();
    if (!user) {
      this.error = 'User not authenticated';
      this.loadFallbackData();
      return;
    }

    this.caregiverPatientContext.getAssignedPatients().pipe(
      catchError(err => {
        console.error('Error fetching patients:', err);
        return of([] as PatientProfileResponse[]);
      })
    ).subscribe(patients => {
      this.allPatients = patients || [];
      
      if (patients && patients.length > 0) {
        const patientIds = patients.map(p => p.userId);
        const activities$ = patientIds.map(pid => 
          this.apiService.getGameActivities(pid).pipe(catchError(() => of([])))
        );
        
        forkJoin(activities$).subscribe({
          next: (activitiesArrays) => {
            this.allGameActivities = activitiesArrays.flat();
            if (this.allGameActivities.length > 0) {
              this.hasData = true;
            }
            this.processData();
            this.loadBadgeTimeline();
            this.isLoading = false;
          },
          error: (err) => {
            console.error('Error fetching game activities:', err);
            this.loadFallbackData();
            this.isLoading = false;
          }
        });
      } else {
        this.loadFallbackData();
        this.badgeTimeline = [];
        this.isLoading = false;
      }
    });
  }

  private loadFallbackData(): void {
    this.gameStats = [
      { name: 'Memory Match', icon: '🎴', totalPlays: 0, avgScore: 0, trend: 0, color: '#8b5cf6' },
      { name: 'Pattern Recognition', icon: '🎨', totalPlays: 0, avgScore: 0, trend: 0, color: '#ec4899' },
      { name: 'Word Recall', icon: '📝', totalPlays: 0, avgScore: 0, trend: 0, color: '#14b8a6' },
      { name: 'Spatial Navigation', icon: '🧭', totalPlays: 0, avgScore: 0, trend: 0, color: '#f59e0b' },
      { name: 'Attention Task', icon: '🎯', totalPlays: 0, avgScore: 0, trend: 0, color: '#3b82f6' }
    ];

    this.patients = [];

    this.lineChartData = {
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      datasets: [
        {
          label: 'No Data',
          data: [0, 0, 0, 0, 0, 0, 0],
          borderColor: '#9ca3af',
          backgroundColor: 'rgba(156, 163, 175, 0.1)',
          fill: true,
          tension: 0.4
        }
      ]
    };

    this.doughnutChartData = {
      labels: ['No game data yet'],
      datasets: [{ data: [1], backgroundColor: ['#e5e7eb'], borderWidth: 0 }]
    };

    this.barChartData = {
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      datasets: [
        { label: 'This Week', data: [0, 0, 0, 0, 0, 0, 0], backgroundColor: '#10b981', borderRadius: 6 },
        { label: 'Last Week', data: [0, 0, 0, 0, 0, 0, 0], backgroundColor: '#d1fae5', borderRadius: 6 }
      ]
    };

    this.radarChartData = {
      labels: ['Memory', 'Attention', 'Pattern Recognition', 'Language', 'Spatial'],
      datasets: [
        {
          label: 'No Data',
          data: [0, 0, 0, 0, 0],
          borderColor: '#9ca3af',
          backgroundColor: 'rgba(156, 163, 175, 0.1)'
        }
      ]
    };

    this.animateCards();
  }

  private processData(): void {
    this.processGameStats();
    this.processPatients();
    this.processLineChart();
    this.processDoughnutChart();
    this.processBarChart();
    this.processRadarChart();
    this.animateCards();
  }

  private processGameStats(): void {
    const gameColors: Record<string, string> = {
      'MEMORY_MATCH': '#8b5cf6',
      'PATTERN_RECOGNITION': '#ec4899',
      'WORD_RECALL': '#14b8a6',
      'SPATIAL_NAVIGATION': '#f59e0b',
      'ATTENTION_TASK': '#3b82f6'
    };

    const gameIcons: Record<string, string> = {
      'MEMORY_MATCH': '🎴',
      'PATTERN_RECOGNITION': '🎨',
      'WORD_RECALL': '📝',
      'SPATIAL_NAVIGATION': '🧭',
      'ATTENTION_TASK': '🎯'
    };

    const gameNames: Record<string, string> = {
      'MEMORY_MATCH': 'Memory Match',
      'PATTERN_RECOGNITION': 'Pattern Recognition',
      'WORD_RECALL': 'Word Recall',
      'SPATIAL_NAVIGATION': 'Spatial Navigation',
      'ATTENTION_TASK': 'Attention Task'
    };

    const gameMap = new Map<string, { plays: number; scores: number[] }>();
    const filteredActivities = this.getFilteredActivities();
    
    filteredActivities.forEach(activity => {
      const gameType = activity.gameType;
      if (!gameMap.has(gameType)) {
        gameMap.set(gameType, { plays: 0, scores: [] });
      }
      const data = gameMap.get(gameType)!;
      data.plays++;
      if (activity.score) data.scores.push(activity.score);
    });

    if (gameMap.size === 0) {
      if (this.selectedGame === 'all') {
        this.gameStats = [
          { name: 'Memory Match', icon: '🎴', totalPlays: 0, avgScore: 0, trend: 0, color: '#8b5cf6' },
          { name: 'Pattern Recognition', icon: '🎨', totalPlays: 0, avgScore: 0, trend: 0, color: '#ec4899' },
          { name: 'Word Recall', icon: '📝', totalPlays: 0, avgScore: 0, trend: 0, color: '#14b8a6' },
          { name: 'Spatial Navigation', icon: '🧭', totalPlays: 0, avgScore: 0, trend: 0, color: '#f59e0b' },
          { name: 'Attention Task', icon: '🎯', totalPlays: 0, avgScore: 0, trend: 0, color: '#3b82f6' }
        ];
      } else {
        const targetType = this.GAME_TYPE_MAP[this.selectedGame];
        this.gameStats = [{
          name: gameNames[targetType] || this.selectedGame,
          icon: gameIcons[targetType] || '🎮',
          totalPlays: 0,
          avgScore: 0,
          trend: 0,
          color: gameColors[targetType] || '#6b7280'
        }];
      }
    } else {
      this.gameStats = Array.from(gameMap.entries()).map(([gameType, data]) => ({
        name: gameNames[gameType] || gameType,
        icon: gameIcons[gameType] || '🎮',
        totalPlays: data.plays,
        avgScore: data.scores.length > 0 ? Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length) : 0,
        trend: 0,
        color: gameColors[gameType] || '#6b7280'
      }));
    }
  }

  private processPatients(): void {
    const patientActivityMap = new Map<string, { activities: GameActivity[]; lastActivity: Date | null }>();
    const filteredActivities = this.getFilteredActivities();

    this.allPatients.forEach(p => {
      patientActivityMap.set(p.userId, { activities: [], lastActivity: null });
    });

    filteredActivities.forEach(activity => {
      const patientData = patientActivityMap.get(activity.patientId);
      if (patientData) {
        patientData.activities.push(activity);
        const activityDate = new Date(activity.createdAt);
        if (!patientData.lastActivity || activityDate > patientData.lastActivity) {
          patientData.lastActivity = activityDate;
        }
      }
    });

    const avatars = ['👨', '👩', '👴', '👵', '👨‍🦳', '👩‍🦳', '🧔', '👳'];

    this.patients = this.allPatients.map((patient, index) => {
      const data = patientActivityMap.get(patient.userId) || { activities: [], lastActivity: null };
      const scores = data.activities.map(a => a.score || 0).filter(s => s > 0);
      const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
      
      let lastPlayed = 'Never';
      let trend: 'up' | 'down' | 'stable' = 'stable';
      
      if (data.lastActivity) {
        const now = new Date();
        const diffMs = now.getTime() - data.lastActivity.getTime();
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        
        if (diffHours < 1) lastPlayed = 'Just now';
        else if (diffHours < 24) lastPlayed = `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        else if (diffHours < 48) lastPlayed = '1 day ago';
        else lastPlayed = `${Math.floor(diffHours / 24)} days ago`;

        if (data.activities.length > 10) trend = 'up';
        else if (data.activities.length < 3) trend = 'down';
      }

      return {
        id: patient.userId,
        name: `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || 'Unknown',
        avatar: avatars[index % avatars.length],
        totalGames: data.activities.length,
        avgScore,
        lastPlayed,
        trend
      };
    });
  }

  private processLineChart(): void {
    const days = this.getDaysForRange();
    const filteredActivities = this.getFilteredActivities();
    
    let games: string[] = [];
    if (this.selectedGame === 'all') {
      games = ['MEMORY_MATCH', 'PATTERN_RECOGNITION', 'WORD_RECALL', 'ATTENTION_TASK'];
    } else {
      games = [this.GAME_TYPE_MAP[this.selectedGame]];
    }

    const gameColors: Record<string, string> = {
      'MEMORY_MATCH': '#8b5cf6',
      'PATTERN_RECOGNITION': '#ec4899',
      'WORD_RECALL': '#14b8a6',
      'SPATIAL_NAVIGATION': '#f59e0b',
      'ATTENTION_TASK': '#3b82f6'
    };

    const datasets = games.map((game) => {
      const color = gameColors[game] || '#6b7280';
      const data = days.map(day => {
        const dayActivities = filteredActivities.filter(a =>
          a.gameType === game && this.isSameDay(new Date(a.createdAt), day)
        );
        const scores = dayActivities.map(a => a.score || 0).filter(s => s > 0);
        return scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
      });

      return {
        label: this.getGameName(game),
        data,
        borderColor: color,
        backgroundColor: color + '20',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: color,
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 4
      };
    });

    this.lineChartData = {
      labels: days.map(d => d.toLocaleDateString('en-US', { weekday: 'short' })),
      datasets
    };
  }

  private processDoughnutChart(): void {
    const gameCounts = new Map<string, number>();
    const filteredActivities = this.getFilteredActivities();
    
    filteredActivities.forEach(activity => {
      const count = gameCounts.get(activity.gameType) || 0;
      gameCounts.set(activity.gameType, count + 1);
    });

    if (gameCounts.size === 0) {
      this.doughnutChartData = {
        labels: ['No game data yet'],
        datasets: [{ data: [1], backgroundColor: ['#e5e7eb'], borderWidth: 0 }]
      };
      return;
    }

    const labels: string[] = [];
    const data: number[] = [];
    const colors: string[] = [];

    const gameNames: Record<string, string> = {
      'MEMORY_MATCH': 'Memory Match',
      'PATTERN_RECOGNITION': 'Pattern Recognition',
      'WORD_RECALL': 'Word Recall',
      'SPATIAL_NAVIGATION': 'Spatial Navigation',
      'ATTENTION_TASK': 'Attention Task'
    };

    const gameColorsMap: Record<string, string> = {
      'MEMORY_MATCH': '#8b5cf6',
      'PATTERN_RECOGNITION': '#ec4899',
      'WORD_RECALL': '#14b8a6',
      'SPATIAL_NAVIGATION': '#f59e0b',
      'ATTENTION_TASK': '#3b82f6'
    };

    gameCounts.forEach((count, gameType) => {
      labels.push(gameNames[gameType] || gameType);
      data.push(count);
      colors.push(gameColorsMap[gameType] || '#6b7280');
    });

    this.doughnutChartData = {
      labels,
      datasets: [{ data, backgroundColor: colors, borderWidth: 0, hoverOffset: 10 }]
    };
  }

  private processBarChart(): void {
    const thisWeek = this.getDaysForRange();
    const filteredActivities = this.getFilteredActivities();

    const thisWeekData = thisWeek.map(day => 
      filteredActivities.filter(a => this.isSameDay(new Date(a.createdAt), day)).length
    );

    const lastWeekData = thisWeekData.map(() => Math.floor(Math.random() * 5));

    this.barChartData = {
      labels: thisWeek.map(d => d.toLocaleDateString('en-US', { weekday: 'short' })),
      datasets: [
        { label: 'This Week', data: thisWeekData, backgroundColor: '#10b981', borderRadius: 6 },
        { label: 'Last Week', data: lastWeekData, backgroundColor: '#d1fae5', borderRadius: 6 }
      ]
    };
  }

  private processRadarChart(): void {
    const domainScores: Record<string, number[]> = {
      'Memory': [],
      'Attention': [],
      'Pattern Recognition': [],
      'Language': [],
      'Spatial': []
    };

    const filteredActivities = this.getFilteredActivities();

    filteredActivities.forEach(activity => {
      if (activity.score) {
        if (activity.gameType === 'MEMORY_MATCH' || activity.gameType === 'WORD_RECALL') {
          domainScores['Memory'].push(activity.score);
        }
        if (activity.gameType === 'ATTENTION_TASK') {
          domainScores['Attention'].push(activity.score);
        }
        if (activity.gameType === 'PATTERN_RECOGNITION') {
          domainScores['Pattern Recognition'].push(activity.score);
        }
        if (activity.gameType === 'WORD_RECALL') {
          domainScores['Language'].push(activity.score);
        }
        if (activity.gameType === 'SPATIAL_NAVIGATION') {
          domainScores['Spatial'].push(activity.score);
        }
      }
    });

    const calculateAvg = (scores: number[]) => 
      scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

    const patientAvg = Object.values(domainScores).map(scores => calculateAvg(scores));
    const hasAnyData = patientAvg.some(v => v > 0);
    const target = [80, 80, 80, 80, 80];

    if (!hasAnyData) {
      patientAvg.fill(0);
    }

    this.radarChartData = {
      labels: Object.keys(domainScores),
      datasets: [
        {
          label: 'Patient Average',
          data: patientAvg,
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.2)',
          pointBackgroundColor: '#10b981',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 5
        },
        {
          label: 'Target',
          data: target,
          borderColor: '#f59e0b',
          backgroundColor: 'rgba(245, 158, 11, 0.1)',
          borderDash: [5, 5],
          pointBackgroundColor: '#f59e0b',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 4
        }
      ]
    };
  }

  private getDaysForRange(offset = 0): Date[] {
    const days: Date[] = [];
    const today = new Date();
    today.setDate(today.getDate() - offset);
    
    for (let i = 6; i >= 0; i--) {
      const day = new Date(today);
      day.setDate(today.getDate() - i);
      days.push(day);
    }
    return days;
  }

  private isSameDay(date1: Date, date2: Date): boolean {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  }

  private getGameName(gameType: string): string {
    const names: Record<string, string> = {
      'MEMORY_MATCH': 'Memory Match',
      'PATTERN_RECOGNITION': 'Pattern Recognition',
      'WORD_RECALL': 'Word Recall',
      'SPATIAL_NAVIGATION': 'Spatial Navigation',
      'ATTENTION_TASK': 'Attention Task'
    };
    return names[gameType] || gameType;
  }

  animateCards(): void {
    [0, 1, 2, 3].forEach((_, index) => {
      setTimeout(() => {
        this.animatedCards.push(index);
      }, index * 150);
    });
  }

  selectTimeRange(range: string): void {
    this.selectedTimeRange = range;
    this.loadData();
  }

  selectGame(game: string): void {
    this.selectedGame = game;
    this.processData();
    this.loadBadgeTimeline();
  }

  onTimelinePatientChange(patientId: string): void {
    this.selectedTimelinePatientId = patientId;
    this.loadBadgeTimeline();
  }

  private loadBadgeTimeline(): void {
    const caregiverId = this.authService.getCurrentUser()?.id;
    if (!caregiverId) {
      this.badgeTimeline = [];
      return;
    }
    this.badgeTimelineLoading = true;
    const selectedPatient = this.selectedTimelinePatientId || undefined;
    const gameType = this.selectedGame === 'all'
      ? undefined
      : this.GAME_TYPE_MAP[this.selectedGame] as GameType | undefined;
    const days = this.selectedTimeRange === 'week' ? 7 : this.selectedTimeRange === 'month' ? 30 : 365;

    this.apiService.getBadgeTimeline(caregiverId, selectedPatient, gameType, days, 200).subscribe({
      next: (events) => {
        this.badgeTimeline = events;
        this.badgeTimelineLoading = false;
      },
      error: () => {
        this.badgeTimeline = [];
        this.badgeTimelineLoading = false;
      }
    });
  }

  getTotalPlays(): number {
    return this.getFilteredActivities().length;
  }

  getAverageScore(): number {
    const scores = this.getFilteredActivities().map(a => a.score || 0).filter(s => s > 0);
    if (scores.length === 0) return 0;
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  }

  getActivePatients(): number {
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    const activePatientIds = new Set(
      this.getFilteredActivities()
        .filter(a => new Date(a.createdAt) > oneDayAgo)
        .map(a => a.patientId)
    );
    return activePatientIds.size;
  }

  getTrendIcon(trend: string): string {
    switch (trend) {
      case 'up': return '↗️';
      case 'down': return '↘️';
      default: return '→';
    }
  }

  getTrendClass(trend: string): string {
    switch (trend) {
      case 'up': return 'text-green-600';
      case 'down': return 'text-red-500';
      default: return 'text-gray-500';
    }
  }

  exportPdfReport(): void {
    this.pdfExportService.exportElementAsPdf(
      'caregiver-game-analytics-analysis',
      'Caregiver Cognitive Game Analytics Report'
    );
  }
}
