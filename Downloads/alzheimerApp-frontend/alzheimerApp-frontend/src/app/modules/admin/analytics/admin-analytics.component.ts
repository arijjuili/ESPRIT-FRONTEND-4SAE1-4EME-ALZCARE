import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

interface MetricCard {
  title: string;
  value: string;
  change: string;
  trend: 'up' | 'down' | 'neutral';
  icon: string;
  color: string;
}

interface ChartData {
  label: string;
  value: number;
  color: string;
}

@Component({
  selector: 'app-admin-analytics',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './admin-analytics.component.html',
  styleUrls: ['./admin-analytics.component.scss']
})
export class AdminAnalyticsComponent implements OnInit {
  // Key Metrics
  metrics: MetricCard[] = [
    { title: 'Total Active Users', value: '156', change: '+12.5%', trend: 'up', icon: '👥', color: 'blue' },
    { title: 'Avg Session Duration', value: '24m 32s', change: '+8.2%', trend: 'up', icon: '⏱️', color: 'violet' },
    { title: 'Task Completion Rate', value: '87.3%', change: '+3.1%', trend: 'up', icon: '✅', color: 'emerald' },
    { title: 'System Uptime', value: '99.95%', change: '-0.02%', trend: 'down', icon: '📈', color: 'amber' }
  ];

  // Weekly Activity Data
  weeklyActivity = [
    { day: 'Mon', users: 120, sessions: 145, tasks: 89 },
    { day: 'Tue', users: 132, sessions: 156, tasks: 92 },
    { day: 'Wed', users: 145, sessions: 178, tasks: 105 },
    { day: 'Thu', users: 138, sessions: 162, tasks: 98 },
    { day: 'Fri', users: 156, sessions: 189, tasks: 112 },
    { day: 'Sat', users: 98, sessions: 120, tasks: 67 },
    { day: 'Sun', users: 89, sessions: 105, tasks: 58 }
  ];

  // User Role Distribution
  roleDistribution: ChartData[] = [
    { label: 'Patients', value: 45, color: '#10b981' },
    { label: 'Caregivers', value: 32, color: '#3b82f6' },
    { label: 'Family', value: 67, color: '#f59e0b' },
    { label: 'Doctors', value: 8, color: '#8b5cf6' },
    { label: 'Admins', value: 4, color: '#f43f5e' }
  ];

  // Feature Usage
  featureUsage: ChartData[] = [
    { label: 'Medications', value: 85, color: '#f43f5e' },
    { label: 'Appointments', value: 72, color: '#3b82f6' },
    { label: 'Games', value: 68, color: '#8b5cf6' },
    { label: 'Community', value: 54, color: '#10b981' },
    { label: 'Memory Wallet', value: 45, color: '#f59e0b' }
  ];

  // Top Performing Content
  topContent = [
    { name: 'Memory Match Game', category: 'Cognitive Game', usage: 1245, rating: 4.8 },
    { name: 'Morning Care Routine', category: 'Daily Routine', usage: 892, rating: 4.9 },
    { name: 'Medication Tracker', category: 'Medical Tool', usage: 756, rating: 4.7 },
    { name: 'Community Forum', category: 'Social', usage: 678, rating: 4.6 }
  ];

  // Recent System Events
  systemEvents = [
    { event: 'Peak usage detected', time: 'Today, 2:30 PM', severity: 'info', icon: '📊' },
    { event: 'Database backup completed', time: 'Today, 3:00 AM', severity: 'success', icon: '💾' },
    { event: 'API response time spike', time: 'Yesterday, 4:15 PM', severity: 'warning', icon: '⚡' },
    { event: 'Failed login attempts', time: 'Yesterday, 2:20 PM', severity: 'error', icon: '🔒' }
  ];

  constructor() {}

  ngOnInit(): void {}

  getTrendIcon(trend: string): string {
    const icons: Record<string, string> = {
      up: '📈',
      down: '📉',
      neutral: '➡️'
    };
    return icons[trend] || '➡️';
  }

  getTrendClass(trend: string): string {
    const classes: Record<string, string> = {
      up: 'text-emerald-600',
      down: 'text-rose-600',
      neutral: 'text-gray-600'
    };
    return classes[trend] || 'text-gray-600';
  }

  getMaxActivityValue(): number {
    return Math.max(...this.weeklyActivity.map(d => Math.max(d.users, d.sessions, d.tasks)));
  }

  getBarHeight(value: number): string {
    const max = this.getMaxActivityValue();
    return `${(value / max) * 100}%`;
  }

  getSeverityClass(severity: string): string {
    const classes: Record<string, string> = {
      info: 'bg-blue-100 text-blue-700 border-blue-200',
      success: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      warning: 'bg-amber-100 text-amber-700 border-amber-200',
      error: 'bg-rose-100 text-rose-700 border-rose-200'
    };
    return classes[severity] || 'bg-gray-100 text-gray-700';
  }
}
