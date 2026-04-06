import { AfterViewChecked, Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { SpeechCommandService } from '../../../core/services/speech-command.service';
import {
  MemoryConversationCitation,
  MemoryConversationTurn,
  MemoryItem,
  MemoryStoryScene,
  MemoryStorybookResponse,
  QuizAttempt,
  QuizAttemptCreateRequest,
  QuizAttemptAnswerRequest
} from '../../../core/models/api.model';
import { LucideIconComponent } from '../../../shared/components/lucide-icon/lucide-icon.component';

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

interface MemoryChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  provider?: string;
  citations?: MemoryConversationCitation[];
}

@Component({
  selector: 'app-patient-memory-wallet',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideIconComponent],
  templateUrl: './patient-memory-wallet.component.html',
  styleUrls: ['./patient-memory-wallet.component.scss']
})
export class PatientMemoryWalletComponent implements OnInit, OnDestroy, AfterViewChecked {
  private static readonly DEFAULT_QUESTION = 'Who or what is this memory about?';
  @ViewChild('memoryChatScrollArea') memoryChatScrollArea?: ElementRef<HTMLDivElement>;

  allMemoryItems: MemoryItem[] = [];
  memoryItems: MemoryItem[] = [];
  loading = false;
  error = '';
  storybookLoading = false;
  storybookError = '';
  storybook: MemoryStorybookResponse | null = null;
  activeStorySceneIndex = 0;
  ttsSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  speakingStorybook = false;
  private storyTouchStartX: number | null = null;
  private storyUtterance: SpeechSynthesisUtterance | null = null;

  quizState: QuizState | null = null;
  submittingAnswer = false;
  voiceSupported = false;
  voiceEnabled = false;
  voiceListening = false;
  voiceFeedback = '';
  private suppressVoiceToggleClick = false;
  private holdStartedAt = 0;
  private quizAdvanceTimerId: number | null = null;
  voiceDebugLogs: string[] = [];
  showVoiceDebug = false;
  lastHeardPhrase = '';
  memoryChatOpen = true;
  memoryChatSending = false;
  memoryChatInput = '';
  memoryChatMessages: MemoryChatMessage[] = [];
  memoryChatSuggestedPrompts: string[] = [
    'Who is in my family memories?',
    'Tell me about a place that matters to me.',
    'What memory should I revisit today?'
  ];
  private shouldScrollMemoryChatToBottom = false;

  constructor(private apiService: ApiService, private authService: AuthService, private speechCommandService: SpeechCommandService) {
    this.voiceSupported = this.speechCommandService.isSupported();
  }

  ngOnInit(): void {
    this.initializeMemoryConversation();
    this.loadMemoryItems();
  }

  ngOnDestroy(): void {
    this.clearQuizAdvanceTimer();
    this.speechCommandService.stopListening();
    this.stopStorybookNarration();
  }

  ngAfterViewChecked(): void {
    if (!this.shouldScrollMemoryChatToBottom) {
      return;
    }

    const container = this.memoryChatScrollArea?.nativeElement;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
    this.shouldScrollMemoryChatToBottom = false;
  }

  loadMemoryItems(): void {
    const patientId = this.authService.getCurrentUser()?.id;
    if (!patientId) {
      this.error = 'Missing patient profile';
      return;
    }

    this.loading = true;
    this.error = '';
    forkJoin({
      available: this.apiService.getAvailableMemoryItems(patientId)
    }).subscribe({
      next: ({ available }) => {
        this.allMemoryItems = available;
        this.memoryItems = available;
        this.loadStorybook();
        this.loading = false;
      },
      error: (err) => {
        this.error = err.error?.detail || 'Failed to load memory items';
        this.loading = false;
      }
    });
  }

  toggleMemoryChat(): void {
    this.memoryChatOpen = !this.memoryChatOpen;
    if (this.memoryChatOpen) {
      this.queueMemoryChatScroll();
    }
  }

  loadStorybook(): void {
    const patientId = this.authService.getCurrentUser()?.id;
    if (!patientId) {
      this.storybook = null;
      return;
    }

    this.storybookLoading = true;
    this.storybookError = '';
    this.apiService.generateMemoryStorybook({ patientId }).subscribe({
      next: (storybook) => {
        this.storybook = storybook;
        this.activeStorySceneIndex = 0;
        this.storybookLoading = false;
      },
      error: () => {
        this.storybookError = 'Memory Storybook is not available right now.';
        this.storybookLoading = false;
      }
    });
  }

  get hasStorybookScenes(): boolean {
    return !!this.storybook?.scenes?.length;
  }

  get activeStoryScene(): MemoryStoryScene | null {
    if (!this.storybook?.scenes?.length) {
      return null;
    }
    return this.storybook.scenes[this.activeStorySceneIndex] || this.storybook.scenes[0];
  }

  goToStoryScene(index: number): void {
    if (!this.storybook?.scenes?.length) {
      return;
    }
    this.activeStorySceneIndex = Math.max(0, Math.min(index, this.storybook.scenes.length - 1));
  }

  nextStoryScene(): void {
    if (!this.storybook?.scenes?.length) {
      return;
    }
    this.activeStorySceneIndex = (this.activeStorySceneIndex + 1) % this.storybook.scenes.length;
  }

  previousStoryScene(): void {
    if (!this.storybook?.scenes?.length) {
      return;
    }
    this.activeStorySceneIndex = this.activeStorySceneIndex === 0
      ? this.storybook.scenes.length - 1
      : this.activeStorySceneIndex - 1;
  }

  onStoryTouchStart(event: TouchEvent): void {
    this.storyTouchStartX = event.touches[0]?.clientX ?? null;
  }

  onStoryTouchEnd(event: TouchEvent): void {
    if (this.storyTouchStartX === null) {
      return;
    }
    const endX = event.changedTouches[0]?.clientX ?? this.storyTouchStartX;
    const deltaX = endX - this.storyTouchStartX;
    this.storyTouchStartX = null;
    if (Math.abs(deltaX) < 40) {
      return;
    }
    if (deltaX < 0) {
      this.nextStoryScene();
      return;
    }
    this.previousStoryScene();
  }

  toggleStorybookNarration(): void {
    if (this.speakingStorybook) {
      this.stopStorybookNarration();
      return;
    }
    this.startStorybookNarration();
  }

  startStorybookNarration(): void {
    if (!this.storybook || !this.storybook.scenes.length || !this.ttsSupported) {
      return;
    }

    this.stopStorybookNarration();

    const utterance = new SpeechSynthesisUtterance([
      this.storybook.title,
      this.storybook.introduction,
      ...this.storybook.scenes.map(scene => `${scene.headline}. ${scene.storyText}`),
      this.storybook.closingMessage
    ].filter(Boolean).join(' '));

    utterance.rate = 0.92;
    utterance.pitch = 1.02;
    utterance.onend = () => {
      this.speakingStorybook = false;
      this.storyUtterance = null;
    };
    utterance.onerror = () => {
      this.speakingStorybook = false;
      this.storyUtterance = null;
    };

    this.storyUtterance = utterance;
    this.speakingStorybook = true;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }

  stopStorybookNarration(): void {
    if (!this.ttsSupported) {
      return;
    }
    window.speechSynthesis.cancel();
    this.storyUtterance = null;
    this.speakingStorybook = false;
  }

  sendMemoryChatMessage(promptOverride?: string): void {
    const patientId = this.authService.getCurrentUser()?.id;
    const prompt = (promptOverride ?? this.memoryChatInput).trim();
    if (!patientId || !prompt || this.memoryChatSending) {
      return;
    }

    this.memoryChatMessages = [
      ...this.memoryChatMessages,
      this.createMemoryChatMessage('user', prompt)
    ];
    this.queueMemoryChatScroll();
    this.memoryChatInput = '';
    this.memoryChatSending = true;

    this.apiService.askMemoryConversation({
      patientId,
      prompt,
      conversationHistory: this.getMemoryConversationHistory()
    }).subscribe({
      next: (response) => {
        this.memoryChatMessages = [
          ...this.memoryChatMessages,
          this.createMemoryChatMessage('assistant', response.answer, response.provider, response.citedItems)
        ];
        if (response.suggestedPrompts?.length) {
          this.memoryChatSuggestedPrompts = response.suggestedPrompts;
        }
        this.memoryChatSending = false;
        this.queueMemoryChatScroll();
      },
      error: () => {
        this.memoryChatMessages = [
          ...this.memoryChatMessages,
          this.createMemoryChatMessage(
            'assistant',
            'I could not reach Memory Guide right now. Please try again in a moment.',
            'memory-guide'
          )
        ];
        this.memoryChatSending = false;
        this.queueMemoryChatScroll();
      }
    });
  }

  useMemorySuggestedPrompt(prompt: string): void {
    this.sendMemoryChatMessage(prompt);
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
    this.clearQuizAdvanceTimer();
    this.speechCommandService.stopListening();
    this.voiceListening = false;
    this.quizState = null;
    this.submittingAnswer = false;
  }

  selectOption(option: string, source: 'voice' | 'click' = 'click'): void {
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
          this.scheduleQuizAdvance();
        },
        error: () => {
          this.submittingAnswer = false;
        }
      });
    }
  }

  private pushVoiceLog(line: string): void {
    this.voiceDebugLogs = [line, ...this.voiceDebugLogs].slice(0, 40);
  }

  @HostListener('window:keydown', ['$event'])
  onKey(event: KeyboardEvent): void {
    if (!this.canUseVoiceInput()) return;
    switch (event.key) {
      case 'ArrowUp':
      case 'ArrowLeft':
        event.preventDefault();
        this.navigateOption('left');
        break;
      case 'ArrowDown':
      case 'ArrowRight':
        event.preventDefault();
        this.navigateOption('right');
        break;
    }
  }

  private navigateOption(direction: 'left' | 'right'): void {
    if (!this.quizState) return;
    const currentIndex = this.quizState.options.indexOf(this.quizState.selectedOption || '');
    const nextIndex = direction === 'left' ? Math.max(0, currentIndex - 1) : Math.min(this.quizState.options.length - 1, currentIndex + 1);
    if (currentIndex === -1) {
      this.selectOption(this.quizState.options[0]);
    } else {
      this.selectOption(this.quizState.options[nextIndex]);
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

  canUseVoiceInput(): boolean {
    return !!this.quizState && !this.quizState.result;
  }

  toggleVoiceEnabled(): void {
    if (!this.voiceSupported) {
      this.voiceFeedback = 'Voice commands are not supported in this browser.';
      return;
    }
    if (this.voiceEnabled || this.voiceListening) {
      this.speechCommandService.stopListening();
      this.voiceEnabled = false;
      this.voiceListening = false;
      this.voiceFeedback = 'Voice commands: OFF';
      return;
    }
    this.voiceEnabled = true;
    this.voiceFeedback = 'Voice commands: ON';
  }

  onVoiceButtonClick(): void {
    if (this.suppressVoiceToggleClick) {
      this.suppressVoiceToggleClick = false;
      return;
    }
    this.toggleVoiceEnabled();
  }

  onVoiceHoldStart(event?: Event): void {
    if (event) event.preventDefault();
    this.holdStartedAt = Date.now();
    this.startPushToTalk();
  }

  onVoiceHoldEnd(): void {
    const held = Date.now() - this.holdStartedAt;
    if (held > 120) this.suppressVoiceToggleClick = true;
    this.endPushToTalk();
  }

  startPushToTalk(): void {
    if (!this.voiceSupported || !this.voiceEnabled || this.voiceListening) return;
    if (!this.canUseVoiceInput()) {
      this.voiceFeedback = 'Answer options must be visible before using voice.';
      return;
    }
    const started = this.speechCommandService.startListening(
      (command) => this.handleVoiceCommand(command),
      () => {},
      undefined,
      { continuous: false, interimResults: true, maxAlternatives: 1 }
    );
    this.voiceListening = started;
    if (started) {
      this.voiceFeedback = 'Hold and speak...';
    }
  }

  endPushToTalk(): void {
    if (!this.voiceListening) return;
    this.speechCommandService.stopListening();
    this.voiceListening = false;
    this.voiceFeedback = this.voiceEnabled ? 'Voice commands: ON' : 'Voice commands: OFF';
  }

  private handleVoiceCommand(command: string): void {
    if (!this.quizState) return;
    this.lastHeardPhrase = command;
    const normalized = this.normalizeSpeech(command);
    const words = normalized.split(' ').filter(Boolean);
    for (const raw of words) {
      const candidate = this.resolveVoiceWord(raw);
      if (!candidate) continue;
      const match = this.quizState.options.find(option => this.isSameIntent(option, candidate));
      if (match) {
        this.selectOption(match, 'voice');
        this.voiceFeedback = 'Voice answer recorded.';
        this.pushVoiceLog(`Match: "${command}" -> "${match}"`);
        return;
      }
    }
    this.pushVoiceLog(`No match: "${command}"`);
    this.voiceFeedback = 'I could not recognize that answer.';
  }

  private resolveVoiceWord(raw: string): string {
    const pool = this.quizState ? this.quizState.options.map(option => option.toLowerCase()) : [];
    const normalized = raw.toLowerCase();
    if (!normalized) return '';
    const closest = this.findClosestInPool(normalized, pool);
    return closest.word;
  }

  private isSameIntent(a: string, b: string): boolean {
    const left = a.toLowerCase();
    const right = b.toLowerCase();
    if (left === right) return true;
    if (this.commonPrefixLength(left, right) >= 3) return true;
    return this.levenshtein(left, right) <= 2;
  }

  private findClosestInPool(input: string, pool: string[]): { word: string } {
    if (pool.includes(input)) return { word: input };
    let bestWord = input;
    let bestScore = Number.POSITIVE_INFINITY;
    for (const candidate of pool) {
      const distance = this.levenshtein(input, candidate);
      const prefix = this.commonPrefixLength(input, candidate);
      const score = distance - prefix * 0.3;
      if (score < bestScore) {
        bestScore = score;
        bestWord = candidate;
      }
    }
    return { word: bestWord };
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

  private commonPrefixLength(a: string, b: string): number {
    const max = Math.min(a.length, b.length);
    let i = 0;
    while (i < max && a[i] === b[i]) i++;
    return i;
  }

  private levenshtein(a: string, b: string): number {
    const dp: number[][] = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
    for (let i = 0; i <= a.length; i++) dp[i][0] = i;
    for (let j = 0; j <= b.length; j++) dp[0][j] = j;
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,
          dp[i][j - 1] + 1,
          dp[i - 1][j - 1] + cost
        );
      }
    }
    return dp[a.length][b.length];
  }

  private normalizeSpeech(value: string): string {
    return value.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  private scheduleQuizAdvance(): void {
    this.clearQuizAdvanceTimer();
    this.quizAdvanceTimerId = window.setTimeout(() => {
      this.quizAdvanceTimerId = null;
      this.advanceQuizAfterAnswer();
    }, 2200);
  }

  private clearQuizAdvanceTimer(): void {
    if (this.quizAdvanceTimerId !== null) {
      window.clearTimeout(this.quizAdvanceTimerId);
      this.quizAdvanceTimerId = null;
    }
  }


  get emptyStateMessage(): string {
    return 'No memory items available right now. Completed quizzes reappear after 7 days.';
  }

  private initializeMemoryConversation(): void {
    this.memoryChatMessages = [
      this.createMemoryChatMessage(
        'assistant',
        'I am your Memory Guide. Ask me about people, places, or events from your memory wallet, and I will answer only from the memories saved here.',
        'memory-guide'
      )
    ];
    this.queueMemoryChatScroll();
  }

  private createMemoryChatMessage(
    role: 'user' | 'assistant',
    content: string,
    provider?: string,
    citations?: MemoryConversationCitation[]
  ): MemoryChatMessage {
    return {
      id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      role,
      content,
      provider,
      citations
    };
  }

  private getMemoryConversationHistory(): MemoryConversationTurn[] {
    return this.memoryChatMessages
      .filter(message => message.role === 'user' || message.role === 'assistant')
      .slice(-6)
      .map(message => ({
        role: message.role,
        content: message.content
      }));
  }

  private queueMemoryChatScroll(): void {
    this.shouldScrollMemoryChatToBottom = true;
  }
}
