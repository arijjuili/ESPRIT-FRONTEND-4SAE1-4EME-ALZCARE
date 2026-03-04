import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { HealthRecord } from '../../../core/models/api.model';

interface AnswerReview {
  key: string;
  prompt: string;
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
    if (!this.assessment) {
      this.answerReviews = [];
      return;
    }

    const responseMap = (this.assessment.responses || {}) as Record<string, unknown>;
    const questions = this.getAssessmentQuestions();

    if (!questions.length && !Object.keys(responseMap).length) {
      this.answerReviews = [];
      return;
    }

    if (questions.length) {
      this.answerReviews = questions.map((prompt, index) => {
        const key = `q_${index + 1}`;
        return {
          key,
          prompt,
          value: String(responseMap[key] || ''),
          correct: false
        };
      });
    } else {
      this.answerReviews = Object.entries(responseMap).map(([key, value]) => ({
        key,
        prompt: this.formatResponseKey(key),
        value: String(value || ''),
        correct: false
      }));
    }

    if (this.assessment.reviewedAnswers) {
      const reviewedMap = this.assessment.reviewedAnswers as Record<string, boolean>;
      this.answerReviews.forEach(ar => {
        if (reviewedMap[ar.key] !== undefined) {
          ar.correct = reviewedMap[ar.key];
        }
      });
      this.reviewedScore = this.assessment?.reviewedScore ?? null;
      this.isReviewed = this.assessment?.reviewedScore != null;
      return;
    }

    this.calculateReviewedScore();
  }

  toggleAnswerCorrect(index: number): void {
    this.answerReviews[index].correct = !this.answerReviews[index].correct;
    this.calculateReviewedScore();
  }

  calculateReviewedScore(): void {
    this.reviewedScore = this.calculateWeightedFromReviews();
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
    if (value === null) return 0;
    return Math.max(0, Math.min(100, Math.round((value / 10) * 100)));
  }

  getScoreTone(): 'high' | 'medium' | 'low' | 'na' {
    const value = this.getScoreValue();
    if (value === null) return 'na';
    if (value >= 8) return 'high';
    if (value >= 6) return 'medium';
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

  private getAssessmentQuestions(): string[] {
    if (this.assessment?.assessmentQuestions?.length) {
      return this.assessment.assessmentQuestions;
    }
    return [
      'What is today\'s date?',
      'Where are you right now?',
      'Repeat these three words: Apple, Table, Penny',
      'Count backward by 7s from 100',
      'Recall the three words from earlier',
      'Name two common objects you can see',
      'Repeat: "No ifs, ands, or buts."',
      'Follow a 3-step command (describe what you did)',
      'Read and obey a simple written command',
      'Write a complete sentence'
    ];
  }

  private calculateWeightedFromReviews(): number {
    if (!this.answerReviews.length) return 0;

    let earned = 0;
    let maxPossible = 0;
    this.answerReviews.forEach((review, index) => {
      const weight = this.questionWeight(index);
      maxPossible += weight;
      if (review.correct) {
        earned += weight;
      }
    });

    if (maxPossible === 0) return 0;
    return Math.round(((earned / maxPossible) * 10) * 10) / 10;
  }

  private questionWeight(index: number): number {
    return index === 0 ? 2 : 1;
  }
}
