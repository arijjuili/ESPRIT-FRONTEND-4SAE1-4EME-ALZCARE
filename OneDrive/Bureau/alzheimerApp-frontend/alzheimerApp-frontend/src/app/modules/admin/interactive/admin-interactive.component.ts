import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

interface Game {
  id: number;
  name: string;
  category: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  plays: number;
  avgScore: number;
  status: 'active' | 'maintenance';
  icon: string;
}

interface MemoryItem {
  id: number;
  patientName: string;
  type: 'photo' | 'audio' | 'video' | 'note';
  title: string;
  dateAdded: string;
  size: string;
}

@Component({
  selector: 'app-admin-interactive',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './admin-interactive.component.html',
  styleUrls: ['./admin-interactive.component.scss']
})
export class AdminInteractiveComponent implements OnInit {
  // Interactive Stats
  interactiveStats = [
    { label: 'Cognitive Games', value: 24, icon: '🎮', color: 'violet', change: '4 categories' },
    { label: 'Games Played Today', value: 234, icon: '📊', color: 'success', change: '+18% vs avg' },
    { label: 'Memory Items', value: 1287, icon: '📷', color: 'blue', change: '+56 this week' },
    { label: 'Social Activities', value: 8, icon: '🎉', color: 'amber', change: '3 upcoming' }
  ];

  // Cognitive Games
  games: Game[] = [
    { id: 1, name: 'Memory Match', category: 'Memory', description: 'Match pairs of cards', difficulty: 'easy', plays: 1245, avgScore: 85, status: 'active', icon: '🧠' },
    { id: 2, name: 'Number Sequence', category: 'Logic', description: 'Complete the number pattern', difficulty: 'medium', plays: 892, avgScore: 72, status: 'active', icon: '🔢' },
    { id: 3, name: 'Word Puzzle', category: 'Language', description: 'Find hidden words', difficulty: 'medium', plays: 756, avgScore: 68, status: 'active', icon: '📝' },
    { id: 4, name: 'Pattern Recall', category: 'Memory', description: 'Remember and repeat patterns', difficulty: 'hard', plays: 534, avgScore: 61, status: 'active', icon: '🎯' },
    { id: 5, name: 'Color Match', category: 'Attention', description: 'Match colors under time pressure', difficulty: 'easy', plays: 1567, avgScore: 91, status: 'active', icon: '🎨' },
    { id: 6, name: 'Story Builder', category: 'Creativity', description: 'Create stories from images', difficulty: 'easy', plays: 423, avgScore: 88, status: 'maintenance', icon: '📖' }
  ];

  // Memory Wallet Items
  memoryItems: MemoryItem[] = [
    { id: 1, patientName: 'John Doe', type: 'photo', title: 'Family Reunion 2023', dateAdded: '2024-01-15', size: '2.4 MB' },
    { id: 2, patientName: 'Mary Smith', type: 'audio', title: 'Voice message from daughter', dateAdded: '2024-01-14', size: '1.2 MB' },
    { id: 3, patientName: 'Robert Brown', type: 'video', title: 'Wedding anniversary', dateAdded: '2024-01-12', size: '15.7 MB' },
    { id: 4, patientName: 'Jane Wilson', type: 'note', title: 'Favorite recipes', dateAdded: '2024-01-10', size: '12 KB' }
  ];

  // Social Activities
  activities = [
    { id: 1, name: 'Music Therapy Session', date: 'Today, 2:00 PM', participants: 12, maxParticipants: 15, location: 'Common Room A' },
    { id: 2, name: 'Group Art Class', date: 'Tomorrow, 10:00 AM', participants: 8, maxParticipants: 10, location: 'Art Studio' },
    { id: 3, name: 'Garden Walk', date: 'Feb 14, 3:00 PM', participants: 15, maxParticipants: 20, location: 'Garden' },
    { id: 4, name: 'Memory Sharing Circle', date: 'Feb 15, 11:00 AM', participants: 6, maxParticipants: 12, location: 'Library' }
  ];

  constructor() {}

  ngOnInit(): void {}

  getDifficultyClass(difficulty: string): string {
    const classes: Record<string, string> = {
      easy: 'bg-emerald-100 text-emerald-700',
      medium: 'bg-amber-100 text-amber-700',
      hard: 'bg-rose-100 text-rose-700'
    };
    return classes[difficulty] || 'bg-gray-100 text-gray-700';
  }

  getTypeIcon(type: string): string {
    const icons: Record<string, string> = {
      photo: '📷',
      audio: '🎵',
      video: '🎬',
      note: '📝'
    };
    return icons[type] || '📄';
  }

  getTypeClass(type: string): string {
    const classes: Record<string, string> = {
      photo: 'bg-blue-100 text-blue-600',
      audio: 'bg-violet-100 text-violet-600',
      video: 'bg-rose-100 text-rose-600',
      note: 'bg-amber-100 text-amber-600'
    };
    return classes[type] || 'bg-gray-100 text-gray-600';
  }
}
