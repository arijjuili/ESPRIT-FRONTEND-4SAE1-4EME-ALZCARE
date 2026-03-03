import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { RouterModule } from '@angular/router';
import { ApiService } from '../../../../core/services/api.service';
import { AuthService } from '../../../../core/services/auth.service';
import { PatientService } from '../../../../core/services/patient.service';
import { SpeechCommandService, SpeechDebugEvent } from '../../../../core/services/speech-command.service';
import { DifficultyLevel, GameActivity, GameActivityCreateRequest } from '../../../../core/models/api.model';
import { LucideIconComponent } from '../../../../shared/components/lucide-icon/lucide-icon.component';
import { GameSplashComponent } from '../../../../shared/components/game-splash/game-splash.component';
import { GameGuidelinesComponent, GuidelineStep } from '../../../../shared/components/game-guidelines/game-guidelines.component';

@Component({
  selector: 'app-attention-task',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideIconComponent, GameSplashComponent, GameGuidelinesComponent],
  templateUrl: './attention-task.component.html',
  styleUrls: ['./attention-task.component.scss']
})
export class AttentionTaskComponent implements OnInit, OnDestroy {
  showSplash = true;
  showGuidelines = false;

  status: 'idle' | 'waiting' | 'go' | 'done' | 'false-start' = 'idle';
  reactionMs: number | null = null;
  bestMs: number | null = null;
  newBadge: { title: string; description: string; icon: string } | null = null;
  currentDifficulty: DifficultyLevel = 'EASY';
  adaptiveMode = true;
  adaptiveFeedback = 'Difficulty will adapt as you play.';
  voiceSupported = false;
  voiceEnabled = false;
  voiceListening = false;
  voiceFeedback = '';
  totalRounds = 0;
  successfulRounds = 0;
  falseStarts = 0;
  difficultyAdjustments = 0;
  voiceCommandCount = 0;
  hintLevel = 0;
  timeMultiplier = 1;
  cueMode = 'none';
  breakSuggestion = false;
  adaptationReason = '';
  showVoiceDebug = false;
  showVoiceDebugToggle = false;
  voiceDebugLogs: string[] = [];
  lastHeardPhrase = '';
  private suppressVoiceToggleClick = false;
  private holdStartedAt = 0;
  private timerId: number | null = null;
  private startTime = 0;
  private goStartEpochMs = 0;
  private pendingVoiceReactionMs: number | null = null;
  private reactionHistory: number[] = [];
  private audioContext: AudioContext | null = null;

  guidelineSteps: GuidelineStep[] = [
    { title: 'Wait for Green', description: 'Wait for the screen to turn green. Do not click before!', icon: '⏳' },
    { title: 'React Fast', description: 'Click or tap as quickly as possible when you see green.', icon: '⚡' },
    { title: 'Voice Commands', description: 'You can also say "push" or "start" to interact with voice.', icon: '🎤' }
  ];

  constructor(
    private apiService: ApiService,
    private authService: AuthService,
    private patientService: PatientService,
    private route: ActivatedRoute,
    private speechCommandService: SpeechCommandService
  ) {
    this.loadBestFromDb();
  }

  ngOnInit(): void {
    this.voiceSupported = this.speechCommandService.isSupported();
    const requested = (this.route.snapshot.queryParamMap.get('difficulty') || '').toUpperCase();
    if (requested === 'EASY' || requested === 'MEDIUM' || requested === 'HARD') {
      this.currentDifficulty = requested;
      this.adaptiveFeedback = `Starting at ${requested} based on recent performance.`;
    }
    this.loadAdaptationProfile();
  }

  onSplashComplete(): void {
    this.showSplash = false;
    this.showGuidelines = true;
  }

  onGuidelinesClose(): void {
    this.showGuidelines = false;
  }

  start(): void {
    this.clearTimer();
    this.status = 'waiting';
    this.reactionMs = null;
    const { min, max } = this.getDelayRange(this.currentDifficulty);
    const delay = min + Math.random() * (max - min);
    this.timerId = window.setTimeout(() => {
      this.status = 'go';
      this.startTime = performance.now();
      this.goStartEpochMs = Date.now();
      this.pendingVoiceReactionMs = null;
      this.playCueIfEnabled();
    }, delay);
  }

  clickTarget(reactionOverrideMs?: number): void {
    if (this.status === 'waiting') {
      this.status = 'false-start';
      this.totalRounds++;
      this.falseStarts++;
      this.applyAdaptiveDifficulty();
      this.clearTimer();
      return;
    }
    if (this.status !== 'go') return;
    const measured = reactionOverrideMs ?? (performance.now() - this.startTime);
    this.reactionMs = Math.max(0, Math.round(measured));
    this.pendingVoiceReactionMs = null;
    this.totalRounds++;
    this.successfulRounds++;
    this.reactionHistory.push(this.reactionMs);
    this.status = 'done';
    this.applyAdaptiveDifficulty();
    this.recordCompletion();
    this.recordToDb();
    this.awardBadge();
  }

  ngOnDestroy(): void {
    this.clearTimer();
    this.speechCommandService.stopListening();
  }

  closeBadge(): void {
    this.newBadge = null;
  }

  private clearTimer(): void {
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  private loadBestFromDb(): void {
    const userId = this.authService.getCurrentUser()?.id;
    if (!userId) return;
    this.apiService.getGameActivities(userId).subscribe({
      next: (activities: GameActivity[]) => {
        this.bestMs = this.computeBest(activities);
      },
      error: () => {}
    });
  }

  private recordToDb(): void {
    const userId = this.authService.getCurrentUser()?.id;
    if (!userId || this.reactionMs === null) return;
    const roundScore = this.computeRoundScore(this.reactionMs, this.currentDifficulty);
    const payload: GameActivityCreateRequest = {
      patientId: userId,
      gameType: 'ATTENTION_TASK',
      difficulty: this.currentDifficulty,
      targetDomain: 'attention',
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      durationSeconds: this.reactionMs,
      score: roundScore,
      maxScore: 100,
      voiceUsed: this.voiceCommandCount > 0,
      mistakesMade: this.falseStarts,
      pointsEarned: roundScore,
      adaptiveMode: this.adaptiveMode,
      difficultyAdjustments: this.difficultyAdjustments,
      voiceCommandCount: this.voiceCommandCount,
      accuracyPercent: this.getAccuracyPercent()
    };
    this.apiService.createGameActivity(payload).subscribe({
      next: () => {
        this.loadBestFromDb();
        this.loadAdaptationProfile();
      },
      error: () => {}
    });
  }

  private computeBest(activities: GameActivity[]): number | null {
    const times = activities
      .filter(activity => activity.gameType === 'ATTENTION_TASK' && activity.durationSeconds)
      .map(activity => activity.durationSeconds ?? null)
      .filter((value): value is number => value !== null);
    if (times.length === 0) return null;
    return Math.min(...times);
  }

  private computeRoundScore(reaction: number, difficulty: DifficultyLevel): number {
    const target = difficulty === 'HARD' ? 450 : difficulty === 'MEDIUM' ? 600 : 750;
    const raw = 100 - Math.max(0, reaction - target) / 4;
    return Math.max(0, Math.min(100, Math.round(raw)));
  }

  getAccuracyPercent(): number {
    if (this.totalRounds === 0) return 0;
    return Math.round((this.successfulRounds / this.totalRounds) * 10000) / 100;
  }

  private applyAdaptiveDifficulty(): void {
    if (!this.adaptiveMode || this.totalRounds < 2) return;

    const previous = this.currentDifficulty;
    const averageReaction = this.reactionHistory.length
      ? this.reactionHistory.reduce((sum, value) => sum + value, 0) / this.reactionHistory.length
      : null;
    const falseStartRate = this.totalRounds > 0 ? this.falseStarts / this.totalRounds : 0;
    const recentFast = this.reactionHistory.slice(-3).every(value => value <= 500);
    const recentSlow = this.reactionHistory.slice(-3).every(value => value >= 900);

    if (falseStartRate >= 0.35 || recentSlow || (averageReaction !== null && averageReaction >= 850)) {
      this.currentDifficulty = this.lowerDifficulty(this.currentDifficulty);
    } else if (recentFast || (averageReaction !== null && averageReaction <= 540 && falseStartRate < 0.2)) {
      this.currentDifficulty = this.raiseDifficulty(this.currentDifficulty);
    }

    if (this.currentDifficulty !== previous) {
      this.difficultyAdjustments++;
      this.adaptiveFeedback = `Difficulty adjusted ${previous} → ${this.currentDifficulty} based on live performance.`;
    } else {
      this.adaptiveFeedback = `Difficulty remains ${this.currentDifficulty}. Keep going.`;
    }
  }

  private getDelayRange(difficulty: DifficultyLevel): { min: number; max: number } {
    const multiplier = Math.max(1, this.timeMultiplier);
    if (difficulty === 'HARD') return { min: Math.round(700 * multiplier), max: Math.round(1500 * multiplier) };
    if (difficulty === 'MEDIUM') return { min: Math.round(900 * multiplier), max: Math.round(1800 * multiplier) };
    return { min: Math.round(1200 * multiplier), max: Math.round(2800 * multiplier) };
  }

  private raiseDifficulty(current: DifficultyLevel): DifficultyLevel {
    if (current === 'EASY') return 'MEDIUM';
    if (current === 'MEDIUM') return 'HARD';
    return 'HARD';
  }

  private loadAdaptationProfile(): void {
    const userId = this.authService.getCurrentUser()?.id;
    if (!userId) return;
    this.apiService.getGameAdaptation(userId, 'ATTENTION_TASK').subscribe({
      next: (profile) => {
        this.currentDifficulty = profile.recommendedDifficulty || this.currentDifficulty;
        this.adaptiveMode = !!profile.assistedMode;
        this.hintLevel = profile.hintLevel || 0;
        this.timeMultiplier = Math.max(1, profile.timeMultiplier || 1);
        this.cueMode = profile.cueMode || 'none';
        this.breakSuggestion = !!profile.breakSuggestion;
        if (this.breakSuggestion) {
          this.voiceFeedback = 'You may take a short break before the next round.';
        }
        this.adaptationReason = profile.reason || '';
        this.adaptiveFeedback = profile.reason
          ? `Adaptive profile: ${profile.reason}`
          : this.adaptiveFeedback;
      },
      error: () => {}
    });
  }

  getCueModeLabel(): string {
    if (this.cueMode === 'visual_audio') return 'Visual + Audio Cues';
    if (this.cueMode === 'visual') return 'Visual Cues';
    if (this.cueMode === 'audio') return 'Audio Cues';
    return 'No Extra Cues';
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
      oscillator.type = 'sine';
      oscillator.frequency.value = 880;
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

  private lowerDifficulty(current: DifficultyLevel): DifficultyLevel {
    if (current === 'HARD') return 'MEDIUM';
    if (current === 'MEDIUM') return 'EASY';
    return 'EASY';
  }

  toggleAdaptiveMode(): void {
    this.adaptiveMode = !this.adaptiveMode;
    this.adaptiveFeedback = this.adaptiveMode
      ? 'Adaptive mode enabled.'
      : 'Adaptive mode disabled. Difficulty will stay fixed.';
  }

  toggleVoiceCommands(): void {
    // Kept for backward compatibility; UI now uses push-to-talk only.
    this.toggleVoiceEnabled();
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
    const started = this.speechCommandService.startListening(
      (command) => this.handleVoiceCommand(command),
      () => {},
      (event) => this.onVoiceDebug(event),
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

  private handleVoiceCommand(command: string): void {
    this.voiceCommandCount++;
    this.lastHeardPhrase = command;
    if (this.status === 'go' && this.goStartEpochMs > 0) {
      this.pendingVoiceReactionMs = Math.max(0, Date.now() - this.goStartEpochMs);
    }
    if (this.hasIntent(command, ['stop', 'cancel', 'quiet'])) {
      this.pushVoiceLog(`INTENT: stop/cancel ignored from "${command}"`);
      this.voiceFeedback = 'Okay, try again when you are ready.';
      return;
    }
    if (this.hasIntent(command, ['restart', 'retry', 'again', 'reset', 're start', 'replay', 'start again'])) {
      this.start();
      this.voiceFeedback = 'Round restarted.';
      this.pushVoiceLog(`INTENT: restart matched from "${command}"`);
      return;
    }
    if (this.hasIntent(command, ['start', 'star', 'stark', 'begin', 'play', 'go'])) {
      this.start();
      this.voiceFeedback = 'Round started.';
      this.pushVoiceLog(`INTENT: start matched from "${command}"`);
      return;
    }
    if (this.hasIntent(command, ['push', 'yes', 'yeah', 'yep', 'press', 'touch', 'click', 'bush', 'pushed'])) {
      const voiceMs = this.pendingVoiceReactionMs;
      this.clickTarget(voiceMs === null ? undefined : voiceMs);
      this.voiceFeedback = 'Great, action triggered.';
      this.pushVoiceLog(`INTENT: push matched from "${command}"`);
      return;
    }
    if (command.includes('adaptive on')) {
      this.adaptiveMode = true;
      this.voiceFeedback = 'Adaptive mode enabled.';
      return;
    }
    if (command.includes('adaptive off')) {
      this.adaptiveMode = false;
      this.voiceFeedback = 'Adaptive mode disabled.';
      return;
    }
    if (command.includes('close badge')) {
      this.closeBadge();
      this.voiceFeedback = 'Badge dialog closed.';
      this.pushVoiceLog(`INTENT: close badge matched from "${command}"`);
      return;
    }
    this.pushVoiceLog(`INTENT: no match for "${command}"`);
    this.voiceFeedback = 'I could not catch that clearly. Please repeat.';
  }

  clearVoiceLogs(): void {
    this.voiceDebugLogs = [];
  }

  private onVoiceDebug(event: SpeechDebugEvent): void {
    if (event.type === 'speechstart' && this.status === 'go' && this.goStartEpochMs > 0) {
      const delta = Date.now() - this.goStartEpochMs;
      this.pendingVoiceReactionMs = Math.max(0, delta);
    }
    const time = new Date(event.at).toLocaleTimeString();
    this.pushVoiceLog(`${time} [${event.type}] ${event.message}`);
  }

  private pushVoiceLog(line: string): void {
    this.voiceDebugLogs = [line, ...this.voiceDebugLogs].slice(0, 40);
  }

  private hasIntent(command: string, intents: string[]): boolean {
    const normalized = this.normalizeSpeech(command);
    const tokens = normalized.split(' ').filter(Boolean);

    for (const intent of intents) {
      const target = this.normalizeSpeech(intent);
      if (normalized.includes(target)) return true;

      const targetTokens = target.split(' ').filter(Boolean);
      if (targetTokens.length > 1) {
        const joined = tokens.join(' ');
        if (joined.includes(target)) return true;
      }

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
    if ((input.startsWith(target) || target.startsWith(input)) && lenDiff <= 1) {
      return true;
    }
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
  }

  private awardBadge(): void {
    const badges = this.readList('alzcare_game_badges');
    if (!badges.includes('attention-task')) {
      badges.push('attention-task');
      localStorage.setItem('alzcare_game_badges', JSON.stringify(badges));
      localStorage.setItem('alzcare_latest_badge', JSON.stringify({
        id: 'attention-task',
        title: 'Lightning Focus',
        description: 'Completed Attention Task.',
        icon: '⚡'
      }));
      this.newBadge = { title: 'Lightning Focus', description: 'Completed Attention Task.', icon: '⚡' };
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
}
