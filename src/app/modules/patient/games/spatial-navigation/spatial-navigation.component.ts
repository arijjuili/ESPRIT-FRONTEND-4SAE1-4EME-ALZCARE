import { Component, HostListener, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ApiService } from '../../../../core/services/api.service';
import { AuthService } from '../../../../core/services/auth.service';
import { GameActivityCreateRequest } from '../../../../core/models/api.model';
import { SpeechCommandService } from '../../../../core/services/speech-command.service';
import { LucideIconComponent } from '../../../../shared/components/lucide-icon/lucide-icon.component';
import { GameSplashComponent } from '../../../../shared/components/game-splash/game-splash.component';
import { GameGuidelinesComponent, GuidelineStep } from '../../../../shared/components/game-guidelines/game-guidelines.component';

interface GridCell {
  x: number;
  y: number;
  type: 'empty' | 'player' | 'target' | 'block';
}

@Component({
  selector: 'app-spatial-navigation',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideIconComponent, GameSplashComponent, GameGuidelinesComponent],
  templateUrl: './spatial-navigation.component.html',
  styleUrls: ['./spatial-navigation.component.scss']
})
export class SpatialNavigationComponent implements OnDestroy {
  showSplash = true;
  showGuidelines = false;

  size = 5;
  player = { x: 0, y: 0 };
  target = { x: 4, y: 4 };
  blocks: { x: number; y: number }[] = [];
  status = 'Navigate the explorer to the glowing star.';
  success = false;
  voiceSupported = false;
  voiceEnabled = false;
  voiceListening = false;
  voiceFeedback = '';
  newBadge: { title: string; description: string; icon: string } | null = null;

  guidelineSteps: GuidelineStep[] = [
    { title: 'Navigate the Grid', description: 'Use arrow keys or buttons to move the explorer through the grid.', icon: '🧭' },
    { title: 'Reach the Star', description: 'Navigate around obstacles to reach the glowing star.', icon: '⭐' },
    { title: 'Voice Commands', description: 'You can also use voice commands like "up", "down", "left", "right".', icon: '🎤' }
  ];

  private suppressVoiceToggleClick = false;
  private holdStartedAt = 0;

  constructor(
    private speechCommandService: SpeechCommandService,
    private apiService: ApiService,
    private authService: AuthService
  ) {
    this.voiceSupported = this.speechCommandService.isSupported();
    this.resetBoard();
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

  resetBoard(): void {
    this.player = { x: 0, y: 0 };
    this.target = { x: 4, y: 4 };
    this.blocks = this.generateSolvableBlocks();
    this.status = 'Navigate the explorer to the glowing star.';
    this.success = false;
  }

  move(dx: number, dy: number): void {
    const next = { x: this.player.x + dx, y: this.player.y + dy };
    if (next.x < 0 || next.y < 0 || next.x >= this.size || next.y >= this.size) return;
    if (this.blocks.some(block => block.x === next.x && block.y === next.y)) return;
    this.player = next;
    if (this.player.x === this.target.x && this.player.y === this.target.y) {
      this.status = 'You made it! Great navigation. Tap “New Map” to play again!';
      this.success = true;
      this.recordCompletion();
      this.awardBadge();
    }
  }

  @HostListener('window:keydown', ['$event'])
  onArrowKey(event: KeyboardEvent): void {
    if (this.success) return;
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.move(0, -1);
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.move(0, 1);
      return;
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      this.move(-1, 0);
      return;
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      this.move(1, 0);
    }
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

  private handleVoiceCommand(command: string): void {
    if (this.hasIntent(command, ['restart', 'retry', 'again', 'new', 'new map', 'reset', 'start'])) {
      this.resetBoard();
      this.voiceFeedback = 'New map ready.';
      return;
    }

    if (this.hasIntent(command, ['up', 'top', 'north'])) {
      this.move(0, -1);
      this.voiceFeedback = 'Moved up.';
      return;
    }
    if (this.hasIntent(command, ['down', 'south'])) {
      this.move(0, 1);
      this.voiceFeedback = 'Moved down.';
      return;
    }
    if (this.hasIntent(command, ['left', 'west'])) {
      this.move(-1, 0);
      this.voiceFeedback = 'Moved left.';
      return;
    }
    if (this.hasIntent(command, ['right', 'write', 'east'])) {
      this.move(1, 0);
      this.voiceFeedback = 'Moved right.';
      return;
    }

    if (this.hasIntent(command, ['push', 'yes', 'press', 'touch', 'click', 'bush', 'pushed'])) {
      this.stepTowardTarget();
      this.voiceFeedback = 'Moved one step.';
      return;
    }

    this.voiceFeedback = 'I could not catch that clearly. Please repeat.';
  }

  private stepTowardTarget(): void {
    const dx = this.target.x - this.player.x;
    const dy = this.target.y - this.player.y;
    if (Math.abs(dx) >= Math.abs(dy)) {
      this.move(Math.sign(dx), 0);
      if (this.player.x === this.target.x && this.player.y === this.target.y) return;
      if (Math.sign(dx) === 0 && Math.sign(dy) !== 0) this.move(0, Math.sign(dy));
      return;
    }
    this.move(0, Math.sign(dy));
    if (this.player.x === this.target.x && this.player.y === this.target.y) return;
    if (Math.sign(dy) === 0 && Math.sign(dx) !== 0) this.move(Math.sign(dx), 0);
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
    return this.levenshtein(input, target) <= 1;
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

  get grid(): GridCell[] {
    const cells: GridCell[] = [];
    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        let type: GridCell['type'] = 'empty';
        if (this.player.x === x && this.player.y === y) type = 'player';
        if (this.target.x === x && this.target.y === y) type = 'target';
        if (this.blocks.some(block => block.x === x && block.y === y)) type = 'block';
        cells.push({ x, y, type });
      }
    }
    return cells;
  }

  private generateBlocks(): { x: number; y: number }[] {
    const blocks: { x: number; y: number }[] = [];
    while (blocks.length < 4) {
      const candidate = { x: Math.floor(Math.random() * this.size), y: Math.floor(Math.random() * this.size) };
      if ((candidate.x === 0 && candidate.y === 0) || (candidate.x === 4 && candidate.y === 4)) continue;
      if (blocks.some(block => block.x === candidate.x && block.y === candidate.y)) continue;
      blocks.push(candidate);
    }
    return blocks;
  }

  private generateSolvableBlocks(): { x: number; y: number }[] {
    let blocks: { x: number; y: number }[] = [];
    let attempts = 0;
    do {
      blocks = this.generateBlocks();
      attempts += 1;
    } while (!this.isSolvable(blocks) && attempts < 50);
    return blocks;
  }

  private isSolvable(blocks: { x: number; y: number }[]): boolean {
    const queue: { x: number; y: number }[] = [{ x: 0, y: 0 }];
    const visited = new Set<string>(['0,0']);
    const blocked = new Set(blocks.map(block => `${block.x},${block.y}`));
    const deltas = [
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 }
    ];

    while (queue.length > 0) {
      const current = queue.shift();
      if (!current) break;
      if (current.x === this.target.x && current.y === this.target.y) {
        return true;
      }
      for (const delta of deltas) {
        const next = { x: current.x + delta.x, y: current.y + delta.y };
        const key = `${next.x},${next.y}`;
        if (next.x < 0 || next.y < 0 || next.x >= this.size || next.y >= this.size) continue;
        if (blocked.has(key) || visited.has(key)) continue;
        visited.add(key);
        queue.push(next);
      }
    }
    return false;
  }

  closeBadge(): void {
    this.newBadge = null;
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
    const score = this.success ? 100 : 0;
    const payload: GameActivityCreateRequest = {
      patientId: userId,
      gameType: 'SPATIAL_NAVIGATION',
      difficulty: 'EASY',
      targetDomain: 'spatial',
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      durationSeconds: 0,
      score,
      maxScore: 100,
      voiceUsed: false,
      mistakesMade: 0,
      pointsEarned: score,
      adaptiveMode: false,
      difficultyAdjustments: 0,
      voiceCommandCount: 0,
      accuracyPercent: score
    };
    this.apiService.createGameActivity(payload).subscribe({
      next: () => {},
      error: () => {}
    });
  }

  private awardBadge(): void {
    const badges = this.readList('alzcare_game_badges');
    if (!badges.includes('spatial-navigation')) {
      badges.push('spatial-navigation');
      localStorage.setItem('alzcare_game_badges', JSON.stringify(badges));
      localStorage.setItem('alzcare_latest_badge', JSON.stringify({
        id: 'spatial-navigation',
        title: 'Trailblazer',
        description: 'Reached the star in Spatial Navigation.',
        icon: '🧭'
      }));
      this.newBadge = { title: 'Trailblazer', description: 'Reached the star in Spatial Navigation.', icon: '🧭' };
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
