import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { PdfExportService } from '../../../core/services/pdf-export.service';
import { HealthRecord, RecordType } from '../../../core/models/api.model';
import { CareTeamService } from '../../../core/services/care-team.service';
import { PatientService } from '../../../core/services/patient.service';
import { DoctorAssignment, DoctorAssignmentStatus } from '../../../core/models/care-team.model';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { catchError, map } from 'rxjs/operators';
import { forkJoin, of } from 'rxjs';

interface DoctorPatientOption {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
}

@Component({
  selector: 'app-doctor-assessments',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ConfirmDialogComponent],
  templateUrl: './doctor-assessments.component.html',
  styleUrls: ['./doctor-assessments.component.scss']
})
export class DoctorAssessmentsComponent implements OnInit {
  static readonly DEFAULT_MMSE_QUESTIONS: string[] = [
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
  
  doctorUserId = '';
  patients: DoctorPatientOption[] = [];
  assessments: HealthRecord[] = [];
  latestResults: Record<string, HealthRecord> = {};
  allRecords: HealthRecord[] = [];
  isLoading = false;
  error = '';

  selectedPatientId = '';
  frequencyMonths = 4;

  selectedAnalysisPatientId = '';
  selectedTimeRange = 'month';
  selectedRecordType = 'ASSESSMENT';
  selectedPlanFilter = 'all';
  selectedReviewFilter = 'all';

  selectedAssessmentForView: HealthRecord | null = null;
  showAssessmentModal = false;
  reviewAnswers: Record<string, { correct: boolean; answer: string }> = {};

  selectedCheckInForView: HealthRecord | null = null;
  showCheckInModal = false;

  showDeleteConfirm = false;
  deleteTargetId: string | null = null;
  deleteTargetType: 'plan' | 'record' | null = null;

  editingAssessmentId: string | null = null;
  editFrequencyMonths = 4;
  editIsActive = true;
  editQuestions: string[] = [];

  constructor(
    private apiService: ApiService,
    private authService: AuthService,
    private pdfExportService: PdfExportService,
    private careTeamService: CareTeamService,
    private patientService: PatientService
  ) {}

  ngOnInit(): void {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) return;
    this.doctorUserId = currentUser.id;
    this.loadPatients();
    this.loadAllRecords();
  }

  loadPatients(): void {
    if (!this.doctorUserId) return;
    this.careTeamService.getDoctorPatients(this.doctorUserId)
      .pipe(
        map((assignments: DoctorAssignment[]) =>
          assignments.filter(a => a.status === DoctorAssignmentStatus.ACTIVE)
        ),
        catchError(() => {
          this.error = 'Failed to load patients.';
          return of([] as DoctorAssignment[]);
        })
      )
      .subscribe((activeAssignments) => {
        if (!activeAssignments.length) {
          this.patients = [];
          return;
        }

        const requests = activeAssignments.map(assignment =>
          this.patientService.getPatientById(assignment.patientId).pipe(
            map(patient => ({
              id: patient.id,
              userId: patient.userId || assignment.patientId,
              firstName: patient.firstName || assignment.patientFirstName || 'Unknown',
              lastName: patient.lastName || assignment.patientLastName || 'Patient'
            })),
            catchError(() => of({
              id: assignment.patientId,
              userId: assignment.patientId,
              firstName: assignment.patientFirstName || 'Unknown',
              lastName: assignment.patientLastName || 'Patient'
            }))
          )
        );

        forkJoin(requests).subscribe({
          next: (patients) => {
            this.patients = patients;
            if (!this.selectedPatientId && patients.length) {
              this.selectedPatientId = patients[0].userId;
            }
            if (!this.selectedAnalysisPatientId && patients.length) {
              this.selectedAnalysisPatientId = patients[0].userId;
            }
          },
          error: () => {
            this.error = 'Failed to load patients.';
            this.patients = [];
          }
        });
      });
  }

  loadAllRecords(): void {
    if (!this.doctorUserId) return;
    this.isLoading = true;
    this.apiService.getHealthRecords(undefined, this.doctorUserId).subscribe({
      next: (records) => {
        this.allRecords = records;
        const schedules = records.filter(r => r.recordType === RecordType.ASSESSMENT && !r.completedAt);
        const completed = records.filter(r => r.recordType === RecordType.ASSESSMENT && !!r.completedAt);
        this.assessments = schedules;
        this.latestResults = this.buildLatestResults(completed);
        this.isLoading = false;
      },
      error: () => {
        this.error = 'Failed to load records.';
        this.isLoading = false;
      }
    });
  }

  selectTimeRange(range: string): void {
    this.selectedTimeRange = range;
  }

  selectRecordType(type: string): void {
    this.selectedRecordType = type;
  }

  selectedTrendMetric = 'mood';

  selectTrendMetric(metric: string): void {
    this.selectedTrendMetric = metric;
  }

  selectPlanFilter(filter: string): void {
    this.selectedPlanFilter = filter;
  }

  selectReviewFilter(filter: string): void {
    this.selectedReviewFilter = filter;
  }

  get filteredAssessments(): HealthRecord[] {
    if (this.selectedPlanFilter === 'all') {
      return this.assessments;
    }
    return this.assessments.filter(a => {
      if (this.selectedPlanFilter === 'active') return a.isActive === true;
      if (this.selectedPlanFilter === 'inactive') return a.isActive === false || a.isActive === undefined || a.isActive === null;
      return true;
    });
  }

  get filteredCompletedAssessments(): HealthRecord[] {
    let records = this.completedAssessments;
    if (this.selectedReviewFilter === 'pending') {
      records = records.filter(r => !this.isReviewedRecord(r));
    } else if (this.selectedReviewFilter === 'reviewed') {
      records = records.filter(r => this.isReviewedRecord(r));
    }
    return records;
  }

  get completedAssessmentRecords(): HealthRecord[] {
    return this.filteredRecords.filter(r => r.recordType === RecordType.ASSESSMENT && r.completedAt && !r.isActive);
  }

  get completedAssessments(): HealthRecord[] {
    return this.allRecords
      .filter(r => r.recordType === RecordType.ASSESSMENT && !!r.completedAt)
      .sort((a, b) => new Date(b.completedAt || b.date).getTime() - new Date(a.completedAt || a.date).getTime());
  }

  isReviewedRecord(record: HealthRecord): boolean {
    return record.reviewedScore !== null && record.reviewedScore !== undefined;
  }

  get filteredRecords(): HealthRecord[] {
    let records = this.allRecords.filter(r => r.patientId === this.selectedAnalysisPatientId);
    
    if (this.selectedRecordType !== 'all') {
      records = records.filter(r => r.recordType === this.selectedRecordType);
    }

    const now = new Date();
    const startDate = this.getRangeStartDate(now);

    records = records.filter(r => {
      const recordDate = this.parseRecordDate(r.completedAt || r.date);
      return recordDate >= startDate && recordDate <= now;
    });

    return records.sort((a, b) =>
      this.parseRecordDate(a.completedAt || a.date).getTime() -
      this.parseRecordDate(b.completedAt || b.date).getTime()
    );
  }

  private getRangeStartDate(now: Date): Date {
    const startDate = new Date(now);
    startDate.setHours(0, 0, 0, 0);

    if (this.selectedTimeRange === 'today') {
      return startDate;
    }

    if (this.selectedTimeRange === 'week') {
      // US locale week starts on Sunday (0)
      const day = startDate.getDay();
      startDate.setDate(startDate.getDate() - day);
      return startDate;
    }

    if (this.selectedTimeRange === 'month') {
      startDate.setDate(1);
      return startDate;
    }

    if (this.selectedTimeRange === 'year') {
      startDate.setMonth(0, 1);
      return startDate;
    }

    return startDate;
  }

  private parseRecordDate(value: string): Date {
    // Interpret date-only values as local date to avoid timezone shifts.
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return new Date(`${value}T00:00:00`);
    }
    return new Date(value);
  }

  get isAssessmentMode(): boolean {
    return this.selectedRecordType === 'ASSESSMENT';
  }

  get isDailyCheckInMode(): boolean {
    return this.selectedRecordType === 'DAILY_CHECKIN';
  }

  get assessmentStats() {
    const records = this.completedAssessmentRecords;
    if (records.length === 0) {
      return {
        memoryScore: null,
        attentionScore: null,
        languageScore: null,
        neurospatialScore: null,
        executiveScore: null,
        declineRatePercent: null,
        avgScore: null,
        totalRecords: 0
      };
    }

    const scores = records.map(r => ({
      memory: r.memoryScore,
      attention: r.attentionScore,
      language: r.languageScore,
      neurospatial: r.neurospatialScore,
      executive: r.executiveScore,
      unified: r.unifiedScore,
      decline: r.declineRatePercent
    }));

    const avg = (arr: (number | null | undefined)[]) => {
      const valid = arr.filter((v): v is number => typeof v === 'number' && !isNaN(v));
      return valid.length ? Math.round(valid.reduce((a, b) => a + b, 0) / valid.length) : null;
    };

    const memoryScore = avg(scores.map(s => s.memory));
    const attentionScore = avg(scores.map(s => s.attention));
    const languageScore = avg(scores.map(s => s.language));
    const neurospatialScore = avg(scores.map(s => s.neurospatial));
    const executiveScore = avg(scores.map(s => s.executive));
    const avgScore = avg(scores.map(s => s.unified));

    let declineRatePercent: number | null = null;
    const declineValues = scores.map(s => s.decline).filter((v): v is number => typeof v === 'number');
    if (declineValues.length) {
      declineRatePercent = Math.round(declineValues.reduce((a, b) => a + b, 0) / declineValues.length);
    }

    return {
      memoryScore,
      attentionScore,
      languageScore,
      neurospatialScore,
      executiveScore,
      declineRatePercent,
      avgScore,
      totalRecords: records.length
    };
  }

  get dailyCheckInStats() {
    const records = this.filteredRecords.filter(r => r.recordType === RecordType.DAILY_CHECKIN);
    if (records.length === 0) {
      return {
        avgMood: null,
        avgSleep: null,
        avgAppetite: null,
        avgConfusion: null,
        avgMemory: null,
        totalRecords: 0,
        streak: 0,
        lastCheckIn: null
      };
    }

    const avg = (arr: (number | null | undefined)[]) => {
      const valid = arr.filter((v): v is number => typeof v === 'number' && !isNaN(v));
      return valid.length ? Math.round((valid.reduce((a, b) => a + b, 0) / valid.length) * 10) / 10 : null;
    };

    const sortedRecords = [...records].sort((a, b) => 
      new Date(b.completedAt || b.date).getTime() - new Date(a.completedAt || a.date).getTime()
    );

    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (let i = 0; i < sortedRecords.length; i++) {
      const recordDate = new Date(sortedRecords[i].completedAt || sortedRecords[i].date);
      recordDate.setHours(0, 0, 0, 0);
      const expectedDate = new Date(today);
      expectedDate.setDate(today.getDate() - i);
      
      if (recordDate.getTime() === expectedDate.getTime()) {
        streak++;
      } else {
        break;
      }
    }

    return {
      avgMood: avg(records.map(r => r.mood)),
      avgSleep: avg(records.map(r => r.sleep)),
      avgAppetite: avg(records.map(r => r.appetite)),
      avgConfusion: avg(records.map(r => r.confusion)),
      avgMemory: avg(records.map(r => r.memory)),
      totalRecords: records.length,
      streak,
      lastCheckIn: sortedRecords[0] ? this.formatDate(sortedRecords[0].completedAt || sortedRecords[0].date) : null
    };
  }

  get trendAnalysis() {
    const records = this.completedAssessmentRecords;
    if (records.length < 2) {
      return { trend: 'stable' as const, change: 0, firstScore: null as number | null, lastScore: null as number | null };
    }

    const scores = records.map(r => r.unifiedScore).filter((s): s is number => typeof s === 'number');
    if (scores.length < 2) {
      return { trend: 'stable' as const, change: 0, firstScore: null as number | null, lastScore: null as number | null };
    }

    const firstScore = scores[0];
    const lastScore = scores[scores.length - 1];
    const change = lastScore - firstScore;
    const trend = change > 2 ? 'up' as const : change < -2 ? 'down' as const : 'stable' as const;

    return { trend, change, firstScore, lastScore };
  }

  get dailyTrendAnalysis() {
    const records = this.filteredRecords.filter(r => r.recordType === RecordType.DAILY_CHECKIN);
    if (records.length < 2) {
      return { trend: 'stable' as const, moodChange: 0 };
    }

    const sorted = [...records].sort((a, b) => 
      new Date(a.completedAt || a.date).getTime() - new Date(b.completedAt || b.date).getTime()
    );
    
    const firstHalf = sorted.slice(0, Math.floor(sorted.length / 2));
    const secondHalf = sorted.slice(Math.floor(sorted.length / 2));
    
    const avgMoodFirst = firstHalf.reduce((sum, r) => sum + (r.mood || 0), 0) / firstHalf.length;
    const avgMoodSecond = secondHalf.reduce((sum, r) => sum + (r.mood || 0), 0) / secondHalf.length;
    const moodChange = avgMoodSecond - avgMoodFirst;
    
    const trend = moodChange > 0.3 ? 'up' as const : moodChange < -0.3 ? 'down' as const : 'stable' as const;
    
    return { trend, moodChange: Math.round(moodChange * 10) / 10 };
  }

  get scoreBreakdown() {
    const records = this.completedAssessmentRecords;
    const breakdown = { normal: 0, mild: 0, impaired: 0 };
    
    records.forEach(r => {
      const score = r.unifiedScore;
      if (typeof score === 'number' && !isNaN(score)) {
        if (score >= 8) breakdown.normal++;
        else if (score >= 6) breakdown.mild++;
        else breakdown.impaired++;
      }
    });

    return breakdown;
  }

  createAssessment(): void {
    if (!this.selectedPatientId || !this.doctorUserId) return;
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10);

    this.apiService.createHealthRecord({
      patientId: this.selectedPatientId,
      doctorUserId: this.doctorUserId,
      recordType: RecordType.ASSESSMENT,
      date: dateStr,
      assessmentType: 'MMSE',
      frequencyMonths: this.frequencyMonths,
      nextDueDate: dateStr,
      assessmentQuestions: DoctorAssessmentsComponent.DEFAULT_MMSE_QUESTIONS,
      isActive: true
    } as any).subscribe({
      next: () => {
        this.loadAllRecords();
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
    const todayStr = today.toISOString().slice(0, 10);
    const isReactivating = assessment.isActive !== true && this.editIsActive === true;
    const nextDueDate = isReactivating
      ? todayStr
      : (assessment.nextDueDate || assessment.date || todayStr);

    this.apiService.updateHealthRecord(assessment.id, {
      frequencyMonths: this.editFrequencyMonths,
      nextDueDate,
      isActive: this.editIsActive,
      assessmentQuestions: this.editQuestions.filter((q: string) => q.trim().length)
    } as any).subscribe({
      next: () => {
        this.editingAssessmentId = null;
        this.loadAllRecords();
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
    this.deleteTargetId = id;
    this.deleteTargetType = 'plan';
    this.showDeleteConfirm = true;
  }

  confirmDelete(): void {
    if (!this.deleteTargetId) return;

    this.apiService.deleteHealthRecord(this.deleteTargetId).subscribe({
      next: () => {
        this.showDeleteConfirm = false;
        this.deleteTargetId = null;
        this.deleteTargetType = null;
        this.loadAllRecords();
      },
      error: () => {
        this.error = 'Failed to delete assessment.';
        this.showDeleteConfirm = false;
        this.deleteTargetId = null;
        this.deleteTargetType = null;
      }
    });
  }

  cancelDelete(): void {
    this.showDeleteConfirm = false;
    this.deleteTargetId = null;
    this.deleteTargetType = null;
  }

  getPatientName(patientId: string): string {
    const patient = this.patients.find(p => p.userId === patientId);
    return patient ? `${patient.firstName} ${patient.lastName}` : 'Unknown patient';
  }

  hasResult(assessment: HealthRecord): boolean {
    return !!assessment.completedAt && !assessment.isActive;
  }

  getResultId(assessment: HealthRecord): string | null {
    if (this.hasResult(assessment)) {
      return assessment.id;
    }
    return null;
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
    if (score >= 8) return 'high';
    if (score >= 6) return 'medium';
    return 'low';
  }

  isReviewed(record: HealthRecord): boolean {
    return record.reviewedScore !== null && record.reviewedScore !== undefined;
  }

  getAssessmentReviewed(assessment: HealthRecord): boolean {
    return this.hasResult(assessment) && this.isReviewed(assessment);
  }

  getRecordTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      'all': 'All Records',
      'ASSESSMENT': 'Assessments',
      'DAILY_CHECKIN': 'Daily Check-ins'
    };
    return labels[type] || type;
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

  getTrendChartData(): { x: number; y: number; value: number; date: string }[] {
    const records = this.filteredRecords
      .filter(r => r.recordType === RecordType.DAILY_CHECKIN)
      .sort((a, b) => new Date(a.completedAt || a.date).getTime() - new Date(b.completedAt || b.date).getTime())
      .slice(-10);
    
    if (records.length === 0) return [];
    
    const data: { x: number; y: number; value: number; date: string }[] = [];
    const width = 260;
    const height = 80;
    const startX = 30;
    const startY = 20;
    
    const getValue = (r: HealthRecord) => {
      if (this.selectedTrendMetric === 'mood') return r.mood || 0;
      if (this.selectedTrendMetric === 'sleep') return r.sleep || 0;
      if (this.selectedTrendMetric === 'appetite') return r.appetite || 0;
      return r.mood || 0;
    };
    
    records.forEach((record, index) => {
      const x = startX + (index / Math.max(records.length - 1, 1)) * width;
      const value = getValue(record);
      const y = startY + ((5 - value) / 4) * height;
      data.push({
        x,
        y,
        value,
        date: this.formatDate(record.completedAt || record.date)
      });
    });
    
    return data;
  }

  getTrendChartPoints(): string {
    const data = this.getTrendChartData();
    return data.map(p => `${p.x},${p.y}`).join(' ');
  }

  getTrendDateRange(): { start: string; end: string } {
    const records = this.filteredRecords
      .filter(r => r.recordType === RecordType.DAILY_CHECKIN)
      .sort((a, b) => new Date(a.completedAt || a.date).getTime() - new Date(b.completedAt || b.date).getTime());
    
    if (records.length === 0) {
      return { start: 'No data', end: '' };
    }
    
    return {
      start: this.formatDate(records[0].completedAt || records[0].date),
      end: this.formatDate(records[records.length - 1].completedAt || records[records.length - 1].date)
    };
  }

  getTrendLabel(): string {
    const labels: Record<string, string> = {
      'mood': 'Mood',
      'sleep': 'Sleep',
      'appetite': 'Appetite'
    };
    return labels[this.selectedTrendMetric] || 'Mood';
  }

  getTrendColor(): string {
    const colors: Record<string, string> = {
      'mood': '#8b5cf6',
      'sleep': '#3b82f6',
      'appetite': '#f59e0b'
    };
    return colors[this.selectedTrendMetric] || '#8b5cf6';
  }

  getTrendEmoji(): string {
    const emojis: Record<string, string> = {
      'mood': '😊',
      'sleep': '😴',
      'appetite': '🍽️'
    };
    return emojis[this.selectedTrendMetric] || '😊';
  }

  viewAssessment(record: HealthRecord): void {
    this.selectedAssessmentForView = record;
    this.reviewAnswers = {};

    const questionCount = record.assessmentQuestions?.length || 10;
    for (let i = 0; i < questionCount; i++) {
      const key = `q_${i + 1}`;
      const answer = record.responses ? String(record.responses[key] || '') : '';
      this.reviewAnswers[key] = { correct: false, answer };
    }
    
    this.showAssessmentModal = true;
  }

  closeAssessmentModal(): void {
    this.showAssessmentModal = false;
    this.selectedAssessmentForView = null;
    this.reviewAnswers = {};
  }

  toggleAnswerCorrect(questionKey: string): void {
    if (this.reviewAnswers[questionKey]) {
      this.reviewAnswers[questionKey].correct = !this.reviewAnswers[questionKey].correct;
      this.recalculateScore();
    }
  }

  recalculateScore(): void {
    if (!this.selectedAssessmentForView) return;

    const entries = Object.entries(this.reviewAnswers);
    let earned = 0;
    let maxPossible = 0;
    entries.forEach(([key, value]) => {
      const index = Number(key.replace('q_', '')) - 1;
      const weight = index === 0 ? 2 : 1;
      maxPossible += weight;
      if (value.correct) {
        earned += weight;
      }
    });
    const normalizedScore = maxPossible > 0 ? Math.round(((earned / maxPossible) * 10) * 10) / 10 : 0;

    this.selectedAssessmentForView = {
      ...this.selectedAssessmentForView,
      unifiedScore: normalizedScore
    };
  }

  deleteAssessmentRecord(id: string): void {
    this.deleteTargetId = id;
    this.deleteTargetType = 'record';
    this.showDeleteConfirm = true;
  }

  confirmDeleteRecord(): void {
    if (!this.deleteTargetId) return;

    this.apiService.deleteHealthRecord(this.deleteTargetId).subscribe({
      next: () => {
        this.showDeleteConfirm = false;
        this.deleteTargetId = null;
        this.deleteTargetType = null;
        this.loadAllRecords();
      },
      error: () => {
        this.error = 'Failed to delete assessment record.';
        this.showDeleteConfirm = false;
        this.deleteTargetId = null;
        this.deleteTargetType = null;
      }
    });
  }

  viewCheckIn(record: HealthRecord): void {
    this.selectedCheckInForView = record;
    this.showCheckInModal = true;
  }

  closeCheckInModal(): void {
    this.showCheckInModal = false;
    this.selectedCheckInForView = null;
  }

  getPatientNameById(patientId: string): string {
    const patient = this.patients.find(p => p.userId === patientId);
    return patient ? `${patient.firstName} ${patient.lastName}` : 'Unknown Patient';
  }

  getAssessmentChartData(): { x: number; y: number; value: number; date: string }[] {
    const records = this.completedAssessmentRecords
      .filter(r => r.unifiedScore != null)
      .sort((a, b) => new Date(a.completedAt || a.date).getTime() - new Date(b.completedAt || b.date).getTime())
      .slice(-10);
    
    if (records.length === 0) return [];
    
    const data: { x: number; y: number; value: number; date: string }[] = [];
    const width = 260;
    const height = 100;
    const startX = 30;
    const startY = 20;
    
    records.forEach((record, index) => {
      const x = startX + (index / Math.max(records.length - 1, 1)) * width;
      const score = record.unifiedScore || 0;
      const y = startY + ((10 - score) / 10) * height;
      data.push({
        x,
        y,
        value: score,
        date: this.formatDate(record.completedAt || record.date)
      });
    });
    
    return data;
  }

  getAssessmentChartPoints(): string {
    const data = this.getAssessmentChartData();
    return data.map(p => `${p.x},${p.y}`).join(' ');
  }

  getAssessmentChartDateRange(): { start: string; end: string } {
    const records = this.completedAssessmentRecords
      .filter(r => r.unifiedScore != null)
      .sort((a, b) => new Date(a.completedAt || a.date).getTime() - new Date(b.completedAt || b.date).getTime());
    
    if (records.length === 0) {
      return { start: 'No data', end: '' };
    }
    
    return {
      start: this.formatDate(records[0].completedAt || records[0].date),
      end: this.formatDate(records[records.length - 1].completedAt || records[records.length - 1].date)
    };
  }

  exportPdfReport(): void {
    this.pdfExportService.exportElementAsPdf(
      'doctor-health-record-analytics',
      'Doctor Health Record Command Center Report'
    );
  }
}
