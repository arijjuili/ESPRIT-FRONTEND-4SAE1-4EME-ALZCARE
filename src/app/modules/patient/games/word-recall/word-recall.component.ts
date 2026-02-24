import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-word-recall',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './word-recall.component.html',
  styleUrls: ['./word-recall.component.scss']
})
export class WordRecallComponent {
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
  newBadge: { title: string; description: string; icon: string } | null = null;
  colors = ['bg-emerald-200 text-emerald-800', 'bg-lime-200 text-lime-800', 'bg-yellow-200 text-yellow-800', 'bg-amber-200 text-amber-800', 'bg-teal-200 text-teal-800', 'bg-green-200 text-green-800'];

  startRound(): void {
    this.started = true;
    this.resultMessage = '';
    this.guesses = [];
    this.showAnswers = false;
    this.roundWords = this.pickWords(6);
    this.visibleWords = [...this.roundWords];
    this.showWords = true;

    setTimeout(() => {
      this.showWords = false;
      this.visibleWords = [];
    }, 6000);
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

  private recordCompletion(): void {
    const today = new Date().toISOString().split('T')[0];
    const sessions = this.readList('alzcare_game_sessions');
    sessions.push(today);
    localStorage.setItem('alzcare_game_sessions', JSON.stringify(sessions));
    this.checkDailyFocusBadge(sessions, today);
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
}
