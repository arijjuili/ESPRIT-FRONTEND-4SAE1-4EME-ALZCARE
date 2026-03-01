import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-game-splash',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './game-splash.component.html',
  styleUrls: ['./game-splash.component.scss']
})
export class GameSplashComponent implements OnInit, OnDestroy {
  @Input() gameName = 'Brain Game';
  @Input() gameIcon = '🧠';
  @Input() primaryColor = '#14b8a6';
  @Input() secondaryColor = '#8b5cf6';
  @Input() duration = 3000;
  @Output() splashComplete = new EventEmitter<void>();

  visible = true;
  private timeoutId: any;

  ngOnInit(): void {
    this.timeoutId = setTimeout(() => {
      this.hideSplash();
    }, this.duration);
  }

  ngOnDestroy(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
  }

  skipSplash(): void {
    this.hideSplash();
  }

  private hideSplash(): void {
    this.visible = false;
    setTimeout(() => {
      this.splashComplete.emit();
    }, 500);
  }
}
