import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

/**
 * PDF-style path: /accept/:token → same flow as /accept-invite?token=
 */
@Component({
  selector: 'app-accept-invite-redirect',
  standalone: true,
  template: ''
})
export class AcceptInviteRedirectComponent implements OnInit {
  constructor(
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    const token = this.route.snapshot.paramMap.get('token') || '';
    this.router.navigate(['/accept-invite'], {
      queryParams: { token },
      replaceUrl: true
    });
  }
}
