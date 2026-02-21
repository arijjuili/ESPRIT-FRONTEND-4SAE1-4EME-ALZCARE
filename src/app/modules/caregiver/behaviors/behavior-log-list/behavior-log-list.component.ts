import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SafetyAlertService } from '../../../../core/services/safety-alert.service';
import { BehaviorLogResponse } from '../../../../core/models/safety-alert.model';

@Component({
  selector: 'app-behavior-log-list',
  templateUrl: './behavior-log-list.component.html',
  styleUrls: ['./behavior-log-list.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterModule]
})
export class BehaviorLogListComponent implements OnInit {
  @Input() patientId!: string;
  
  behaviorLogs: BehaviorLogResponse[] = [];
  isLoading = false;
  
  behaviorTypeIcons: Record<string, string> = {
    'FALL': '💥',
    'WANDERING': '🚶',
    'AGITATION': '😤',
    'SLEEP_DISORDER': '😴',
    'HALLUCINATION': '👁️',
    'CONFUSION': '😵',
    'AGGRESSION': '😠',
    'MEDICATION_REFUSAL': '💊',
    'OTHER': '📝'
  };
  
  constructor(private safetyService: SafetyAlertService) {}
  
  ngOnInit(): void {
    this.loadBehaviorLogs();
  }
  
  loadBehaviorLogs(): void {
    this.isLoading = true;
    this.safetyService.getBehaviorLogsByPatient(this.patientId).subscribe({
      next: (logs) => {
        this.behaviorLogs = logs.sort((a, b) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading behavior logs:', err);
        this.isLoading = false;
      }
    });
  }
  
  getSeverityColor(severity: number): string {
    if (severity <= 2) return 'bg-emerald-100 text-emerald-800';
    if (severity <= 3) return 'bg-yellow-100 text-yellow-800';
    if (severity <= 4) return 'bg-orange-100 text-orange-800';
    return 'bg-red-100 text-red-800';
  }
}
