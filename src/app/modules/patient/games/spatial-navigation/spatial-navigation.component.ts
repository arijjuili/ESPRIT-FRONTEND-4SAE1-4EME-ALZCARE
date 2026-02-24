import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

interface GridCell {
  x: number;
  y: number;
  type: 'empty' | 'player' | 'target' | 'block';
}

@Component({
  selector: 'app-spatial-navigation',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './spatial-navigation.component.html',
  styleUrls: ['./spatial-navigation.component.scss']
})
export class SpatialNavigationComponent {
  size = 5;
  player = { x: 0, y: 0 };
  target = { x: 4, y: 4 };
  blocks: { x: number; y: number }[] = [];
  status = 'Navigate the explorer to the glowing star.';
  success = false;
  newBadge: { title: string; description: string; icon: string } | null = null;

  constructor() {
    this.resetBoard();
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
