import { Injectable } from '@angular/core';
import { Router, CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { UserRole } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return false;
    }

    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      this.router.navigate(['/login']);
      return false;
    }

    const requiredRole = this.getRequiredRoleFromUrl(state.url);
    if (!requiredRole) {
      return true;
    }

    if (currentUser.role !== requiredRole) {
      this.router.navigate([`/${currentUser.role}/dashboard`]);
      return false;
    }

    return true;
  }

  private getRequiredRoleFromUrl(url: string): UserRole | null {
    const segment = url.split('/').filter(Boolean)[0];
    if (segment === 'patient' || segment === 'caregiver' || segment === 'doctor' || segment === 'admin') {
      return segment;
    }
    return null;
  }
}
