import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { MemoryItem, QuizAttempt, QuizAttemptCreateRequest, QuizAttemptAnswerRequest } from '../../../core/models/api.model';

interface QuizState {
  item: MemoryItem;
  question: string;
  questionIndex: number | null;
  options: string[];
  correctAnswer: string;
  selectedOption?: string;
  result?: 'correct' | 'incorrect';
  attemptId?: string;
  startedAtMs: number;
}

@Component({
  selector: 'app-patient-memory-wallet',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './patient-memory-wallet.component.html',
  styleUrls: ['./patient-memory-wallet.component.scss']
})
export class PatientMemoryWalletComponent implements OnInit {
  private static readonly DEFAULT_QUESTION = 'Who or what is this memory about?';

  allMemoryItems: MemoryItem[] = [];
  memoryItems: MemoryItem[] = [];
  loading = false;
  error = '';

  quizState: QuizState | null = null;
  submittingAnswer = false;

  constructor(private apiService: ApiService, private authService: AuthService) {}

  ngOnInit(): void {
    this.loadMemoryItems();
  }

  loadMemoryItems(): void {
    const patientId = this.authService.getCurrentUser()?.id;
    if (!patientId) {
      this.error = 'Missing patient profile';
      return;
    }

    this.loading = true;
    this.error = '';
    this.apiService.getAvailableMemoryItems(patientId).subscribe({
      next: (items) => {
        this.allMemoryItems = items;
        this.memoryItems = items;
        this.loading = false;
      },
      error: (err) => {
        this.error = err.error?.detail || 'Failed to load memory items';
        this.loading = false;
      }
    });
  }

  openQuiz(item: MemoryItem, questionOverride?: { question: string; index: number | null }): void {
    const questionSelection = questionOverride ?? this.pickQuestion(item);
    const correctAnswer = this.pickCorrectAnswer(item, questionSelection.index);
    const options = this.buildOptions(correctAnswer, item);

    this.quizState = {
      item,
      question: questionSelection.question,
      questionIndex: questionSelection.index,
      options,
      correctAnswer,
      startedAtMs: Date.now()
    };

    const patientId = this.authService.getCurrentUser()?.id;
    if (!patientId) return;

    const attemptRequest: QuizAttemptCreateRequest = {
      patientId,
      memoryItemId: item.id,
      attemptDate: new Date().toISOString().split('T')[0],
      questionAsked: questionSelection.question,
      correctAnswer
    };

    this.apiService.createQuizAttempt(attemptRequest).subscribe({
      next: (attempt) => {
        if (this.quizState && this.quizState.item.id === item.id) {
          this.quizState.attemptId = attempt.id;
        }
      },
      error: () => {
        // keep UI functional even if attempt creation fails
      }
    });
  }

  closeQuiz(): void {
    this.quizState = null;
    this.submittingAnswer = false;
  }

  selectOption(option: string): void {
    if (!this.quizState || this.quizState.result) return;
    this.quizState.selectedOption = option;
    this.quizState.result = option === this.quizState.correctAnswer ? 'correct' : 'incorrect';

    const responseTimeSeconds = Math.max(1, Math.round((Date.now() - this.quizState.startedAtMs) / 1000));
    const attemptId = this.quizState.attemptId;

    if (attemptId) {
      this.submittingAnswer = true;
      const payload: QuizAttemptAnswerRequest = {
        patientAnswer: option,
        responseTimeSeconds,
        attemptDate: new Date().toISOString().split('T')[0]
      };
      this.apiService.submitQuizAnswer(attemptId, payload).subscribe({
        next: () => {
          this.submittingAnswer = false;
          this.advanceQuizAfterAnswer();
        },
        error: () => {
          this.submittingAnswer = false;
        }
      });
    }
  }

  private pickQuestion(item: MemoryItem): { question: string; index: number | null } {
    if (item.questions && item.questions.length > 0) {
      const index = Math.floor(Math.random() * item.questions.length);
      return { question: item.questions[index], index };
    }
    return { question: PatientMemoryWalletComponent.DEFAULT_QUESTION, index: null };
  }

  private pickCorrectAnswer(item: MemoryItem, questionIndex: number | null): string {
    if (
      questionIndex !== null &&
      item.correctAnswers &&
      item.correctAnswers.length > questionIndex &&
      item.correctAnswers[questionIndex]
    ) {
      return item.correctAnswers[questionIndex];
    }
    if (item.persons && item.persons.length > 0) {
      return item.persons[0];
    }
    return item.title;
  }

  private buildOptions(correct: string, item: MemoryItem): string[] {
    const pool: string[] = [];

    if (item.persons) {
      pool.push(...item.persons);
    }

    const sameCategory = this.allMemoryItems.filter(other =>
      other.id !== item.id && other.memoryCategory === item.memoryCategory
    );
    const otherItems = this.allMemoryItems.filter(other => other.id !== item.id);

    const addFromItems = (items: MemoryItem[]) => {
      items.forEach(other => {
        if (other.persons) pool.push(...other.persons);
        if (other.title) pool.push(other.title);
      });
    };

    addFromItems(sameCategory);
    if (pool.length < 3) {
      addFromItems(otherItems);
    }

    const uniquePool = Array.from(new Set(pool)).filter(value => value && value !== correct);
    const options = [correct];

    while (options.length < 4 && uniquePool.length > 0) {
      const pick = this.sample(uniquePool);
      options.push(pick);
      const index = uniquePool.indexOf(pick);
      if (index >= 0) uniquePool.splice(index, 1);
    }

    if (options.length < 2) {
      options.push('I am not sure');
    }

    return this.shuffle(options);
  }

  private advanceQuizAfterAnswer(): void {
    const current = this.quizState?.item;
    if (!current) return;
    this.loadMemoryItems();

    this.apiService.getQuizAttempts(undefined, current.id).subscribe({
      next: (attempts) => {
        const remaining = this.getRemainingQuestions(current, attempts);
        if (remaining.length === 0) {
          this.closeQuiz();
          return;
        }
        const nextQuestion = this.sample(remaining);
        const index = current.questions ? current.questions.indexOf(nextQuestion) : null;
        this.openQuiz(current, {
          question: nextQuestion,
          index: index !== null && index >= 0 ? index : null
        });
      },
      error: () => {
        // if we can't fetch attempts, keep current result state and let user reopen manually
      }
    });
  }

  private getRemainingQuestions(item: MemoryItem, attempts: QuizAttempt[]): string[] {
    const allQuestions = item.questions && item.questions.length > 0
      ? item.questions
      : [PatientMemoryWalletComponent.DEFAULT_QUESTION];

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);

    const answered = new Set<string>();
    attempts.forEach(attempt => {
      if (!attempt.patientAnswer || !attempt.questionAsked) return;
      const attemptDate = new Date(`${attempt.attemptDate}T00:00:00Z`);
      if (Number.isNaN(attemptDate.getTime())) return;
      if (attemptDate < cutoff) return;
      answered.add(attempt.questionAsked.trim());
    });

    return allQuestions.filter(question => !answered.has(question.trim()));
  }

  private sample(values: string[]): string {
    return values[Math.floor(Math.random() * values.length)];
  }

  private shuffle(values: string[]): string[] {
    const copy = [...values];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }


  get emptyStateMessage(): string {
    return 'No memory items available right now. Completed quizzes reappear after 7 days.';
  }
}
