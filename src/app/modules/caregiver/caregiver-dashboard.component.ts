import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { DataService } from '../../core/services/data.service';
import { StatCardComponent } from '../../shared/components/stat-card.component';
import { AlertCardComponent } from '../../shared/components/alert-card.component';
import { CareTask } from '../../core/models/user.model';

@Component({
  selector: 'app-caregiver-dashboard',
  standalone: true,
  imports: [CommonModule, StatCardComponent, AlertCardComponent],
  template: `
    <div class="pt-16 lg:pt-0 p-4 sm:p-6 lg:p-8">
      <!-- Header -->
      <div class="mb-6 sm:mb-8">
        <h1 class="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900">Welcome back, {{ caregiverName }}! 👋</h1>
        <p class="text-sm sm:text-base text-gray-600 mt-2">Manage your patients and daily care tasks</p>
      </div>

      <!-- Alerts Section -->
      <div class="mb-6 sm:mb-8 space-y-2 sm:space-y-4">
        <app-alert-card 
          type="warning"
          title="Action Required: Medication Due"
          message="Margaret Johnson needs evening medications in 2 hours">
        </app-alert-card>
        
        <app-alert-card 
          type="info"
          title="Upcoming Appointment"
          message="Margaret has a cognitive assessment scheduled for tomorrow at 10:00 AM">
        </app-alert-card>
      </div>

      <!-- Stats Grid -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
        <app-stat-card
          label="Patients Under Care"
          value="2"
          icon="👥"
          color="primary">
        </app-stat-card>
        
        <app-stat-card
          label="Tasks Today"
          value="4"
          icon="📋"
          color="warning">
        </app-stat-card>
        
        <app-stat-card
          label="Completed Tasks"
          value="1"
          icon="✅"
          color="success">
        </app-stat-card>
        
        <app-stat-card
          label="Pending Tasks"
          value="3"
          icon="⏳"
          color="danger">
        </app-stat-card>
      </div>

      <!-- Main Content Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
        <!-- Patients Under Care -->
        <div class="lg:col-span-2">
          <div class="bg-white rounded-xl sm:rounded-2xl shadow-md p-4 sm:p-6 lg:p-8 mb-4 sm:mb-6 lg:mb-8">
            <h2 class="text-lg sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">👥 Patients Under Your Care</h2>
            
            <div *ngIf="patients.length > 0" class="space-y-3 sm:space-y-4">
              <div *ngFor="let patient of patients" class="border-l-4 border-primary-500 bg-gradient-to-r from-primary-50 to-white rounded-lg sm:rounded-xl p-3 sm:p-6 hover:shadow-lg transition">
                <div class="flex justify-between items-start mb-3 sm:mb-4 gap-2">
                  <div class="min-w-0 flex-1">
                    <p class="text-lg sm:text-2xl font-bold text-gray-900 truncate">{{ patient.name }}</p>
                    <p class="text-gray-600 text-xs sm:text-sm mt-1 truncate">{{ patient.condition }}</p>
                  </div>
                  <span class="inline-block px-2 sm:px-3 py-1 rounded-full text-xs font-bold bg-success bg-opacity-20 text-success flex-shrink-0">
                    ✓ Active
                  </span>
                </div>
                
                <div class="grid grid-cols-3 gap-2 sm:gap-4 text-xs sm:text-sm">
                  <div class="bg-white rounded p-2 sm:p-3 min-w-0">
                    <p class="text-gray-600 text-xs font-bold">Email</p>
                    <p class="font-semibold text-gray-800 truncate text-xs sm:text-sm">{{ patient.email }}</p>
                  </div>
                  <div class="bg-white rounded p-2 sm:p-3 min-w-0">
                    <p class="text-gray-600 text-xs font-bold">Phone</p>
                    <p class="font-semibold text-gray-800 truncate text-xs sm:text-sm">{{ patient.phone }}</p>
                  </div>
                  <div class="bg-white rounded p-2 sm:p-3 min-w-0">
                    <p class="text-gray-600 text-xs font-bold">Emergency</p>
                    <p class="font-semibold text-gray-800 truncate text-xs sm:text-sm">{{ patient.emergencyContact.split(' -')[0] }}</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div *ngIf="patients.length === 0" class="text-gray-500 text-center py-8">
              No patients assigned
            </div>
          </div>

          <!-- Daily Care Tasks -->
          <div class="bg-white rounded-xl sm:rounded-2xl shadow-md p-4 sm:p-6 lg:p-8">
            <h2 class="text-lg sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">📋 Care Tasks</h2>
            
            <div *ngIf="allTasks.length > 0" class="space-y-2 sm:space-y-4">
              <div *ngFor="let task of allTasks" class="flex items-start gap-2 sm:gap-4 p-3 sm:p-5 bg-gray-50 rounded-lg sm:rounded-xl hover:bg-primary-50 transition border-l-4" [ngClass]="task.completed ? 'border-success' : 'border-primary-500'">
                <input 
                  type="checkbox" 
                  [checked]="task.completed"
                  (change)="toggleTask(task.id)"
                  class="mt-1 w-4 sm:w-5 h-4 sm:h-5 cursor-pointer rounded border-2 border-primary-500 text-primary-600 flex-shrink-0">
                <div class="flex-1 min-w-0">
                  <p class="font-bold text-gray-900 text-xs sm:text-base" [ngClass]="{'line-through text-gray-400': task.completed}">
                    {{ task.title }}
                  </p>
                  <p class="text-gray-600 text-xs mt-1 line-clamp-1">{{ task.description }}</p>
                  <p class="text-gray-500 text-xs mt-1 sm:mt-2 truncate">
                    👤 <span class="font-semibold">{{ getPatientName(task.patientId) }}</span> • ⏰ {{ task.dueDate | date: 'MMM d, h:mm a' }}
                  </p>
                </div>
                <span class="text-xs font-bold px-2 sm:px-3 py-1 rounded-full whitespace-nowrap flex-shrink-0"
                  [ngClass]="{
                    'bg-danger bg-opacity-20 text-danger': task.priority === 'high',
                    'bg-warning bg-opacity-20 text-warning': task.priority === 'medium',
                    'bg-success bg-opacity-20 text-success': task.priority === 'low'
                  }">
                  {{ task.priority | titlecase }}
                </span>
              </div>
            </div>
            
            <div *ngIf="allTasks.length === 0" class="text-gray-500 text-center py-8">
              No tasks assigned
            </div>
          </div>
        </div>

        <!-- Quick Info Sidebar -->
        <div class="space-y-4 sm:space-y-6">
          <!-- Recent Activities -->
          <div class="bg-white rounded-xl sm:rounded-2xl shadow-md p-4 sm:p-6">
            <h2 class="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4">📈 Recent Activities</h2>
            <div class="space-y-3">
              <div class="border-l-4 border-success pl-3 py-2">
                <p class="text-sm font-semibold text-gray-800">Task Completed</p>
                <p class="text-xs text-gray-600">Morning medications - 2 hours ago</p>
              </div>
              <div class="border-l-4 border-primary-500 pl-3 py-2">
                <p class="text-sm font-semibold text-gray-800">Vital Signs Logged</p>
                <p class="text-xs text-gray-600">Margaret Johnson - 4 hours ago</p>
              </div>
              <div class="border-l-4 border-warning pl-3 py-2">
                <p class="text-sm font-semibold text-gray-800">Note Added</p>
                <p class="text-xs text-gray-600">Patient mood improvement - 1 day ago</p>
              </div>
            </div>
          </div>

          <!-- Care Summary -->
          <div class="bg-white rounded-xl sm:rounded-2xl shadow-md p-4 sm:p-6">
            <h2 class="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4">📊 Care Summary</h2>
            <div class="space-y-2 sm:space-y-3 text-xs sm:text-sm">
              <div class="flex justify-between">
                <span class="text-gray-600">Avg. Tasks/Day</span>
                <span class="font-bold text-gray-800">4.2</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">Completion Rate</span>
                <span class="font-bold text-green-600">87%</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">Patients</span>
                <span class="font-bold text-gray-800">{{ patients.length }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">This Week Tasks</span>
                <span class="font-bold text-blue-600">28</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class CaregiverDashboardComponent implements OnInit {
  caregiverName = '';
  patients: any[] = [];
  allTasks: CareTask[] = [];

  constructor(private authService: AuthService, private dataService: DataService) {}

  ngOnInit(): void {
    const currentUser = this.authService.getCurrentUser();
    
    if (currentUser) {
      this.caregiverName = currentUser.name;
      
      // Get all patients
      this.patients = this.dataService.getPatients();
      
      // Get tasks assigned to this caregiver
      this.allTasks = this.dataService.getTasksForCaregiver(currentUser.id);
    }
  }

  toggleTask(taskId: string): void {
    const task = this.allTasks.find(t => t.id === taskId);
    if (task) {
      task.completed = !task.completed;
      this.dataService.updateTaskStatus(taskId, task.completed);
    }
  }

  getPatientName(patientId: string): string {
    const patient = this.patients.find(p => p.id === patientId);
    return patient ? patient.name : 'Unknown';
  }
}
