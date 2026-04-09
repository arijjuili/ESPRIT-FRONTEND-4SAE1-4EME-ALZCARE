import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CareTeamService } from '../../core/services/care-team.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../shared/components/toast/toast.service';
import { InviteValidationResponse } from '../../core/models/care-team.model';

@Component({
  selector: 'app-accept-invite',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './accept-invite.component.html',
  styleUrls: ['./accept-invite.component.scss']
})
export class AcceptInviteComponent implements OnInit {
  token = '';
  validation: InviteValidationResponse | null = null;
  loadError: string | null = null;
  loading = true;
  accepting = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private careTeamService: CareTeamService,
    private authService: AuthService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      this.token = params.get('token') || '';
      if (!this.token) {
        this.loading = false;
        this.loadError = 'Missing invite token. Use the full link sent by your doctor.';
        return;
      }
      this.validate();
    });
  }

  validate(): void {
    this.loading = true;
    this.loadError = null;
    this.careTeamService.validateInviteToken(this.token).subscribe({
      next: (v) => {
        this.validation = v;
        this.loading = false;
      },
      error: () => {
        this.loadError = 'This invite link is invalid or has expired.';
        this.loading = false;
      }
    });
  }

  get loggedIn(): boolean {
    return !!this.authService.getCurrentUser();
  }

  accept(): void {
    const uid = this.authService.getCurrentUserId();
    if (!uid) {
      this.toastService.warning('Log in as a caregiver first, then return to this page.');
      this.router.navigate(['/login'], { queryParams: { returnUrl: `/accept-invite?token=${this.token}` } });
      return;
    }
    this.accepting = true;
    this.careTeamService.acceptInvite(this.token, uid).subscribe({
      next: () => {
        this.toastService.success('You are now linked to this patient’s care team.');
        this.accepting = false;
        this.router.navigate(['/caregiver/dashboard']);
      },
      error: (err) => {
        this.toastService.error(err.error?.error || 'Could not accept invite');
        this.accepting = false;
      }
    });
  }
}
