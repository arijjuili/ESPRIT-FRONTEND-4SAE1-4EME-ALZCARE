import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MlService } from '../../../core/services/ml.service';
import { PatientMlFeatures, Recommendation, RecommendationsResponse } from '../../../core/models/ml.model';

@Component({
  selector: 'app-recommendation-panel',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './recommendation-panel.component.html',
  styleUrls: ['./recommendation-panel.component.scss'],
})
export class RecommendationPanelComponent {
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

  response: RecommendationsResponse | null = null;
  loading = false;

  categoryColor(cat: string): string {
    switch (cat) {
      case 'SÉCURITÉ': return 'bg-red-50 text-red-700 border-red-200';
      case 'COGNITION': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'SOCIAL': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'MÉDICAL': return 'bg-teal-50 text-teal-700 border-teal-200';
      case 'ACTIVITÉ PHYSIQUE': return 'bg-green-50 text-green-700 border-green-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  }

  priorityBadge(p: string): string {
    switch (p) {
      case 'HAUTE': return 'bg-danger text-white';
      case 'MOYENNE': return 'bg-warning text-white';
      case 'BASSE': return 'bg-success text-white';
      default: return 'bg-gray-400 text-white';
    }
  }

  onGenerate(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading = true;
    this.mlService.generateRecommendations(this.form.value as PatientMlFeatures).subscribe((r) => {
      this.response = r;
      this.loading = false;
    });
  }
}
