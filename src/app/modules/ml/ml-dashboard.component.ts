import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RiskPredictionPanelComponent } from './risk-prediction-panel/risk-prediction-panel.component';
import { ClusteringPanelComponent } from './clustering-panel/clustering-panel.component';
import { RecommendationPanelComponent } from './recommendation-panel/recommendation-panel.component';

type Tab = 'prediction' | 'profiles' | 'recommendations';

@Component({
  selector: 'app-ml-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RiskPredictionPanelComponent,
    ClusteringPanelComponent,
    RecommendationPanelComponent,
  ],
  templateUrl: './ml-dashboard.component.html',
  styleUrls: ['./ml-dashboard.component.scss'],
})
export class MlDashboardComponent {
  activeTab: Tab = 'prediction';

  tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'prediction', label: 'Prédiction', icon: '🔮' },
    { key: 'profiles', label: 'Profils Patients', icon: '📊' },
    { key: 'recommendations', label: 'Recommandations', icon: '💡' },
  ];

  setTab(tab: Tab): void {
    this.activeTab = tab;
  }
}
