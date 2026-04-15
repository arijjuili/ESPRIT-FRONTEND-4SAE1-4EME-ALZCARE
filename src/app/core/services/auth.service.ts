import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, tap, map, catchError, throwError, Subject } from 'rxjs';
import { AuthUser, UserRole } from '../models/user.model';
import { TokenResponse, KeycloakUserInfo } from '../models/api.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private keycloakUrl = environment.keycloak.url;
  private clientId = environment.keycloak.clientId;

  private currentUserSubject = new BehaviorSubject<AuthUser | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  // Subject for token refresh events
  private tokenRefreshedSubject = new Subject<TokenResponse>();
  public tokenRefreshed$ = this.tokenRefreshedSubject.asObservable();

  // Mock users for fallback (when backend is not available)
  private mockUsers = [
    {
      id: '1',
      email: 'patient@example.com',
      name: 'John Patient',
      role: 'patient' as UserRole,
      password: 'Password123!',
      token: 'mock-patient-token'
    },
    {
      id: '2',
      email: 'caregiver@example.com',
      name: 'Sarah Caregiver',
      role: 'caregiver' as UserRole,
      password: 'Password123!',
      token: 'mock-caregiver-token'
    },
    {
      id: '3',
      email: 'doctor@example.com',
      name: 'Dr. Michael',
      role: 'doctor' as UserRole,
      password: 'Password123!',
      token: 'mock-doctor-token'
    },
    {
      id: '4',
      email: 'admin@example.com',
      name: 'Admin User',
      role: 'admin' as UserRole,
      password: 'Password123!',
      token: 'mock-admin-token'
    }
  ];

  // Flag to toggle between Keycloak and mock auth
  private useKeycloak = true;

  constructor(private http: HttpClient) {
    this.loadFromLocalStorage();
  }

  /**
   * Login - tries Keycloak first, falls back to mock auth if configured
   */
  login(email: string, password: string): Observable<AuthUser> {
    if (this.useKeycloak) {
      return this.loginWithKeycloak(email, password);
    } else {
      return this.loginWithMock(email, password);
    }
  }

  /**
   * Login using Keycloak OAuth2
   */
  private loginWithKeycloak(username: string, password: string): Observable<AuthUser> {
    const body = new HttpParams()
      .set('grant_type', 'password')
      .set('client_id', this.clientId)
      .set('username', username)
      .set('password', password);

    return this.http.post<TokenResponse>(this.keycloakUrl, body.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    }).pipe(
      map(response => {
        // Store tokens
        localStorage.setItem('access_token', response.access_token);
        localStorage.setItem('refresh_token', response.refresh_token);

        // Decode JWT to get user info
        const userInfo = this.decodeToken(response.access_token);
        
        // Map Keycloak roles to app roles
        const role = this.mapKeycloakRole(userInfo);
        
        // Build display name from available fields
        const displayName = userInfo.name 
          || (userInfo.given_name && userInfo.family_name ? `${userInfo.given_name} ${userInfo.family_name}` : undefined)
          || userInfo.preferred_username 
          || userInfo.email 
          || 'User';
        
        const authUser: AuthUser = {
          id: userInfo.sub,
          email: userInfo.email || '',
          name: displayName,
          role: role,
          token: response.access_token
        };

        this.currentUserSubject.next(authUser);
        this.isAuthenticatedSubject.next(true);
        localStorage.setItem('currentUser', JSON.stringify(authUser));

        return authUser;
      }),
      catchError(error => {
        // If it's an authentication error (400 or 401), don't fallback - propagate the error
        if (error.status === 401 || error.status === 400) {
          return throwError(() => new Error('Invalid email or password'));
        }
        // For other errors (network, server down), fallback to mock auth
        return this.loginWithMock(username, password);
      })
    );
  }

  /**
   * Mock login for development/testing
   */
  private loginWithMock(email: string, password: string): Observable<AuthUser> {
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
          localStorage.setItem('access_token', user.token);
          observer.next(authUser);
          observer.complete();
        } else {
          observer.error(new Error('Invalid credentials'));
        }
      }, 500);
    });
  }

  /**
   * Refresh the access token using the refresh token
   */
  refreshToken(): Observable<TokenResponse> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      return throwError(() => new Error('No refresh token available'));
    }

    const body = new HttpParams()
      .set('grant_type', 'refresh_token')
      .set('client_id', this.clientId)
      .set('refresh_token', refreshToken);

    return this.http.post<TokenResponse>(this.keycloakUrl, body.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    }).pipe(
      tap(response => {
        this.updateTokens(response);
        this.tokenRefreshedSubject.next(response);
      }),
      catchError(error => {
        // If refresh fails, logout the user
        this.logout();
        return throwError(() => new Error('Session expired. Please login again.'));
      })
    );
  }

  /**
   * Update stored tokens and current user with new token response
   */
  updateTokens(response: TokenResponse): void {
    // Store new tokens
    localStorage.setItem('access_token', response.access_token);
    localStorage.setItem('refresh_token', response.refresh_token);

    // Update currentUser with new token
    const user = this.getCurrentUser();
    if (user) {
      user.token = response.access_token;
      this.currentUserSubject.next(user);
      localStorage.setItem('currentUser', JSON.stringify(user));
    }
  }

  /**
   * Get the current refresh token from localStorage
   */
  getRefreshToken(): string | null {
    return localStorage.getItem('refresh_token');
  }

  /**
   * Get the current access token from localStorage
   */
  getAccessToken(): string | null {
    return localStorage.getItem('access_token');
  }

  /**
   * Decode JWT token
   */
  private decodeToken(token: string): KeycloakUserInfo {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  }

  /**
   * Get token expiration time as Unix timestamp
   */
  getTokenExpirationTime(): number | null {
    const token = this.getAccessToken();
    if (!token) return null;
    try {
      const payload = this.decodeJwt(token);
      return payload.exp || null;
    } catch {
      return null;
    }
  }

  /**
   * Decode JWT token payload
   */
  private decodeJwt(token: string): { exp?: number; iat?: number; [key: string]: any } {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  }

  /**
   * Get time until token expiry in seconds
   */
  getTimeUntilExpiry(): number {
    const exp = this.getTokenExpirationTime();
    if (!exp) return 0;
    const now = Math.floor(Date.now() / 1000);
    return Math.max(0, exp - now);
  }

  /**
   * Check if token is expiring soon (within threshold seconds)
   */
  isTokenExpiringSoon(thresholdSeconds: number = 60): boolean {
    const timeUntilExpiry = this.getTimeUntilExpiry();
    return timeUntilExpiry <= thresholdSeconds;
  }

  /**
   * Check if token is already expired
   */
  isTokenExpired(): boolean {
    return this.getTimeUntilExpiry() === 0;
  }

  /**
   * Map Keycloak realm roles to app roles
   * Checks both 'roles' claim (from protocol mapper) and 'realm_access.roles'
   */
  private mapKeycloakRole(userInfo: KeycloakUserInfo): UserRole {
    // Get roles from protocol mapper (flat 'roles' claim in token)
    const rolesFromClaim = Array.isArray(userInfo.roles) ? userInfo.roles : [];
    
    // Get roles from realm_access (standard Keycloak structure)
    const rolesFromRealmAccess = userInfo.realm_access?.roles || [];
    
    // Combine both sources
    const allRoles = [...rolesFromClaim, ...rolesFromRealmAccess];
    

    
    if (allRoles.includes('ADMIN')) return 'admin';
    if (allRoles.includes('DOCTOR')) return 'doctor';
    if (allRoles.includes('CAREGIVER')) return 'caregiver';
    return 'patient';
  }

  /**
   * Logout user
   */
  logout(): void {
    this.currentUserSubject.next(null);
    this.isAuthenticatedSubject.next(false);
    localStorage.removeItem('currentUser');
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    // Clear notification-related localStorage
    localStorage.removeItem('notification_last_read');
    localStorage.removeItem('notification_settings');
  }

  /**
   * Get current user
   */
  getCurrentUser(): AuthUser | null {
    return this.currentUserSubject.value;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.isAuthenticatedSubject.value;
  }

  /**
   * Toggle between Keycloak and mock authentication
   */
  setUseKeycloak(use: boolean): void {
    this.useKeycloak = use;
  }

  private loadFromLocalStorage(): void {
    const stored = localStorage.getItem('currentUser');
    const token = localStorage.getItem('access_token');
    if (stored && token) {
      try {
        const user = JSON.parse(stored);
        this.currentUserSubject.next(user);
        this.isAuthenticatedSubject.next(true);
      } catch (e) {
        this.logout();
      }
    }
  }

  /**
   * Get the current user's UUID from the JWT token's 'sub' claim
   * This is the Keycloak user ID (UUID format)
   */
  getCurrentUserId(): string | null {
    const token = this.getAccessToken();
    if (!token) {
      return this.getCurrentUser()?.id || null;
    }
    
    try {
      const payload = this.decodeJwt(token);
      console.log('JWT Token payload extracted:', payload);
      return payload['sub'] || this.getCurrentUser()?.id || null;
    } catch {
      return this.getCurrentUser()?.id || null;
    }
  }
}
