import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Toxicity Warning Component
 * 
 * Displays a warning when toxic content is detected in user input.
 * Shows the list of detected blocked words and provides guidance.
 */
@Component({
  selector: 'app-toxicity-warning',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './toxicity-warning.component.html',
  styleUrls: ['./toxicity-warning.component.scss']
})
export class ToxicityWarningComponent {
  /** List of detected toxic/blocked words */
  @Input() detectedWords: string[] = [];

  /** Whether the warning is visible */
  @Input() visible = false;

  /** Event emitted when user dismisses the warning */
  @Output() dismiss = new EventEmitter<void>();

  /** Event emitted when user wants to edit their content */
  @Output() edit = new EventEmitter<void>();

  /**
   * Dismiss the warning
   */
  onDismiss(): void {
    this.dismiss.emit();
  }

  /**
   * Edit the content to remove toxic words
   */
  onEdit(): void {
    this.edit.emit();
  }
}
