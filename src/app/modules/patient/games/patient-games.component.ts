import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-patient-games',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './patient-games.component.html',
  styleUrls: ['./patient-games.component.scss']
})
export class PatientGamesComponent {
  games = [
    {
      name: 'Memory Match',
      description: 'Match pairs of cards to test your memory',
      icon: '🧠',
      duration: '10 min',
      level: 'Easy',
      color: 'bg-gradient-to-br from-blue-100 to-blue-200'
    },
    {
      name: 'Word Puzzle',
      description: 'Solve word puzzles and improve vocabulary',
      icon: '📝',
      duration: '15 min',
      level: 'Medium',
      color: 'bg-gradient-to-br from-purple-100 to-purple-200'
    },
    {
      name: 'Number Sequence',
      description: 'Complete number patterns and sequences',
      icon: '🔢',
      duration: '10 min',
      level: 'Easy',
      color: 'bg-gradient-to-br from-green-100 to-green-200'
    },
    {
      name: 'Sudoku',
      description: 'Classic Sudoku puzzles for brain training',
      icon: '🎲',
      duration: '20 min',
      level: 'Hard',
      color: 'bg-gradient-to-br from-yellow-100 to-yellow-200'
    },
    {
      name: 'Shape Sorting',
      description: 'Sort and match shapes and colors',
      icon: '🟠',
      duration: '8 min',
      level: 'Easy',
      color: 'bg-gradient-to-br from-red-100 to-red-200'
    },
    {
      name: 'Story Recall',
      description: 'Listen to stories and answer questions',
      icon: '📖',
      duration: '12 min',
      level: 'Medium',
      color: 'bg-gradient-to-br from-indigo-100 to-indigo-200'
    }
  ];
}
