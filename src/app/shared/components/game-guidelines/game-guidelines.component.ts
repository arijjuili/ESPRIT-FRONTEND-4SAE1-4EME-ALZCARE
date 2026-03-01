import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface GuidelineStep {
  title: string;
  description: string;
  icon?: string;
}

@Component({
  selector: 'app-game-guidelines',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './game-guidelines.component.html',
  styleUrls: ['./game-guidelines.component.scss']
})
export class GameGuidelinesComponent implements OnInit {
  @Input() title = 'How to Play';
  @Input() steps: GuidelineStep[] = [];
  @Input() highlightSelector = '';
  @Input() primaryColor = '#14b8a6';
  @Output() close = new EventEmitter<void>();

  visible = true;
  showHighlight = false;

  ngOnInit(): void {
    setTimeout(() => {
      this.showHighlight = true;
    }, 300);
  }

  closeGuidelines(): void {
    this.showHighlight = false;
    setTimeout(() => {
      this.visible = false;
      this.close.emit();
    }, 300);
  }
}
