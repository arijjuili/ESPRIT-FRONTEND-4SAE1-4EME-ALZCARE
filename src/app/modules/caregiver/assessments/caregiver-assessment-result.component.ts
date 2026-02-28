import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { HealthRecord } from '../../../core/models/api.model';

@Component({
  selector: 'app-caregiver-assessment-result',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './caregiver-assessment-result.component.html',
  styleUrls: ['./caregiver-assessment-result.component.scss']
})
export class CaregiverAssessmentResultComponent implements OnInit {
  assessment: HealthRecord | null = null;
  isLoading = false;
  error = '';

  constructor(
    private route: ActivatedRoute,
    private apiService: ApiService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;
    this.loadAssessment(id);
  }

  loadAssessment(id: string): void {
    this.isLoading = true;
    this.apiService.getHealthRecordById(id).subscribe({
      next: (record) => {
        this.assessment = record;
        this.isLoading = false;
      },
      error: () => {
        this.error = 'Failed to load assessment result.';
        this.isLoading = false;
      }
    });
  }

  getResponseEntries(): { key: string; value: unknown }[] {
    if (!this.assessment?.responses) return [];
    return Object.entries(this.assessment.responses).map(([key, value]) => ({ key, value }));
  }
}
