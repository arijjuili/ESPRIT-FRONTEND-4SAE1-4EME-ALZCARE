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

  formatDate(value?: string | null): string {
    if (!value) return 'Not completed';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getScoreValue(): number | null {
    const score = this.assessment?.unifiedScore;
    if (typeof score === 'number') return score;
    if (score !== null && score !== undefined) {
      const parsed = Number(score);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  }

  getScorePercent(): number {
    const value = this.getScoreValue();
    if (value === null) return 0;
    return Math.max(0, Math.min(100, Math.round((value / 30) * 100)));
  }

  getScoreTone(): 'high' | 'medium' | 'low' | 'na' {
    const value = this.getScoreValue();
    if (value === null) return 'na';
    if (value >= 24) return 'high';
    if (value >= 18) return 'medium';
    return 'low';
  }

  getScoreLabel(): string {
    const tone = this.getScoreTone();
    if (tone === 'high') return 'Stable range';
    if (tone === 'medium') return 'Watch closely';
    if (tone === 'low') return 'Needs attention';
    return 'No score available';
  }

  formatResponseKey(key: string): string {
    return key
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/_/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/^./, c => c.toUpperCase());
  }
}
