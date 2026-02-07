import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { AuthUser, UserRole } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<AuthUser | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  // Mock users database
  private mockUsers = [
    {
      id: '1',
      email: 'patient@example.com',
      name: 'John Patient',
      role: 'patient' as UserRole,
      password: 'password',
      token: 'patient-token-123'
    },
    {
      id: '2',
      email: 'caregiver@example.com',
      name: 'Sarah Caregiver',
      role: 'caregiver' as UserRole,
      password: 'password',
      token: 'caregiver-token-456'
    },
    {
      id: '3',
      email: 'doctor@example.com',
      name: 'Dr. Michael',
      role: 'doctor' as UserRole,
      password: 'password',
      token: 'doctor-token-789'
    },
    {
      id: '4',
      email: 'admin@example.com',
      name: 'Admin User',
      role: 'admin' as UserRole,
      password: 'password',
      token: 'admin-token-000'
    }
  ];

  constructor() {
    this.loadFromLocalStorage();
  }

  login(email: string, password: string): Observable<AuthUser> {
    return new Observable(observer => {
      setTimeout(() => {
        const user = this.mockUsers.find(u => u.email === email && u.password === password);
        if (user) {
          const authUser: AuthUser = {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            token: user.token
          };
          this.currentUserSubject.next(authUser);
          this.isAuthenticatedSubject.next(true);
          localStorage.setItem('currentUser', JSON.stringify(authUser));
          observer.next(authUser);
          observer.complete();
        } else {
          observer.error(new Error('Invalid credentials'));
        }
      }, 500);
    });
  }

  logout(): void {
    this.currentUserSubject.next(null);
    this.isAuthenticatedSubject.next(false);
    localStorage.removeItem('currentUser');
  }

  getCurrentUser(): AuthUser | null {
    return this.currentUserSubject.value;
  }

  isAuthenticated(): boolean {
    return this.isAuthenticatedSubject.value;
  }

  private loadFromLocalStorage(): void {
    const stored = localStorage.getItem('currentUser');
    if (stored) {
      try {
        const user = JSON.parse(stored);
        this.currentUserSubject.next(user);
        this.isAuthenticatedSubject.next(true);
      } catch (e) {
        console.error('Failed to load user from storage', e);
      }
    }
  }
}
