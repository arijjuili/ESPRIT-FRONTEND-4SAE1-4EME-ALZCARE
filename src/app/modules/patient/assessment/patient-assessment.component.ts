import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { HealthRecord, RecordType } from '../../../core/models/api.model';

interface MmseQuestion {
  id: string;
  prompt: string;
  placeholder: string;
}

@Component({
  selector: 'app-patient-assessment',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './patient-assessment.component.html',
  styleUrls: ['./patient-assessment.component.scss']
})
export class PatientAssessmentComponent implements OnInit {
  questions: MmseQuestion[] = [];

  responses: Record<string, string> = {};
  assessmentRecord: HealthRecord | null = null;
  isLoading = false;
  isSubmitting = false;
  error = '';
  success = false;
  submitted = false;

  constructor(
    private apiService: ApiService,
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      const assessmentId = params.get('assessmentId');
      this.loadAssessment(assessmentId);
    });
  }

  loadAssessment(assessmentId?: string | null): void {
    const patientId = this.authService.getCurrentUser()?.id;
    if (!patientId) return;

    this.isLoading = true;
    this.apiService.getHealthRecords(patientId, undefined, RecordType.ASSESSMENT).subscribe({
      next: (records) => {
        this.assessmentRecord = this.pickScheduleRecord(records, assessmentId || undefined);
        this.questions = this.mapQuestions(this.assessmentRecord?.assessmentQuestions);
        this.isLoading = false;
      },
      error: () => {
        this.error = 'Unable to load assessment.';
        this.isLoading = false;
      }
    });
  }

  submitAssessment(): void {
    if (!this.assessmentRecord || this.isSubmitting) return;
    this.isSubmitting = true;
    this.error = '';
    this.success = false;

    const score = this.calculateScore();
    this.apiService.submitAssessment(this.assessmentRecord.id, {
      responses: this.responses,
      unifiedScore: score
    }).subscribe({
      next: () => {
        this.success = true;
        this.submitted = true;
        this.isSubmitting = false;
        const dueDate = this.assessmentRecord?.nextDueDate || this.assessmentRecord?.date || '';
        this.router.navigate(['/patient/dashboard'], {
          state: { assessmentSubmitted: true, nextDueDate: dueDate }
        });
      },
      error: () => {
        this.error = 'Failed to submit assessment. Please try again.';
        this.isSubmitting = false;
      }
    });
  }

  calculateScore(): number {
    if (!this.questions.length) return 0;

    let earned = 0;
    let maxPossible = 0;
    this.questions.forEach((question, index) => {
      const weight = this.questionWeight(index);
      maxPossible += weight;
      const answer = (this.responses[question.id] || '').trim();
      if (answer.length > 0) {
        earned += weight;
      }
    });

    if (maxPossible === 0) return 0;
    return Math.round(((earned / maxPossible) * 10) * 10) / 10;
  }

  isDue(): boolean {
    if (!this.assessmentRecord) return false;
    const today = new Date().setHours(0, 0, 0, 0);
    const dueDate = this.assessmentRecord.nextDueDate
      ? new Date(this.assessmentRecord.nextDueDate).setHours(0, 0, 0, 0)
      : new Date(this.assessmentRecord.date).setHours(0, 0, 0, 0);
    return dueDate <= today;
  }

  private pickLatestRecord(records: HealthRecord[]): HealthRecord | null {
    if (!records.length) return null;
    return records
      .slice()
      .sort((a, b) => {
        const aDate = a.nextDueDate || a.completedAt || a.date;
        const bDate = b.nextDueDate || b.completedAt || b.date;
        return new Date(bDate).getTime() - new Date(aDate).getTime();
      })[0];
  }

  private pickScheduleRecord(records: HealthRecord[], preferredId?: string): HealthRecord | null {
    const schedulable = records.filter(record =>
      record.isActive === true && !record.completedAt
    );
    if (preferredId) {
      const preferred = schedulable.find(record => record.id === preferredId);
      if (preferred) return preferred;
    }
    if (schedulable.length) {
      return schedulable
        .slice()
        .sort((a, b) => {
          const aDue = a.nextDueDate || a.date;
          const bDue = b.nextDueDate || b.date;
          return new Date(aDue).getTime() - new Date(bDue).getTime();
        })[0];
    }
    return this.pickLatestRecord(records);
  }

  private mapQuestions(questions?: string[]): MmseQuestion[] {
    const defaults = [
      'What is today’s date?',
      'Where are you right now?',
      'Repeat these three words: Apple, Table, Penny',
      'Count backward by 7s from 100',
      'Recall the three words from earlier',
      'Name two common objects you can see',
      'Repeat: “No ifs, ands, or buts.”',
      'Follow a 3-step command (describe what you did)',
      'Read and obey a simple written command',
      'Write a complete sentence'
    ];
    const list = questions && questions.length ? questions : defaults;
    return list.map((prompt, index) => ({
      id: `q_${index + 1}`,
      prompt,
      placeholder: 'Type your answer'
    }));
  }

  private questionWeight(index: number): number {
    return index === 0 ? 2 : 1;
  }
}
