import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  email = '';
  password = '';
  loading = false;
  error = '';

  constructor(
    private authService: AuthService, 
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
    // Redirect if already authenticated
    if (this.authService.isAuthenticated()) {
      const user = this.authService.getCurrentUser();
      if (user) {
        this.redirectBasedOnRole(user.role);
      }
    }
  }

  private redirectBasedOnRole(role: string): void {
    switch (role) {
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
  }

  onLogin(): void {
    console.log('[Login] onLogin called');

    if (!this.email || !this.password) {
      this.error = 'Please fill in all fields';
      return;
    }

    this.loading = true;
    this.error = '';
    console.log('[Login] Attempting login with:', this.email);

    this.authService.login(this.email, this.password).subscribe({
      next: (user) => {
        console.log('[Login] Success, user role:', user.role);
        // Redirect based on role
        this.redirectBasedOnRole(user.role);
        this.loading = false;
      },
      error: (err) => {
        console.error('[Login] Error:', err);
        this.error = 'Invalid email or password. Please try again.';
        this.loading = false;
        this.cdr.detectChanges(); // Force update the view
      }
    });
  }
}
