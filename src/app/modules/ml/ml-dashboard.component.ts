import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RiskPredictionPanelComponent } from './risk-prediction-panel/risk-prediction-panel.component';
import { ClusteringPanelComponent } from './clustering-panel/clustering-panel.component';
import { ModelComparisonPanelComponent } from './model-comparison-panel/model-comparison-panel.component';
import { FeatureImportancePanelComponent } from './feature-importance-panel/feature-importance-panel.component';
import { RecommendationPanelComponent } from './recommendation-panel/recommendation-panel.component';

type Tab = 'prediction' | 'clustering' | 'comparison' | 'features' | 'recommendations';

@Component({
  selector: 'app-ml-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RiskPredictionPanelComponent,
    ClusteringPanelComponent,
    ModelComparisonPanelComponent,
    FeatureImportancePanelComponent,
    RecommendationPanelComponent,
  ],
  templateUrl: './ml-dashboard.component.html',
  styleUrls: ['./ml-dashboard.component.scss'],
})
export class MlDashboardComponent {
  activeTab: Tab = 'prediction';

  tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'prediction', label: 'Prédiction', icon: '🔮' },
    { key: 'clustering', label: 'Clustering', icon: '📊' },
    { key: 'comparison', label: 'Performance', icon: '🏆' },
    { key: 'features', label: 'Features', icon: '🔍' },
    { key: 'recommendations', label: 'Recommandations', icon: '💡' },
  ];

  setTab(tab: Tab): void {
    this.activeTab = tab;
  }
}
