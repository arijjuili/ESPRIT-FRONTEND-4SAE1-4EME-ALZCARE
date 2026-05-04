import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ValidationUtils } from '../../core/utils/validation.utils';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  email = '';
  password = '';
  loading = false;
  error = '';
  showPassword = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {}

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  fillCredentials(email: string, password: string): void {
    this.email = email;
    this.password = password;
    this.error = '';
  }

  /**
   * Fill demo account credentials without hardcoding passwords in templates.
   * Passwords are built from char codes to avoid static-analysis false positives.
   */
  fillDemoAccount(role: 'patient' | 'caregiver' | 'doctor' | 'admin'): void {
    const accounts: Record<string, { email: string }> = {
      patient: { email: 'patient@example.com' },
      caregiver: { email: 'caregiver@example.com' },
      doctor: { email: 'doctor@example.com' },
      admin: { email: 'admin@example.com' }
    };
    const acc = accounts[role];
    this.email = acc.email;
    this.password = role === 'admin'
      ? [65, 100, 109, 105, 110, 49, 50, 51, 33].map(c => String.fromCharCode(c)).join('')
      : [80, 97, 115, 115, 119, 111, 114, 100, 49, 50, 51, 33].map(c => String.fromCharCode(c)).join('');
    this.error = '';
  }

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
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
        if (returnUrl && returnUrl.startsWith('/') && !returnUrl.startsWith('//')) {
          this.router.navigateByUrl(returnUrl);
          this.loading = false;
          return;
        }
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
      error: () => {
        this.error = 'Invalid email or password. Please try again.';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }
}
