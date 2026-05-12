import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData } from 'chart.js';
import { MlService } from '../../../core/services/ml.service';
import { ClusterAnalysis, PcaVisualization } from '../../../core/models/ml.model';

@Component({
  selector: 'app-clustering-panel',
  standalone: true,
  imports: [CommonModule, BaseChartDirective],
  templateUrl: './clustering-panel.component.html',
  styleUrls: ['./clustering-panel.component.scss'],
})
export class ClusteringPanelComponent implements OnInit {
  private mlService = inject(MlService);

  clusterAnalysis: ClusterAnalysis | null = null;
  pcaViz: PcaVisualization | null = null;
  loading = false;

  scatterData: ChartData<'scatter'> = { datasets: [] };
  scatterOptions: ChartConfiguration<'scatter'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: { title: { display: true, text: 'Facteur principal 1' } },
      y: { title: { display: true, text: 'Facteur principal 2' } },
    },
    plugins: { legend: { display: true } },
  };

  doughnutData: ChartData<'doughnut'> = { labels: [], datasets: [] };
  doughnutOptions: ChartConfiguration<'doughnut'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom' } },
  };

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    this.mlService.getClusterAnalysis('gmm').subscribe((ca) => {
      this.clusterAnalysis = ca;
      this.updateDoughnut(ca);
    });
    this.mlService.getPcaVisualization('gmm').subscribe((viz) => {
      this.pcaViz = viz;
      this.updateScatter(viz);
      this.loading = false;
    });
  }

  groupLabel(clusterId: number, dominantRisk?: string): string {
    if (dominantRisk) {
      const risk = dominantRisk.toLowerCase();
      if (risk.includes('faible') || risk.includes('low')) return 'Profil stable';
      if (risk.includes('moyen') || risk.includes('medium') || risk.includes('moderate')) return 'Profil à risque modéré';
      if (risk.includes('élevé') || risk.includes('eleve') || risk.includes('high')) return 'Profil à haut risque';
    }
    const labels = ['Profil stable', 'Profil à risque modéré', 'Profil à haut risque', 'Profil fragile'];
    return labels[clusterId % labels.length] || `Profil ${clusterId + 1}`;
  }

  private updateScatter(viz: PcaVisualization): void {
    const colors = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'];
    const datasets = viz.clusters.map((clusterId) => ({
      label: this.groupLabel(clusterId),
      data: viz.points.filter((p) => p.cluster === clusterId).map((p) => ({ x: p.x, y: p.y })),
      backgroundColor: colors[clusterId % colors.length],
      pointRadius: 4,
      pointHoverRadius: 6,
    }));
    this.scatterData = { datasets };
  }

  private updateDoughnut(ca: ClusterAnalysis): void {
    this.doughnutData = {
      labels: ca.clusters.map((c) => this.groupLabel(c.clusterId, c.dominantRisk)),
      datasets: [
        {
          data: ca.clusters.map((c) => c.count),
          backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'],
          borderWidth: 0,
        },
      ],
    };
  }
}
