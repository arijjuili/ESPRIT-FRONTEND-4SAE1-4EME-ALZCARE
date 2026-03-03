import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ApiService } from '../../../../core/services/api.service';
import { AuthService } from '../../../../core/services/auth.service';
import { DifficultyLevel, GameActivityCreateRequest } from '../../../../core/models/api.model';
import { SpeechCommandService } from '../../../../core/services/speech-command.service';
import { LucideIconComponent } from '../../../../shared/components/lucide-icon/lucide-icon.component';
import { GameSplashComponent } from '../../../../shared/components/game-splash/game-splash.component';
import { GameGuidelinesComponent, GuidelineStep } from '../../../../shared/components/game-guidelines/game-guidelines.component';

@Component({
  selector: 'app-word-recall',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, LucideIconComponent, GameSplashComponent, GameGuidelinesComponent],
  templateUrl: './word-recall.component.html',
  styleUrls: ['./word-recall.component.scss']
})
export class WordRecallComponent implements OnDestroy, OnInit {
  showSplash = true;
  showGuidelines = false;

  private wordBank = [
    'garden', 'ocean', 'guitar', 'sunshine', 'mountain', 'cookie', 'lantern', 'butterfly',
    'library', 'window', 'picnic', 'puzzle', 'camera', 'rainbow', 'forest', 'lighthouse'
  ];

  visibleWords: string[] = [];
  roundWords: string[] = [];
  guesses: string[] = [];
  input = '';
  showWords = false;
  resultMessage = '';
  started = false;
  showAnswers = false;
  voiceSupported = false;
  voiceEnabled = false;
  voiceListening = false;
  voiceFeedback = '';
  newBadge: { title: string; description: string; icon: string } | null = null;
  colors = ['bg-emerald-200 text-emerald-800', 'bg-lime-200 text-lime-800', 'bg-yellow-200 text-yellow-800', 'bg-amber-200 text-amber-800', 'bg-teal-200 text-teal-800', 'bg-green-200 text-green-800'];

  guidelineSteps: GuidelineStep[] = [
    { title: 'Memorize Words', description: 'Six words will appear on screen for 6 seconds. Memorize as many as you can!', icon: '🧠' },
    { title: 'Recall & Type', description: 'After the words disappear, type the words you remember.', icon: '⌨️' },
    { title: 'Use Voice', description: 'You can also use voice commands! Hold the mic button and speak.', icon: '🎤' }
  ];

  private suppressVoiceToggleClick = false;
  private holdStartedAt = 0;
  currentDifficulty: DifficultyLevel = 'EASY';
  assistedMode = false;
  hintLevel = 0;
  timeMultiplier = 1;
  cueMode = 'none';
  breakSuggestion = false;
  adaptationReason = '';
  private audioContext: AudioContext | null = null;

  constructor(
    private speechCommandService: SpeechCommandService,
    private apiService: ApiService,
    private authService: AuthService
  ) {
    this.voiceSupported = this.speechCommandService.isSupported();
  }

  ngOnInit(): void {
    this.loadAdaptationProfile();
  }

  onSplashComplete(): void {
    this.showSplash = false;
    this.showGuidelines = true;
  }

  onGuidelinesClose(): void {
    this.showGuidelines = false;
  }

  ngOnDestroy(): void {
    this.speechCommandService.stopListening();
  }

  startRound(): void {
    this.started = true;
    this.resultMessage = '';
    this.guesses = [];
    this.showAnswers = false;
    const wordsToShow = this.currentDifficulty === 'HARD' ? 8 : this.currentDifficulty === 'MEDIUM' ? 6 : 4;
    this.roundWords = this.pickWords(wordsToShow);
    this.visibleWords = [...this.roundWords];
    this.showWords = true;

    setTimeout(() => {
      this.showWords = false;
      this.visibleWords = [];
      this.playCueIfEnabled();
    }, Math.round(6000 * Math.max(1, this.timeMultiplier)));
  }

  addGuess(): void {
    if (this.showAnswers) return;
    const value = this.input.trim().toLowerCase();
    if (!value) return;
    if (!this.guesses.includes(value)) {
      this.guesses.push(value);
    }
    this.input = '';
  }

  checkAnswers(): void {
    const target = this.roundWords.map(word => word.toLowerCase());
    const correct = this.guesses.filter(word => target.includes(word));
    this.resultMessage = `You recalled ${correct.length} / ${this.roundWords.length} words.`;
    this.showAnswers = true;
    this.recordCompletion();
    this.awardBadge();
  }

  removeGuess(index: number): void {
    if (this.showAnswers) return;
    this.guesses.splice(index, 1);
  }

  getRecallHints(): string[] {
    if (this.hintLevel <= 0 || this.roundWords.length === 0) return [];
    const hintCount = this.hintLevel >= 3 ? 3 : this.hintLevel === 2 ? 2 : 1;
    return this.roundWords.slice(0, hintCount).map((word, idx) => {
      const first = (word[0] || '').toUpperCase();
      if (this.hintLevel >= 3) {
        const mask = '_'.repeat(Math.max(2, word.length - 1));
        return `${idx + 1}. ${first}${mask}`;
      }
      return `${idx + 1}. ${first}...`;
    });
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
    const heldFor = Date.now() - this.holdStartedAt;
    if (heldFor > 120) {
      this.suppressVoiceToggleClick = true;
    }
    this.endPushToTalk();
  }

  startPushToTalk(): void {
    if (!this.voiceSupported || !this.voiceEnabled || this.voiceListening) return;
    if (!this.canUseVoiceInput()) {
      this.voiceFeedback = 'Voice input is available after word reveal ends.';
      return;
    }
    const started = this.speechCommandService.startListening(
      (command) => this.handleVoiceCommand(command),
      () => {},
      undefined,
      {
        continuous: false,
        interimResults: true,
        maxAlternatives: 1
      }
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
    this.voiceFeedback = 'Voice commands: ON';
  }

  canUseVoiceInput(): boolean {
    return this.started && !this.showWords && !this.showAnswers && this.roundWords.length > 0;
  }

  private handleVoiceCommand(command: string): void {
    if (this.hasIntent(command, ['restart', 'retry', 'again', 'new', 'new round', 'reset', 'start'])) {
      this.startRound();
      this.voiceFeedback = 'New round started.';
      return;
    }
    if (this.hasIntent(command, ['check', 'submit', 'finish', 'done'])) {
      this.checkAnswers();
      this.voiceFeedback = 'Answers checked.';
      return;
    }
    if (this.hasIntent(command, ['clear', 'remove all'])) {
      if (!this.showAnswers) {
        this.guesses = [];
      }
      this.voiceFeedback = 'Your list has been cleared.';
      return;
    }

    const normalized = this.normalizeSpeech(command);
    if (!this.showAnswers && normalized.startsWith('add ')) {
      const candidate = normalized.replace(/^add\s+/, '');
      const result = this.addVoiceGuess(candidate);
      this.voiceFeedback = result;
      return;
    }

    if (!this.showAnswers && normalized.includes(' ')) {
      const words = normalized.split(' ').filter(word => word.length > 1);
      const responses = words.map(word => this.addVoiceGuess(word));
      const lastUseful = [...responses].reverse().find(line => line.includes('word added') || line.includes('updated to') || line.includes('already captured'));
      this.voiceFeedback = lastUseful || '';
      return;
    }

    if (!this.showAnswers && /^[a-z]+$/.test(normalized) && normalized.length > 1) {
      const result = this.addVoiceGuess(normalized);
      this.voiceFeedback = result;
      return;
    }

    if (this.hasIntent(command, ['push', 'yes', 'press', 'touch', 'click', 'bush', 'pushed'])) {
      if (!this.started || this.showAnswers) {
        this.startRound();
        this.voiceFeedback = 'New round started.';
      } else {
        this.checkAnswers();
        this.voiceFeedback = 'Answers checked.';
      }
      return;
    }

    this.voiceFeedback = 'I could not catch that word clearly. Please repeat.';
  }

  private addVoiceGuess(rawWord: string): string {
    if (this.showAnswers) return 'Answers are already shown.';
    const normalized = this.normalizeSpeech(rawWord).split(' ')[0] || '';
    if (!normalized || normalized.length < 2) return '';

    const candidate = this.resolveVoiceWord(normalized);
    const existingIndex = this.guesses.findIndex(guess => this.isSameWordIntent(guess, candidate));

    if (existingIndex >= 0) {
      const existing = this.guesses[existingIndex];
      if (candidate.length > existing.length && this.isLikelyRefinement(existing, candidate)) {
        this.guesses[existingIndex] = candidate;
        return `Updated to "${candidate}".`;
      }
      return `Already captured as "${existing}".`;
    }

    this.guesses.push(candidate);
    return `Added "${candidate}".`;
  }

  private resolveVoiceWord(word: string): string {
    const pool = (this.roundWords.length ? this.roundWords : this.wordBank).map(item => item.toLowerCase());
    if (pool.includes(word)) return word;

    if (this.roundWords.length > 0) {
      const closest = this.findClosestWord(word, this.roundWords.map(item => item.toLowerCase()));
      if (closest.word) {
        const strongEnough = closest.distance <= 3 || closest.prefix >= 2 || closest.score <= 2.7;
        if (strongEnough) return closest.word;
      }
    }

    if (word.length >= 3) {
      const prefixMatches = pool.filter(candidate => candidate.startsWith(word));
      if (prefixMatches.length === 1) return prefixMatches[0];
      if (prefixMatches.length > 1) {
        return prefixMatches.sort((a, b) => a.length - b.length)[0];
      }
    }

    let best = '';
    let bestScore = Number.POSITIVE_INFINITY;

    for (const candidate of pool) {
      const distance = this.levenshtein(word, candidate);
      const prefixLen = this.commonPrefixLength(word, candidate);
      const starts = candidate.startsWith(word) && word.length >= 3 && (candidate.length - word.length) <= 6;
      const nearPrefix = prefixLen >= 3 && Math.abs(candidate.length - word.length) <= 6;
      const close = distance <= 2 && word[0] === candidate[0];
      if (!starts && !nearPrefix && !close) continue;

      const score = distance - Math.min(prefixLen, 4) * 0.35 + Math.abs(candidate.length - word.length) * 0.08;
      if (score < bestScore) {
        best = candidate;
        bestScore = score;
      }
    }

    return best || word;
  }

  private isSameWordIntent(a: string, b: string): boolean {
    const left = a.toLowerCase();
    const right = b.toLowerCase();
    const canonicalLeft = this.roundWords.length > 0 ? this.resolveVoiceWord(left) : left;
    const canonicalRight = this.roundWords.length > 0 ? this.resolveVoiceWord(right) : right;
    if (canonicalLeft === canonicalRight) return true;
    if (left === right) return true;
    if (left.length >= 4 && right.length >= 4 && (left.startsWith(right) || right.startsWith(left))) return true;
    if (this.commonPrefixLength(left, right) >= 3 && Math.abs(left.length - right.length) <= 6) return true;
    return left[0] === right[0] && this.levenshtein(left, right) <= 2;
  }

  private isLikelyRefinement(existing: string, candidate: string): boolean {
    const left = existing.toLowerCase();
    const right = candidate.toLowerCase();
    return right.startsWith(left)
      || this.commonPrefixLength(left, right) >= 3
      || this.levenshtein(left, right) <= 2;
  }

  private commonPrefixLength(a: string, b: string): number {
    const max = Math.min(a.length, b.length);
    let i = 0;
    while (i < max && a[i] === b[i]) i++;
    return i;
  }

  private findClosestWord(input: string, pool: string[]): { word: string; score: number; distance: number; prefix: number } {
    let bestWord = '';
    let bestScore = Number.POSITIVE_INFINITY;
    let bestDistance = Number.POSITIVE_INFINITY;
    let bestPrefix = 0;

    for (const candidate of pool) {
      const distance = this.levenshtein(input, candidate);
      const prefix = this.commonPrefixLength(input, candidate);
      const firstLetterPenalty = input[0] === candidate[0] ? 0 : 1.1;
      const score = distance - Math.min(prefix, 4) * 0.35 + Math.abs(candidate.length - input.length) * 0.08 + firstLetterPenalty;

      if (score < bestScore) {
        bestWord = candidate;
        bestScore = score;
        bestDistance = distance;
        bestPrefix = prefix;
      }
    }

    return { word: bestWord, score: bestScore, distance: bestDistance, prefix: bestPrefix };
  }

  closeBadge(): void {
    this.newBadge = null;
  }

  private pickWords(count: number): string[] {
    const copy = [...this.wordBank];
    const picked: string[] = [];
    while (picked.length < count && copy.length > 0) {
      const index = Math.floor(Math.random() * copy.length);
      picked.push(copy.splice(index, 1)[0]);
    }
    return picked;
  }

  private hasIntent(command: string, intents: string[]): boolean {
    const normalized = this.normalizeSpeech(command);
    const tokens = normalized.split(' ').filter(Boolean);

    for (const intent of intents) {
      const target = this.normalizeSpeech(intent);
      if (normalized.includes(target)) return true;
      for (const token of tokens) {
        if (this.isClose(token, target)) return true;
      }
    }
    return false;
  }

  private normalizeSpeech(value: string): string {
    return value.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  private isClose(input: string, target: string): boolean {
    if (!input || !target) return false;
    if (input === target) return true;
    const lenDiff = Math.abs(input.length - target.length);
    if (lenDiff > 1) return false;
    if (input[0] !== target[0]) return false;
    const distance = this.levenshtein(input, target);
    return distance <= 1;
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

  private recordCompletion(): void {
    const today = new Date().toISOString().split('T')[0];
    const sessions = this.readList('alzcare_game_sessions');
    sessions.push(today);
    localStorage.setItem('alzcare_game_sessions', JSON.stringify(sessions));
    this.checkDailyFocusBadge(sessions, today);
    this.recordToDb();
  }

  private recordToDb(): void {
    const userId = this.authService.getCurrentUser()?.id;
    if (!userId) return;
    const target = this.roundWords.map(word => word.toLowerCase());
    const correct = this.guesses.filter(word => target.includes(word));
    const score = this.roundWords.length > 0 ? Math.round((correct.length / this.roundWords.length) * 100) : 0;
    const payload: GameActivityCreateRequest = {
      patientId: userId,
      gameType: 'WORD_RECALL',
      difficulty: this.currentDifficulty,
      targetDomain: 'memory',
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      durationSeconds: 0,
      score,
      maxScore: 100,
      voiceUsed: false,
      mistakesMade: this.guesses.length - correct.length,
      pointsEarned: score,
      adaptiveMode: this.assistedMode,
      difficultyAdjustments: 0,
      voiceCommandCount: 0,
      hintsUsed: this.hintLevel,
      accuracyPercent: score
    };
    this.apiService.createGameActivity(payload).subscribe({
      next: () => this.loadAdaptationProfile(),
      error: () => {}
    });
  }

  private awardBadge(): void {
    const badges = this.readList('alzcare_game_badges');
    if (!badges.includes('word-recall')) {
      badges.push('word-recall');
      localStorage.setItem('alzcare_game_badges', JSON.stringify(badges));
      localStorage.setItem('alzcare_latest_badge', JSON.stringify({
        id: 'word-recall',
        title: 'Word Wizard',
        description: 'Completed a word recall round.',
        icon: '📝'
      }));
      this.newBadge = { title: 'Word Wizard', description: 'Completed a word recall round.', icon: '📝' };
    }
  }

  private readList(key: string): string[] {
    try {
      const raw = localStorage.getItem(key);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private checkDailyFocusBadge(sessions: string[], today: string): void {
    const todayCount = sessions.filter(date => date === today).length;
    const dailyBadgeKey = `daily-focus-${today}`;
    const awarded = this.readList('alzcare_game_badges').includes(dailyBadgeKey);
    if (todayCount >= 2 && !awarded && !this.newBadge) {
      const badges = this.readList('alzcare_game_badges');
      badges.push(dailyBadgeKey);
      localStorage.setItem('alzcare_game_badges', JSON.stringify(badges));
      localStorage.setItem('alzcare_latest_badge', JSON.stringify({
        id: dailyBadgeKey,
        title: 'Daily Focus',
        description: 'Completed 2 games today.',
        icon: '🎯'
      }));
      this.newBadge = { title: 'Daily Focus', description: 'Completed 2 games today.', icon: '🎯' };
    }
  }

  private loadAdaptationProfile(): void {
    const userId = this.authService.getCurrentUser()?.id;
    if (!userId) return;
    this.apiService.getGameAdaptation(userId, 'WORD_RECALL').subscribe({
      next: (profile) => {
        this.currentDifficulty = profile.recommendedDifficulty || 'EASY';
        this.assistedMode = !!profile.assistedMode;
        this.hintLevel = profile.hintLevel || 0;
        this.timeMultiplier = Math.max(1, profile.timeMultiplier || 1);
        this.cueMode = profile.cueMode || 'none';
        this.breakSuggestion = !!profile.breakSuggestion;
        this.adaptationReason = profile.reason || '';
      },
      error: () => {}
    });
  }

  private playCueIfEnabled(): void {
    if (this.cueMode !== 'visual_audio' && this.cueMode !== 'audio') return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      if (!this.audioContext) {
        this.audioContext = new AudioCtx();
      }
      const ctx = this.audioContext;
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = 'triangle';
      oscillator.frequency.value = 740;
      gain.gain.value = 0.03;
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      const now = ctx.currentTime;
      oscillator.start(now);
      oscillator.stop(now + 0.12);
    } catch {
      // Non-blocking cue fallback.
    }
  }
}
