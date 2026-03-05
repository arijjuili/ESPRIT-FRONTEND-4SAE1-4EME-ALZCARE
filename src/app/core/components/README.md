# Core Components

## DashboardRedirectComponent

Location: `core/components/dashboard-redirect.component.ts`

### Purpose
Provides a unified `/dashboard` route that automatically redirects authenticated users to their role-appropriate dashboard.

### How it Works
1. User navigates to `/dashboard`
2. Component checks user's role via AuthService
3. Redirects to:
   - `/patient/dashboard` for patients
   - `/caregiver/dashboard` for caregivers
   - `/doctor/dashboard` for doctors
   - `/admin/dashboard` for admins
   - `/login` if not authenticated

### Usage

In templates:
```html
<a routerLink="/dashboard">Go to Dashboard</a>
```

In components:
```typescript
this.router.navigate(['/dashboard']);
```

This eliminates the need for conditional routing logic throughout the application.