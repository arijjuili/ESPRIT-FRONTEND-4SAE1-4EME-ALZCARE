import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataService } from '../../core/services/data.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-patient-activities',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="p-8">
      <h1 class="text-4xl font-bold text-gray-900 mb-2">📋 My Activities</h1>
      <p class="text-gray-600 mb-8">Track and manage your daily tasks and goals</p>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <!-- Main Activities List -->
        <div class="lg:col-span-2">
          <div class="bg-white rounded-2xl shadow-md p-8">
            <h2 class="text-2xl font-bold text-gray-900 mb-6">Today's Activities</h2>
            
            <div *ngIf="todayTasks.length > 0" class="space-y-4">
              <div *ngFor="let task of todayTasks" class="flex items-start gap-4 p-6 bg-gray-50 rounded-xl hover:bg-primary-50 transition border-l-4" [ngClass]="task.completed ? 'border-success' : 'border-primary-500'">
                <input 
                  type="checkbox" 
                  [checked]="task.completed"
                  (change)="toggleTask(task.id)"
                  class="mt-2 w-6 h-6 cursor-pointer rounded border-2 border-primary-500 text-primary-600">
                <div class="flex-1">
                  <p class="font-bold text-gray-900 text-lg" [ngClass]="{'line-through text-gray-400': task.completed}">
                    {{ task.title }}
                  </p>
                  <p class="text-gray-600 mt-1">{{ task.description }}</p>
                  <p class="text-gray-500 text-sm mt-2">⏰ Due: {{ task.dueDate | date: 'h:mm a' }}</p>
                </div>
                <span class="px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap"
                  [ngClass]="{
                    'bg-danger bg-opacity-20 text-danger': task.priority === 'high',
                    'bg-warning bg-opacity-20 text-warning': task.priority === 'medium',
                    'bg-success bg-opacity-20 text-success': task.priority === 'low'
                  }">
                  {{ task.priority | titlecase }}
                </span>
              </div>
            </div>
          </div>

          <!-- Upcoming Activities -->
          <div class="bg-white rounded-2xl shadow-md p-8 mt-8">
            <h2 class="text-2xl font-bold text-gray-900 mb-6">Upcoming Activities</h2>
            
            <div class="space-y-4">
              <div class="flex items-start gap-4 p-6 bg-blue-50 rounded-xl border-l-4 border-info">
                <div class="text-3xl">🏥</div>
                <div class="flex-1">
                  <p class="font-bold text-gray-900">Cognitive Assessment</p>
                  <p class="text-gray-600 text-sm mt-1">Appointment with Dr. Michael</p>
                  <p class="text-gray-500 text-sm">📅 Feb 10, 2026 at 10:00 AM</p>
                </div>
              </div>
              <div class="flex items-start gap-4 p-6 bg-green-50 rounded-xl border-l-4 border-success">
                <div class="text-3xl">🚶</div>
                <div class="flex-1">
                  <p class="font-bold text-gray-900">Walk in the Park</p>
                  <p class="text-gray-600 text-sm mt-1">30-minute outdoor activity</p>
                  <p class="text-gray-500 text-sm">📅 Tomorrow at 4:00 PM</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Sidebar: Stats & Tips -->
        <div class="space-y-6">
          <!-- Activity Stats -->
          <div class="bg-white rounded-2xl shadow-md p-6">
            <h3 class="text-xl font-bold text-gray-900 mb-4">📊 This Week</h3>
            <div class="space-y-3">
              <div class="flex justify-between items-center">
                <span class="text-gray-600">Tasks Completed</span>
                <span class="text-2xl font-bold text-success">12</span>
              </div>
              <div class="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div class="h-full bg-success w-3/4"></div>
              </div>
              <div class="flex justify-between items-center pt-2">
                <span class="text-gray-600">Completion Rate</span>
                <span class="text-2xl font-bold text-primary-600">75%</span>
              </div>
            </div>
          </div>

          <!-- Wellness Tips -->
          <div class="bg-gradient-to-br from-primary-50 to-primary-100 rounded-2xl shadow-md p-6 border border-primary-200">
            <h3 class="text-lg font-bold text-primary-900 mb-4">💡 Wellness Tips</h3>
            <div class="space-y-3 text-sm text-primary-800">
              <p>✓ Stay hydrated - drink 8 glasses daily</p>
              <p>✓ Get 7-8 hours of sleep</p>
              <p>✓ Take medications on time</p>
              <p>✓ Exercise for 30 minutes daily</p>
            </div>
          </div>

          <!-- Streak Counter -->
          <div class="bg-white rounded-2xl shadow-md p-6 text-center">
            <p class="text-gray-600 text-sm mb-2">🔥 Current Streak</p>
            <p class="text-5xl font-bold text-warning">7</p>
            <p class="text-gray-600 text-sm mt-2">Days of tasks completed</p>
            <button class="w-full mt-4 bg-primary-600 text-white py-2 rounded-lg hover:bg-primary-700 transition font-semibold">
              Keep it up! 💪
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class PatientActivitiesComponent implements OnInit {
  todayTasks: any[] = [];

  constructor(private dataService: DataService, private authService: AuthService) {}

  ngOnInit(): void {
    const currentUser = this.authService.getCurrentUser();
    if (currentUser) {
      const patient = this.dataService.getPatients()[0];
      if (patient) {
        this.todayTasks = this.dataService.getTasks(patient.id).filter(t => {
          const today = new Date();
          const taskDate = new Date(t.dueDate);
          return taskDate.toDateString() === today.toDateString();
        });
      }
    }
  }

  toggleTask(taskId: string): void {
    const task = this.todayTasks.find(t => t.id === taskId);
    if (task) {
      task.completed = !task.completed;
      this.dataService.updateTaskStatus(taskId, task.completed);
    }
  }
}
