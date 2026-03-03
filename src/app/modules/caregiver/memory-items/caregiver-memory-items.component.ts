import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import {
  MemoryCategory,
  MemoryItem,
  MemoryItemCreateRequest,
  MemoryItemUpdateRequest,
  PatientProfile,
  QuizAttempt
} from '../../../core/models/api.model';

interface MemoryItemForm {
  patientId: string;
  memoryCategory: MemoryCategory;
  title: string;
  description: string;
  imageUrl: string;
  location: string;
  persons: string[];
  questions: string[];
  correctAnswers: string[];
}

interface MemoryAttemptPoint {
  label: string;
  attempts: number;
  correct: number;
  accuracy: number;
}

interface MemoryWalletAnalyticsSummary {
  totalAttempts: number;
  answeredAttempts: number;
  correctAnswers: number;
  accuracyPercent: number;
  avgResponseSeconds: number;
  totalItems: number;
  completedItems: number;
  pendingItems: number;
  completionRate: number;
  trend: 'up' | 'down' | 'stable';
  trendDelta: number;
  recentAttempts: QuizAttempt[];
  dailySeries: MemoryAttemptPoint[];
}

@Component({
  selector: 'app-caregiver-memory-items',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './caregiver-memory-items.component.html',
  styleUrls: ['./caregiver-memory-items.component.scss']
})
export class CaregiverMemoryItemsComponent implements OnInit {
  memoryItems: MemoryItem[] = [];
  quizAttempts: QuizAttempt[] = [];
  patients: PatientProfile[] = [];
  loading = false;
  analyticsLoading = false;
  error = '';
  success = '';

  categoryFilter: MemoryCategory | 'ALL' = 'ALL';
  categories = Object.values(MemoryCategory);
  patientNames: Record<string, string> = {};
  selectedAnalyticsPatientId = '';
  analytics: MemoryWalletAnalyticsSummary = this.emptyAnalytics();

  showCreateModal = false;
  showEditModal = false;
  showDeleteModal = false;
  pendingDelete: MemoryItem | null = null;
  createSubmitted = false;
  editSubmitted = false;
  createImageFileName = '';
  editImageFileName = '';

  createForm: MemoryItemForm = {
    patientId: '',
    memoryCategory: MemoryCategory.FAMILY,
    title: '',
    description: '',
    imageUrl: '',
    location: '',
    persons: [''],
    questions: [''],
    correctAnswers: ['']
  };

  editForm: MemoryItemForm = {
    patientId: '',
    memoryCategory: MemoryCategory.FAMILY,
    title: '',
    description: '',
    imageUrl: '',
    location: '',
    persons: [''],
    questions: [''],
    correctAnswers: ['']
  };

  editingItem: MemoryItem | null = null;

  constructor(private apiService: ApiService, private authService: AuthService) {}

  ngOnInit(): void {
    this.loadPatients();
    this.loadMemoryItems();
    this.loadQuizAttempts();
  }

  get filteredMemoryItems(): MemoryItem[] {
    return this.getPageFilteredMemoryItems();
  }

  private getPageFilteredMemoryItems(): MemoryItem[] {
    let items = this.memoryItems;
    if (this.selectedAnalyticsPatientId) {
      items = items.filter(item => item.patientId === this.selectedAnalyticsPatientId);
    }
    if (this.categoryFilter !== 'ALL') {
      items = items.filter(item => item.memoryCategory === this.categoryFilter);
    }
    return items;
  }

  loadMemoryItems(): void {
    this.loading = true;
    this.error = '';
    this.success = '';
    this.apiService.getMemoryItems().subscribe({
      next: (items) => {
        this.memoryItems = items;
        this.resolvePatientNames(items);
        this.recomputeAnalytics();
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load memory items:', err);
        this.error = err.error?.detail || 'Failed to load memory items';
        this.loading = false;
      }
    });
  }

  createMemoryItem(): void {
    this.createSubmitted = true;
    this.error = '';
    this.success = '';

    if (!this.createForm.patientId.trim() || !this.createForm.title.trim()) {
      this.error = 'Patient and title are required';
      return;
    }

    const questionPayload = this.buildQuestionAnswerPayload(this.createForm);
    if (!questionPayload) {
      return;
    }

    const payload: MemoryItemCreateRequest = {
      patientId: this.createForm.patientId.trim(),
      memoryCategory: this.createForm.memoryCategory,
      title: this.createForm.title.trim(),
      description: this.createForm.description.trim() || undefined,
      imageUrl: this.createForm.imageUrl.trim() || undefined,
      location: this.createForm.location.trim() || undefined,
      persons: this.cleanList(this.createForm.persons),
      questions: questionPayload.questions,
      correctAnswers: questionPayload.correctAnswers,
      createdAt: new Date().toISOString()
    };

    this.loading = true;
    this.apiService.createMemoryItem(payload).subscribe({
      next: () => {
        this.success = 'Memory item created successfully';
        this.resetCreateForm();
        this.showCreateModal = false;
        this.loadMemoryItems();
      },
      error: (err) => {
        console.error('Failed to create memory item:', err);
        this.error = err.error?.detail || 'Failed to create memory item';
        this.loading = false;
      }
    });
  }

  startEdit(item: MemoryItem): void {
    this.editingItem = item;
    this.showEditModal = true;
    this.editSubmitted = false;
    const questions = item.questions && item.questions.length > 0 ? [...item.questions] : [''];
    const correctAnswers = item.correctAnswers && item.correctAnswers.length > 0
      ? [...item.correctAnswers]
      : new Array(questions.length).fill('');
    if (correctAnswers.length < questions.length) {
      correctAnswers.push(...new Array(questions.length - correctAnswers.length).fill(''));
    }
    if (correctAnswers.length > questions.length) {
      correctAnswers.splice(questions.length);
    }
    this.editForm = {
      patientId: item.patientId,
      memoryCategory: item.memoryCategory,
      title: item.title,
      description: item.description || '',
      imageUrl: item.imageUrl || '',
      location: item.location || '',
      persons: item.persons && item.persons.length > 0 ? [...item.persons] : [''],
      questions,
      correctAnswers
    };
    this.editImageFileName = item.imageUrl ? 'Current image selected' : '';
  }

  cancelEdit(): void {
    this.editingItem = null;
    this.showEditModal = false;
    this.success = '';
    this.error = '';
    this.editSubmitted = false;
    this.editImageFileName = '';
  }

  updateMemoryItem(): void {
    if (!this.editingItem) return;
    this.editSubmitted = true;
    this.error = '';
    this.success = '';

    const questionPayload = this.buildQuestionAnswerPayload(this.editForm);
    if (!questionPayload) {
      return;
    }

    const payload: MemoryItemUpdateRequest = {
      memoryCategory: this.editForm.memoryCategory,
      title: this.editForm.title.trim(),
      description: this.editForm.description.trim() || undefined,
      imageUrl: this.editForm.imageUrl.trim() || undefined,
      location: this.editForm.location.trim() || undefined,
      persons: this.cleanList(this.editForm.persons),
      questions: questionPayload.questions,
      correctAnswers: questionPayload.correctAnswers
    };

    this.loading = true;
    this.apiService.updateMemoryItem(this.editingItem.id, payload).subscribe({
      next: () => {
        this.success = 'Memory item updated successfully';
        this.editingItem = null;
        this.showEditModal = false;
        this.editImageFileName = '';
        this.loadMemoryItems();
      },
      error: (err) => {
        console.error('Failed to update memory item:', err);
        this.error = err.error?.detail || 'Failed to update memory item';
        this.loading = false;
      }
    });
  }

  requestDelete(item: MemoryItem): void {
    this.pendingDelete = item;
    this.showDeleteModal = true;
  }

  confirmDelete(): void {
    if (!this.pendingDelete) return;
    const item = this.pendingDelete;
    this.loading = true;
    this.error = '';
    this.success = '';
    this.apiService.deleteMemoryItem(item.id).subscribe({
      next: () => {
        this.success = 'Memory item deleted';
        this.showDeleteModal = false;
        this.pendingDelete = null;
        this.loadMemoryItems();
      },
      error: (err) => {
        console.error('Failed to delete memory item:', err);
        this.error = err.error?.detail || 'Failed to delete memory item';
        this.loading = false;
      }
    });
  }

  cancelDelete(): void {
    this.showDeleteModal = false;
    this.pendingDelete = null;
  }

  resetCreateForm(): void {
    this.createForm = {
      patientId: '',
      memoryCategory: MemoryCategory.FAMILY,
      title: '',
      description: '',
      imageUrl: '',
      location: '',
      persons: [''],
      questions: [''],
      correctAnswers: ['']
    };
    this.createImageFileName = '';
    this.createSubmitted = false;
  }

  trackById(_: number, item: MemoryItem): string {
    return item.id;
  }

  trackByIndex(index: number): number {
    return index;
  }

  trackByAttemptId(_: number, attempt: QuizAttempt): string {
    return attempt.id;
  }

  getPatientName(patientId: string): string {
    return this.patientNames[patientId] || `Patient ${patientId.slice(0, 8)}…`;
  }

  openCreateModal(): void {
    this.error = '';
    this.success = '';
    this.createSubmitted = false;
    this.showCreateModal = true;
  }

  closeCreateModal(): void {
    this.showCreateModal = false;
    this.createSubmitted = false;
    this.createImageFileName = '';
  }

  onAnalyticsPatientChange(): void {
    this.recomputeAnalytics();
  }

  onCategoryFilterChange(): void {
    this.recomputeAnalytics();
  }

  onCreateImageSelected(event: Event): void {
    this.readImageFile(event, 'create');
  }

  onEditImageSelected(event: Event): void {
    this.readImageFile(event, 'edit');
  }

  clearImage(target: 'create' | 'edit'): void {
    if (target === 'create') {
      this.createForm.imageUrl = '';
      this.createImageFileName = '';
      return;
    }
    this.editForm.imageUrl = '';
    this.editImageFileName = '';
  }

  addPerson(target: 'create' | 'edit'): void {
    const list = target === 'create' ? this.createForm.persons : this.editForm.persons;
    list.push('');
  }

  removePerson(target: 'create' | 'edit', index: number): void {
    const list = target === 'create' ? this.createForm.persons : this.editForm.persons;
    list.splice(index, 1);
    if (list.length === 0) list.push('');
  }

  addQuestion(target: 'create' | 'edit'): void {
    const form = target === 'create' ? this.createForm : this.editForm;
    form.questions.push('');
    form.correctAnswers.push('');
  }

  removeQuestion(target: 'create' | 'edit', index: number): void {
    const form = target === 'create' ? this.createForm : this.editForm;
    form.questions.splice(index, 1);
    form.correctAnswers.splice(index, 1);
    if (form.questions.length === 0) {
      form.questions.push('');
      form.correctAnswers.push('');
    }
  }

  private cleanList(values: string[]): string[] | undefined {
    const items = values.map(value => value.trim()).filter(value => value.length > 0);
    return items.length > 0 ? items : undefined;
  }

  isQuestionPairInvalid(target: 'create' | 'edit', index: number): boolean {
    const form = target === 'create' ? this.createForm : this.editForm;
    const question = (form.questions[index] || '').trim();
    const answer = (form.correctAnswers[index] || '').trim();
    return (question.length > 0 && answer.length === 0) || (answer.length > 0 && question.length === 0);
  }

  private buildQuestionAnswerPayload(form: MemoryItemForm): { questions?: string[]; correctAnswers?: string[] } | null {
    const questions = form.questions.map(value => value.trim());
    const answers = form.correctAnswers.map(value => value.trim());
    const maxLength = Math.max(questions.length, answers.length);
    const mergedQuestions: string[] = [];
    const mergedAnswers: string[] = [];

    for (let i = 0; i < maxLength; i++) {
      const question = questions[i] || '';
      const answer = answers[i] || '';
      if (!question && !answer) {
        continue;
      }
      if (!question || !answer) {
        this.error = 'Each question must have a matching correct answer';
        return null;
      }
      mergedQuestions.push(question);
      mergedAnswers.push(answer);
    }

    if (mergedQuestions.length === 0) {
      return { questions: undefined, correctAnswers: undefined };
    }

    return { questions: mergedQuestions, correctAnswers: mergedAnswers };
  }

  private readImageFile(event: Event, target: 'create' | 'edit'): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      this.error = 'Please select a valid image file.';
      input.value = '';
      return;
    }

    const maxSizeBytes = 5 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      this.error = 'Image size must be 5MB or less.';
      input.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      if (!result) {
        this.error = 'Failed to read image file.';
        return;
      }
      if (target === 'create') {
        this.createForm.imageUrl = result;
        this.createImageFileName = file.name;
      } else {
        this.editForm.imageUrl = result;
        this.editImageFileName = file.name;
      }
    };
    reader.onerror = () => {
      this.error = 'Failed to read image file.';
    };
    reader.readAsDataURL(file);
  }

  private loadPatients(): void {
    const caregiverId = this.authService.getCurrentUser()?.id;
    if (!caregiverId) {
      this.patients = [];
      return;
    }

    this.apiService.getCaregiverPatients(caregiverId, true).subscribe({
      next: (patients) => {
        this.patients = patients;
        patients.forEach(patient => {
          const name = `${patient.firstName} ${patient.lastName}`.trim();
          this.patientNames[patient.userId] = name || patient.userId;
        });
        this.recomputeAnalytics();
      },
      error: () => {
        // fallback: keep dropdown empty; names will be resolved per memory item if possible
      }
    });
  }

  private loadQuizAttempts(): void {
    this.analyticsLoading = true;
    this.apiService.getQuizAttempts().subscribe({
      next: (attempts) => {
        this.quizAttempts = attempts;
        this.recomputeAnalytics();
        this.analyticsLoading = false;
      },
      error: () => {
        this.analyticsLoading = false;
      }
    });
  }

  private recomputeAnalytics(): void {
    const filteredItems = this.getPageFilteredMemoryItems();
    const attempts = this.getAnalyticsAttempts(filteredItems);
    const answeredAttempts = attempts.filter(attempt => (attempt.patientAnswer || '').trim().length > 0);
    const correctAnswers = answeredAttempts.filter(attempt => attempt.isCorrect === true).length;
    const accuracyPercent = answeredAttempts.length > 0
      ? Math.round((correctAnswers / answeredAttempts.length) * 100)
      : 0;

    const responseTimes = answeredAttempts
      .map(attempt => attempt.responseTimeSeconds ?? 0)
      .filter(seconds => seconds > 0);
    const avgResponseSeconds = responseTimes.length > 0
      ? Math.round(responseTimes.reduce((sum, seconds) => sum + seconds, 0) / responseTimes.length)
      : 0;

    const completedItemIds = this.getCompletedItemIdsWithinDays(answeredAttempts, filteredItems, 7);
    const completedItems = completedItemIds.size;
    const totalItems = filteredItems.length;
    const pendingItems = Math.max(totalItems - completedItems, 0);
    const completionRate = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

    const trendSnapshot = this.calculateAccuracyTrend(answeredAttempts);
    const recentAttempts = [...answeredAttempts]
      .sort((a, b) => this.toDate(b.attemptDate).getTime() - this.toDate(a.attemptDate).getTime())
      .slice(0, 6);

    this.analytics = {
      totalAttempts: attempts.length,
      answeredAttempts: answeredAttempts.length,
      correctAnswers,
      accuracyPercent,
      avgResponseSeconds,
      totalItems,
      completedItems,
      pendingItems,
      completionRate,
      trend: trendSnapshot.trend,
      trendDelta: trendSnapshot.delta,
      recentAttempts,
      dailySeries: this.buildDailySeries(answeredAttempts, 7)
    };
  }

  private getAnalyticsAttempts(filteredItems: MemoryItem[]): QuizAttempt[] {
    if (filteredItems.length === 0) {
      return [];
    }
    const itemIds = new Set(filteredItems.map(item => item.id));
    const patientIds = new Set(filteredItems.map(item => item.patientId));
    return this.quizAttempts.filter(attempt =>
      itemIds.has(attempt.memoryItemId) &&
      patientIds.has(attempt.patientId)
    );
  }

  private getCompletedItemIdsWithinDays(attempts: QuizAttempt[], items: MemoryItem[], days: number): Set<string> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const answeredQuestionsByItem = new Map<string, Set<string>>();
    attempts.forEach(attempt => {
      const attemptDate = this.toDate(attempt.attemptDate);
      if (Number.isNaN(attemptDate.getTime()) || attemptDate < cutoff) {
        return;
      }
      if (!attempt.memoryItemId || !attempt.questionAsked) {
        return;
      }
      const set = answeredQuestionsByItem.get(attempt.memoryItemId) || new Set<string>();
      set.add(attempt.questionAsked.trim());
      answeredQuestionsByItem.set(attempt.memoryItemId, set);
    });

    const completed = new Set<string>();
    items.forEach(item => {
      const questions = item.questions && item.questions.length > 0
        ? item.questions.map(question => question.trim())
        : ['Who or what is this memory about?'];
      const answered = answeredQuestionsByItem.get(item.id) || new Set<string>();
      if (questions.every(question => answered.has(question))) {
        completed.add(item.id);
      }
    });
    return completed;
  }

  private calculateAccuracyTrend(attempts: QuizAttempt[]): { trend: 'up' | 'down' | 'stable'; delta: number } {
    const today = new Date();
    const recentCutoff = new Date(today);
    recentCutoff.setDate(today.getDate() - 7);
    const previousCutoff = new Date(today);
    previousCutoff.setDate(today.getDate() - 14);

    const recent = attempts.filter(attempt => {
      const date = this.toDate(attempt.attemptDate);
      return date >= recentCutoff;
    });
    const previous = attempts.filter(attempt => {
      const date = this.toDate(attempt.attemptDate);
      return date >= previousCutoff && date < recentCutoff;
    });

    const recentAccuracy = this.computeAccuracy(recent);
    const previousAccuracy = this.computeAccuracy(previous);
    const delta = recentAccuracy - previousAccuracy;

    if (previous.length === 0 || Math.abs(delta) < 5) {
      return { trend: 'stable', delta: Math.round(delta) };
    }
    return delta > 0
      ? { trend: 'up', delta: Math.round(delta) }
      : { trend: 'down', delta: Math.round(delta) };
  }

  private computeAccuracy(attempts: QuizAttempt[]): number {
    const valid = attempts.filter(attempt => (attempt.patientAnswer || '').trim().length > 0);
    if (valid.length === 0) {
      return 0;
    }
    const correct = valid.filter(attempt => attempt.isCorrect === true).length;
    return (correct / valid.length) * 100;
  }

  private buildDailySeries(attempts: QuizAttempt[], days: number): MemoryAttemptPoint[] {
    const series: MemoryAttemptPoint[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const day = new Date();
      day.setDate(day.getDate() - i);
      const dayKey = this.toDateKey(day);
      const dayAttempts = attempts.filter(attempt => this.toDateKey(this.toDate(attempt.attemptDate)) === dayKey);
      const correct = dayAttempts.filter(attempt => attempt.isCorrect === true).length;
      const accuracy = dayAttempts.length > 0 ? Math.round((correct / dayAttempts.length) * 100) : 0;
      series.push({
        label: day.toLocaleDateString('en-US', { weekday: 'short' }),
        attempts: dayAttempts.length,
        correct,
        accuracy
      });
    }
    return series;
  }

  getTrendLabel(): string {
    if (this.analytics.trend === 'up') {
      return `↑ Improving (${this.analytics.trendDelta}%)`;
    }
    if (this.analytics.trend === 'down') {
      return `↓ Declining (${Math.abs(this.analytics.trendDelta)}%)`;
    }
    return '→ Stable';
  }

  getTrendClass(): string {
    if (this.analytics.trend === 'up') return 'text-emerald-600';
    if (this.analytics.trend === 'down') return 'text-rose-600';
    return 'text-slate-600';
  }

  getAttemptStatus(attempt: QuizAttempt): string {
    if ((attempt.patientAnswer || '').trim().length === 0) return 'Pending';
    return attempt.isCorrect ? 'Correct' : 'Incorrect';
  }

  getAttemptStatusClass(attempt: QuizAttempt): string {
    if ((attempt.patientAnswer || '').trim().length === 0) return 'bg-amber-100 text-amber-700';
    return attempt.isCorrect ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700';
  }

  formatAttemptDate(date: string): string {
    const parsed = this.toDate(date);
    if (Number.isNaN(parsed.getTime())) {
      return date;
    }
    return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  private toDate(date: string): Date {
    return new Date(`${date}T00:00:00`);
  }

  private toDateKey(date: Date): string {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private emptyAnalytics(): MemoryWalletAnalyticsSummary {
    return {
      totalAttempts: 0,
      answeredAttempts: 0,
      correctAnswers: 0,
      accuracyPercent: 0,
      avgResponseSeconds: 0,
      totalItems: 0,
      completedItems: 0,
      pendingItems: 0,
      completionRate: 0,
      trend: 'stable',
      trendDelta: 0,
      recentAttempts: [],
      dailySeries: []
    };
  }

  private resolvePatientNames(items: MemoryItem[]): void {
    const uniqueIds = Array.from(new Set(items.map(item => item.patientId)));
    uniqueIds.forEach(id => {
      if (this.patientNames[id]) return;
      this.apiService.getPatientByKeycloakId(id).subscribe({
        next: (profile) => {
          const name = `${profile.firstName} ${profile.lastName}`.trim();
          this.patientNames[id] = name || id;
          this.recomputeAnalytics();
        },
        error: () => {
          this.patientNames[id] = `Patient ${id.slice(0, 8)}…`;
          this.recomputeAnalytics();
        }
      });
    });
  }
}
