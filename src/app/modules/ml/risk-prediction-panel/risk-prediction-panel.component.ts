import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MlService } from '../../../core/services/ml.service';
import {
  EventRiskPrediction,
  CognitiveDeclinePrediction,
  FallRiskPrediction,
  PatientMlFeatures,
} from '../../../core/models/ml.model';

@Component({
  selector: 'app-risk-prediction-panel',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './risk-prediction-panel.component.html',
  styleUrls: ['./risk-prediction-panel.component.scss'],
})
export class RiskPredictionPanelComponent {
  private fb = inject(FormBuilder);
  private mlService = inject(MlService);

  form: FormGroup = this.fb.group({
    Age: [75, [Validators.required, Validators.min(60), Validators.max(95)]],
    Gender: [1, Validators.required],
    BMI: [24.5, [Validators.required, Validators.min(18), Validators.max(40)]],
    Smoking: [0, Validators.required],
    AlcoholConsumption: [5.2, [Validators.required, Validators.min(0), Validators.max(15)]],
    PhysicalActivity: [1.5, [Validators.required, Validators.min(0), Validators.max(10)]],
    DietQuality: [6.0, [Validators.required, Validators.min(0), Validators.max(10)]],
    SleepQuality: [7.0, [Validators.required, Validators.min(0), Validators.max(10)]],
    FamilyHistoryAlzheimers: [1, Validators.required],
    CardiovascularDisease: [0, Validators.required],
    Diabetes: [0, Validators.required],
    Depression: [0, Validators.required],
    HeadInjury: [0, Validators.required],
    Hypertension: [1, Validators.required],
    SystolicBP: [140, [Validators.required, Validators.min(100), Validators.max(200)]],
    DiastolicBP: [90, [Validators.required, Validators.min(60), Validators.max(120)]],
    CholesterolTotal: [200, [Validators.required, Validators.min(150), Validators.max(300)]],
    CholesterolLDL: [120, [Validators.required, Validators.min(70), Validators.max(200)]],
    CholesterolHDL: [50, [Validators.required, Validators.min(25), Validators.max(90)]],
    CholesterolTriglycerides: [150, [Validators.required, Validators.min(70), Validators.max(300)]],
    MMSE: [20, [Validators.required, Validators.min(5), Validators.max(30)]],
    FunctionalAssessment: [5, [Validators.required, Validators.min(1), Validators.max(10)]],
    MemoryComplaints: [1, Validators.required],
    BehavioralProblems: [0, Validators.required],
    ADL: [4, [Validators.required, Validators.min(1), Validators.max(10)]],
    Confusion: [1, Validators.required],
    Disorientation: [0, Validators.required],
    PersonalityChanges: [0, Validators.required],
    DifficultyCompletingTasks: [1, Validators.required],
    Forgetfulness: [1, Validators.required],
    EducationLevel: [2, Validators.required],
    Stroke: [0, Validators.required],
    Diagnosis: [1, Validators.required],
  });

  eventRisk: EventRiskPrediction | null = null;
  cognitiveDecline: CognitiveDeclinePrediction | null = null;
  fallRisk: FallRiskPrediction | null = null;
  loading = false;

  onPredict(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading = true;
    const features = this.form.value as PatientMlFeatures;

    this.mlService.predictEventRisk(features).subscribe((r) => {
      this.eventRisk = r;
    });
    this.mlService.predictCognitiveDecline(features).subscribe((r) => {
      this.cognitiveDecline = r;
    });
    this.mlService.predictFallRisk(features).subscribe((r) => {
      this.fallRisk = r;
      this.loading = false;
    });
  }

  riskColor(level: string): string {
    switch (level) {
      case 'Faible': return 'bg-success';
      case 'Moyen': return 'bg-warning';
      case 'Élevé': return 'bg-danger';
      default: return 'bg-gray-400';
    }
  }

  declineColor(decline: number): string {
    switch (decline) {
      case 0: return 'bg-success';
      case 1: return 'bg-info';
      case 2: return 'bg-warning';
      case 3: return 'bg-danger';
      default: return 'bg-gray-400';
    }
  }
}
