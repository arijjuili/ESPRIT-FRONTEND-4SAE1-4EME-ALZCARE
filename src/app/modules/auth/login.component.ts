import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-screen bg-gradient-to-br from-primary-600 via-primary-500 to-primary-700 flex items-center justify-center p-4">
      <div class="w-full max-w-md">
        <!-- Card -->
        <div class="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <!-- Header -->
          <div class="bg-gradient-to-br from-primary-600 to-primary-700 px-6 py-10">
            <div class="flex items-center justify-center gap-3 mb-4">
              <div class="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-primary-600 text-xl font-bold">♥</div>
              <h1 class="text-3xl font-bold text-white">CareHub</h1>
            </div>
            <p class="text-primary-100 text-center font-medium">Compassionate Care Platform</p>
          </div>

          <!-- Form -->
          <div class="p-8">
            <form (ngSubmit)="onLogin()">
              <!-- Email -->
              <div class="mb-6">
                <label class="block text-gray-700 text-sm font-semibold mb-2">Email Address</label>
                <input 
                  type="email" 
                  [(ngModel)]="email" 
                  name="email"
                  class="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
                  placeholder="Enter your email"
                  required>
              </div>

              <!-- Password -->
              <div class="mb-6">
                <label class="block text-gray-700 text-sm font-semibold mb-2">Password</label>
                <input 
                  type="password" 
                  [(ngModel)]="password" 
                  name="password"
                  class="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
                  placeholder="Enter your password"
                  required>
              </div>

              <!-- Error Message -->
              <div *ngIf="error" class="mb-6 p-4 bg-danger bg-opacity-10 border border-danger text-danger rounded-lg text-sm font-medium">
                {{ error }}
              </div>

              <!-- Submit Button -->
              <button 
                type="submit"
                [disabled]="loading"
                class="w-full bg-gradient-to-r from-primary-600 to-primary-700 text-white font-semibold py-3 px-4 rounded-lg hover:from-primary-700 hover:to-primary-800 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg">
                {{ loading ? 'Logging in...' : 'Login' }}
              </button>
            </form>

            <!-- Demo Credentials -->
            <div class="mt-8 p-5 bg-primary-50 border border-primary-200 rounded-xl">
              <p class="text-sm font-bold text-primary-900 mb-4 flex items-center gap-2">
                <span>🔑</span> Demo Credentials
              </p>
              <div class="space-y-2 text-xs text-primary-800">
                <div class="flex justify-between">
                  <span class="font-semibold">Patient:</span>
                  <span class="font-mono text-primary-600">patient&#64;example.com</span>
                </div>
                <div class="flex justify-between">
                  <span class="font-semibold">Caregiver:</span>
                  <span class="font-mono text-primary-600">caregiver&#64;example.com</span>
                </div>
                <div class="flex justify-between">
                  <span class="font-semibold">Doctor:</span>
                  <span class="font-mono text-primary-600">doctor&#64;example.com</span>
                </div>
                <div class="flex justify-between">
                  <span class="font-semibold">Admin:</span>
                  <span class="font-mono text-primary-600">admin&#64;example.com</span>
                </div>
                <div class="border-t border-primary-200 pt-2 mt-2 flex justify-between">
                  <span class="font-semibold">Password:</span>
                  <span class="font-mono text-primary-600">password</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Back Link -->
        <div class="text-center mt-6">
          <a routerLink="/landing" class="text-white hover:text-primary-200 font-semibold flex items-center justify-center gap-2 transition">
            ← Back to Landing
          </a>
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class LoginComponent {
  email = '';
  password = '';
  loading = false;
  error = '';

  constructor(private authService: AuthService, private router: Router) {}

  onLogin(): void {
    if (!this.email || !this.password) {
      this.error = 'Please fill in all fields';
      return;
    }

    this.loading = true;
    this.error = '';

    this.authService.login(this.email, this.password).subscribe({
      next: (user) => {
        // Redirect based on role
        switch (user.role) {
          case 'patient':
            this.router.navigate(['/patient/dashboard']);
            break;
          case 'caregiver':
            this.router.navigate(['/caregiver/dashboard']);
            break;
          case 'doctor':
            this.router.navigate(['/doctor/dashboard']);
            break;
          case 'admin':
            this.router.navigate(['/admin/dashboard']);
            break;
        }
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Invalid email or password';
        this.loading = false;
      }
    });
  }
}
