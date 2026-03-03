import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { HealthRecord } from '../../../core/models/api.model';

interface AnswerReview {
  key: string;
  value: string;
  correct: boolean;
}

@Component({
  selector: 'app-doctor-assessment-result',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './doctor-assessment-result.component.html',
  styleUrls: ['./doctor-assessment-result.component.scss']
})
export class DoctorAssessmentResultComponent implements OnInit {
  assessment: HealthRecord | null = null;
  isLoading = false;
  error = '';
  isSubmitting = false;
  answerReviews: AnswerReview[] = [];
  reviewedScore: number | null = null;
  isReviewed = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
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
        this.initializeAnswerReviews();
        this.isLoading = false;
      },
      error: () => {
        this.error = 'Failed to load assessment result.';
        this.isLoading = false;
      }
    });
  }

  initializeAnswerReviews(): void {
    if (!this.assessment?.responses) {
      this.answerReviews = [];
      return;
    }

    this.answerReviews = Object.entries(this.assessment.responses).map(([key, value]) => ({
      key,
      value: String(value || ''),
      correct: false
    }));

    if (this.assessment.reviewedAnswers) {
      const reviewedMap = this.assessment.reviewedAnswers as Record<string, boolean>;
      this.answerReviews.forEach(ar => {
        if (reviewedMap[ar.key] !== undefined) {
          ar.correct = reviewedMap[ar.key];
        }
      });
      this.reviewedScore = this.assessment?.reviewedScore ?? null;
      this.isReviewed = this.assessment?.reviewedScore != null;
    }
  }

  toggleAnswerCorrect(index: number): void {
    this.answerReviews[index].correct = !this.answerReviews[index].correct;
    this.calculateReviewedScore();
  }

  calculateReviewedScore(): void {
    const correctCount = this.answerReviews.filter(ar => ar.correct).length;
    this.reviewedScore = correctCount;
    this.isReviewed = true;
  }

  submitReview(): void {
    if (!this.assessment || this.reviewedScore === null) return;

    this.isSubmitting = true;
    const reviewedAnswers: Record<string, boolean> = {};
    this.answerReviews.forEach(ar => {
      reviewedAnswers[ar.key] = ar.correct;
    });

    this.apiService.updateHealthRecord(this.assessment.id, {
      reviewedScore: this.reviewedScore,
      reviewedAnswers: reviewedAnswers,
      doctorNotes: this.assessment.doctorNotes
    } as any).subscribe({
      next: (updated) => {
        this.assessment = updated;
        this.isSubmitting = false;
        this.router.navigate(['/doctor/assessments']);
      },
      error: () => {
        this.error = 'Failed to submit review.';
        this.isSubmitting = false;
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
    if (this.isReviewed && this.reviewedScore !== null) {
      return this.reviewedScore;
    }
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
    const total = this.getTotalQuestions();
    if (value === null || total === 0) return 0;
    return Math.max(0, Math.min(100, Math.round((value / total) * 100)));
  }

  getScoreTone(): 'high' | 'medium' | 'low' | 'na' {
    const value = this.getScoreValue();
    const total = this.getTotalQuestions();
    if (value === null || total === 0) return 'na';
    const percent = (value / total) * 100;
    if (percent >= 80) return 'high';
    if (percent >= 60) return 'medium';
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

  getCorrectCount(): number {
    return this.answerReviews.filter(ar => ar.correct).length;
  }

  getTotalQuestions(): number {
    return this.answerReviews.length;
  }
}
