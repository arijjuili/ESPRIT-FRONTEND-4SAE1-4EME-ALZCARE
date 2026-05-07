import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData } from 'chart.js';
import { MlService } from '../../../core/services/ml.service';
import { ModelMetrics } from '../../../core/models/ml.model';

@Component({
  selector: 'app-model-comparison-panel',
  standalone: true,
  imports: [CommonModule, BaseChartDirective],
  templateUrl: './model-comparison-panel.component.html',
  styleUrls: ['./model-comparison-panel.component.scss'],
})
export class ModelComparisonPanelComponent implements OnInit {
  private mlService = inject(MlService);

  metrics: ModelMetrics | null = null;
  loading = false;

  radarData: ChartData<'radar'> = { labels: [], datasets: [] };
  radarOptions: ChartConfiguration<'radar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      r: {
        suggestedMin: 0.7,
        suggestedMax: 1.0,
      },
    },
  };

  ngOnInit(): void {
    this.loading = true;
    this.mlService.getModelMetrics().subscribe((m) => {
      this.metrics = m;
      this.updateRadar(m);
      this.loading = false;
    });
  }

  private updateRadar(m: ModelMetrics): void {
    this.radarData = {
      labels: ['Accuracy', 'Balanced Acc', 'F1-Macro', 'F1-Weighted'],
      datasets: m.classification.map((c, i) => ({
        label: c.model,
        data: [c.accuracy, c.balanced_accuracy, c.f1_macro, c.f1_weighted],
        borderColor: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'][i],
        backgroundColor: ['rgba(16,185,129,0.2)', 'rgba(59,130,246,0.2)', 'rgba(245,158,11,0.2)', 'rgba(239,68,68,0.2)'][i],
        borderWidth: 2,
        pointRadius: 3,
      })),
    };
  }

  bestModel(): string {
    if (!this.metrics) return '';
    return this.metrics.classification.reduce((best, curr) =>
      curr.f1_macro > best.f1_macro ? curr : best
    ).model;
  }
}
