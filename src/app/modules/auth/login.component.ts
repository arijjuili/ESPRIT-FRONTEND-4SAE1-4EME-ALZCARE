import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ValidationUtils } from '../../core/utils/validation.utils';

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
  ) {}

  onLogin(): void {
    if (!this.email || !this.password) {
      this.error = 'Please fill in all fields';
      return;
    }

    if (!ValidationUtils.isValidEmail(this.email)) {
      this.error = 'Please enter a valid email address';
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
        this.error = 'Invalid email or password. Please try again.';
        this.loading = false;
        this.cdr.detectChanges(); // Force update the view
      }
    });
  }
}
