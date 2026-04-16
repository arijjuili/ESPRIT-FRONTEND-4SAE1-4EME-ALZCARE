import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js';
import { DailyCareService } from '../../../core/services/daily-care.service';
import { AuthService } from '../../../core/services/auth.service';
import { ApiService } from '../../../core/services/api.service';

@Component({
  selector: 'app-doctor-statistics',
  standalone: true,
  imports: [CommonModule, BaseChartDirective],
  template: `
    <div class="p-6 max-w-7xl mx-auto">
      <h1 class="text-3xl font-bold text-gray-800 mb-8 text-center uppercase tracking-wider">Advanced Daily Care Analytics</h1>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <!-- Bar Chart: Habits per Patient -->
        <div class="bg-white p-6 rounded-2xl shadow-xl border border-blue-50">
          <h2 class="text-xl font-semibold text-blue-800 mb-4 border-b pb-2">Habits Assigned per Patient</h2>
          <canvas baseChart
            [data]="barChartData"
            [options]="barChartOptions"
            [type]="'bar'">
          </canvas>
        </div>

        <!-- Line Chart: Completion Trend -->
        <div class="bg-white p-6 rounded-2xl shadow-xl border border-teal-50">
          <h2 class="text-xl font-semibold text-teal-800 mb-4 border-b pb-2">Activity Completion Trend</h2>
          <canvas baseChart
            [data]="lineChartData"
            [options]="lineChartOptions"
            [type]="'line'">
          </canvas>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
        <!-- Pie Chart: Autonomy Distribution -->
        <div class="bg-white p-6 rounded-2xl shadow-xl border border-indigo-50">
          <h2 class="text-xl font-semibold text-indigo-800 mb-4 border-b pb-2">Tasks Autonomy Distribution</h2>
          <div class="relative h-64">
            <canvas baseChart
              [data]="pieChartData"
              [options]="pieChartOptions"
              [type]="'pie'">
            </canvas>
          </div>
        </div>

        <!-- Pie Chart: Criticality -->
        <div class="bg-white p-6 rounded-2xl shadow-xl border border-red-50">
          <h2 class="text-xl font-semibold text-red-800 mb-4 border-b pb-2">Critical Tasks Distribution</h2>
          <div class="relative h-64">
            <canvas baseChart
              [data]="criticalityChartData"
              [options]="pieChartOptions"
              [type]="'doughnut'">
            </canvas>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; background-color: #f8fafc; min-height: 100vh; }
  `]
})
export class DoctorStatisticsComponent implements OnInit {
  // Bar Chart
  public barChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    plugins: { legend: { display: false } }
  };
  public barChartData: ChartData<'bar'> = { labels: [], datasets: [{ data: [], label: 'Habits', backgroundColor: '#3b82f6' }] };

  // Line Chart
  public lineChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    plugins: { legend: { display: true } },
    scales: { y: { beginAtZero: true } }
  };
  public lineChartData: ChartData<'line'> = { labels: [], datasets: [{ data: [], label: 'Completed Tasks', borderColor: '#10b981', tension: 0.4 }] };

  // Pie Charts
  public pieChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom' } }
  };
  public pieChartData: ChartData<'pie'> = { labels: [], datasets: [{ data: [], backgroundColor: ['#8b5cf6', '#ec4899', '#f59e0b'] }] };
  public criticalityChartData: ChartData<'doughnut'> = { labels: [], datasets: [{ data: [], backgroundColor: ['#ef4444', '#10b981'] }] };

  constructor(
    private dailyCareService: DailyCareService,
    private authService: AuthService,
    private apiService: ApiService
  ) {}

  ngOnInit(): void {
    const userId = this.authService.getCurrentUserId();
    if (!userId) {
      this.loadStats();
      return;
    }

    this.apiService.getDoctorByUserId(userId).subscribe({
      next: (doctorProfile) => {
        this.loadStats(doctorProfile.id);
      },
      error: () => {
        this.loadStats(); // Fallback if API fails
      }
    });
  }

  private loadStats(doctorId?: string): void {
    this.dailyCareService.getDoctorStats(doctorId).subscribe(stats => {
      if (!stats) return;

      const habitsPerPatient = stats.habitsPerPatient || {};
      const patientIds = Object.keys(habitsPerPatient);
      this.barChartData = {
        labels: patientIds.map(id => 'P- ' + id.substring(0, 5)),
        datasets: [{ data: Object.values(habitsPerPatient), label: 'Habits', backgroundColor: '#3b82f6' }]
      };

      const autonomy = stats.tasksByAutonomyMode || {};
      this.pieChartData = {
        labels: Object.keys(autonomy),
        datasets: [{ data: Object.values(autonomy), backgroundColor: ['#8b5cf6', '#ec4899', '#f59e0b'] }]
      };

      const criticality = stats.tasksByCriticality || {};
      this.criticalityChartData = {
        labels: Object.keys(criticality),
        datasets: [{ data: Object.values(criticality), backgroundColor: ['#ef4444', '#10b981'] }]
      };

      const trend = stats.completionTrend || [];
      this.lineChartData = {
        labels: trend.map(t => t.date),
        datasets: [{ data: trend.map(t => t.count), label: 'Completed Tasks', borderColor: '#10b981', tension: 0.4 }]
      };
    });
  }
}
