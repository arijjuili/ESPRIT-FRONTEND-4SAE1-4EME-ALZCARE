import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData } from 'chart.js';
import { MlService } from '../../../core/services/ml.service';
import { FeatureImportance } from '../../../core/models/ml.model';

@Component({
  selector: 'app-feature-importance-panel',
  standalone: true,
  imports: [CommonModule, BaseChartDirective],
  templateUrl: './feature-importance-panel.component.html',
  styleUrls: ['./feature-importance-panel.component.scss'],
})
export class FeatureImportancePanelComponent implements OnInit {
  private mlService = inject(MlService);

  model: 'random_forest' | 'gradient_boosting' = 'random_forest';
  featureImportance: FeatureImportance | null = null;
  loading = false;

  barData: ChartData<'bar'> = { labels: [], datasets: [] };
  barOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y',
    plugins: { legend: { display: false } },
    scales: {
      x: { beginAtZero: true, max: 0.2 },
    },
  };

  ngOnInit(): void {
    this.loadData();
  }

  setModel(m: 'random_forest' | 'gradient_boosting') {
    this.model = m;
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    this.mlService.getFeatureImportance(this.model).subscribe((fi) => {
      this.featureImportance = fi;
      this.barData = {
        labels: fi.features.map((f) => f.feature),
        datasets: [
          {
            data: fi.features.map((f) => f.importance),
            backgroundColor: fi.features.map((_, i) =>
              i < 5 ? '#14b8a6' : i < 10 ? '#3b82f6' : '#94a3b8'
            ),
            borderRadius: 4,
          },
        ],
      };
      this.loading = false;
    });
  }
}
