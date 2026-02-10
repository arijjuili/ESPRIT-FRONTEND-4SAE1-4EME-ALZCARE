import { Component } from '@angular/core';
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
