import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { HealthRecord, HealthRecordCreateRequest, RecordType, PatientProfile } from '../../../core/models/api.model';

@Component({
  selector: 'app-doctor-assessments',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './doctor-assessments.component.html',
  styleUrls: ['./doctor-assessments.component.scss']
})
export class DoctorAssessmentsComponent implements OnInit {
  static readonly DEFAULT_MMSE_QUESTIONS: string[] = [
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
  doctorUserId = '';
  patients: PatientProfile[] = [];
  assessments: HealthRecord[] = [];
  latestResults: Record<string, HealthRecord> = {};
  isLoading = false;
  error = '';

  selectedPatientId = '';
  frequencyMonths = 4;

  editingAssessmentId: string | null = null;
  editFrequencyMonths = 4;
  editIsActive = true;
  editQuestions: string[] = [];

  constructor(
    private apiService: ApiService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) return;
    this.doctorUserId = currentUser.id;
    this.loadPatients();
    this.loadAssessments();
  }

  loadPatients(): void {
    if (!this.doctorUserId) return;
    this.apiService.getDoctorPatients(this.doctorUserId).subscribe({
      next: (patients) => {
        this.patients = patients;
        if (!this.selectedPatientId && patients.length) {
          this.selectedPatientId = patients[0].userId;
        }
      },
      error: () => {
        this.error = 'Failed to load patients.';
      }
    });
  }

  loadAssessments(): void {
    if (!this.doctorUserId) return;
    this.isLoading = true;
    this.apiService.getHealthRecords(undefined, this.doctorUserId, RecordType.ASSESSMENT).subscribe({
      next: (records) => {
        const schedules = records.filter(record => record.isActive);
        const completed = records.filter(record => !!record.completedAt && !record.isActive);
        this.assessments = schedules;
        this.latestResults = this.buildLatestResults(completed);
        this.isLoading = false;
      },
      error: () => {
        this.error = 'Failed to load assessments.';
        this.isLoading = false;
      }
    });
  }

  createAssessment(): void {
    if (!this.selectedPatientId || !this.doctorUserId) return;
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10);

    const request: HealthRecordCreateRequest = {
      patientId: this.selectedPatientId,
      doctorUserId: this.doctorUserId,
      recordType: RecordType.ASSESSMENT,
      date: dateStr,
      assessmentType: 'MMSE',
      frequencyMonths: this.frequencyMonths,
      nextDueDate: dateStr,
      assessmentQuestions: DoctorAssessmentsComponent.DEFAULT_MMSE_QUESTIONS,
      isActive: true
    };

    this.apiService.createHealthRecord(request).subscribe({
      next: () => {
        this.loadAssessments();
      },
      error: () => {
        this.error = 'Failed to create assessment.';
      }
    });
  }

  startEdit(assessment: HealthRecord): void {
    this.editingAssessmentId = assessment.id;
    this.editFrequencyMonths = assessment.frequencyMonths ?? 4;
    this.editIsActive = assessment.isActive ?? true;
    this.editQuestions = (assessment.assessmentQuestions?.length
      ? [...assessment.assessmentQuestions]
      : [...DoctorAssessmentsComponent.DEFAULT_MMSE_QUESTIONS]);
  }

  cancelEdit(): void {
    this.editingAssessmentId = null;
  }

  saveEdit(assessment: HealthRecord): void {
    const today = new Date();
    const nextDue = new Date(today);
    nextDue.setMonth(nextDue.getMonth() + this.editFrequencyMonths);

    this.apiService.updateHealthRecord(assessment.id, {
      frequencyMonths: this.editFrequencyMonths,
      nextDueDate: nextDue.toISOString().slice(0, 10),
      isActive: this.editIsActive,
      assessmentQuestions: this.editQuestions.filter(q => q.trim().length)
    }).subscribe({
      next: () => {
        this.editingAssessmentId = null;
        this.loadAssessments();
      },
      error: () => {
        this.error = 'Failed to update assessment.';
      }
    });
  }

  addQuestion(): void {
    this.editQuestions.push('');
  }

  removeQuestion(index: number): void {
    this.editQuestions.splice(index, 1);
  }

  deleteAssessment(id: string): void {
    this.apiService.deleteHealthRecord(id).subscribe({
      next: () => {
        this.loadAssessments();
      },
      error: () => {
        this.error = 'Failed to delete assessment.';
      }
    });
  }

  getPatientName(patientId: string): string {
    const patient = this.patients.find(p => p.userId === patientId);
    return patient ? `${patient.firstName} ${patient.lastName}` : 'Unknown patient';
  }

  hasResult(assessment: HealthRecord): boolean {
    return !!this.latestResults[assessment.patientId];
  }

  getResultId(assessment: HealthRecord): string | null {
    const result = this.latestResults[assessment.patientId];
    return result ? result.id : null;
  }

  formatDate(value?: string | null): string {
    if (!value) return 'Not scheduled';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }

  getDueStatus(assessment: HealthRecord): 'overdue' | 'upcoming' {
    const dueDateValue = assessment.nextDueDate || assessment.date;
    if (!dueDateValue) return 'upcoming';
    const dueDate = new Date(dueDateValue);
    if (Number.isNaN(dueDate.getTime())) return 'upcoming';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);
    return dueDate < today ? 'overdue' : 'upcoming';
  }

  getLatestScore(assessment: HealthRecord): number | null {
    const result = this.latestResults[assessment.patientId];
    const score = result?.unifiedScore;
    if (typeof score === 'number') return score;
    if (score !== null && score !== undefined) {
      const parsed = Number(score);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  }

  getLatestResultCount(): number {
    return Object.keys(this.latestResults).length;
  }

  getScoreTone(score: number | null): 'high' | 'medium' | 'low' | 'na' {
    if (score === null) return 'na';
    if (score >= 24) return 'high';
    if (score >= 18) return 'medium';
    return 'low';
  }

  private buildLatestResults(records: HealthRecord[]): Record<string, HealthRecord> {
    const map: Record<string, HealthRecord> = {};
    records.forEach(record => {
      const current = map[record.patientId];
      if (!current) {
        map[record.patientId] = record;
        return;
      }
      const currentDate = new Date(current.completedAt || current.date).getTime();
      const recordDate = new Date(record.completedAt || record.date).getTime();
      if (recordDate > currentDate) {
        map[record.patientId] = record;
      }
    });
    return map;
  }
}
