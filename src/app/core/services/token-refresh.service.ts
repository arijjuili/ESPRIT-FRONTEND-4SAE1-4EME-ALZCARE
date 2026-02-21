import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, tap, catchError, throwError, filter, take } from 'rxjs';
import { TokenResponse } from '../models/api.model';
import { environment } from '../../../environments/environment';

/**
 * Service responsible for token refresh operations and JWT expiration tracking.
 * Manages the token refresh lifecycle and provides request queueing during refresh.
 * 
 * @example
 * ```typescript
 * // Check if token is expiring soon
 * if (this.tokenRefreshService.isTokenExpiringSoon(token, 120)) {
 *   this.tokenRefreshService.refreshToken().subscribe();
 * }
 * 
 * // Queue requests during refresh in an interceptor
 * if (this.tokenRefreshService.isRefreshing) {
 *   return this.tokenRefreshService.getRefreshObservable().pipe(
 *     filter(token => token !== null),
 *     take(1),
 *     switchMap(newToken => {
 *       // Retry request with new token
 *     })
 *   );
 * }
 * ```
 */
@Injectable({
  providedIn: 'root'
})
export class TokenRefreshService {
  private readonly keycloakUrl = environment.keycloak.url;
  private readonly clientId = environment.keycloak.clientId;

  /**
   * Indicates whether a token refresh is currently in progress.
   * Used by interceptors to determine if they should queue requests.
   */
  public isRefreshing = false;

  /**
   * BehaviorSubject that emits the new access token when refresh completes.
   * Emits `null` initially and when refresh starts.
   * Interceptors can subscribe to this to wait for refresh completion.
   */
  public refreshSubject = new BehaviorSubject<string | null>(null);

  constructor(private http: HttpClient) {}

  /**
   * Decodes a JWT token and extracts its payload.
   * 
   * @param token - The JWT token string to decode
   * @returns The decoded JWT payload as a record of claims
   * @throws Error if the token format is invalid
   * 
   * @example
   * ```typescript
   * const payload = this.decodeJwt('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...');
   * console.log(payload.exp); // 1234567890
   * ```
   */
  private decodeJwt(token: string): Record<string, unknown> {
    try {
      const base64Url = token.split('.')[1];
      if (!base64Url) {
        throw new Error('Invalid JWT token format: missing payload');
      }
      
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      
      return JSON.parse(jsonPayload);
    } catch (error) {
      throw new Error(`Failed to decode JWT token: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extracts the expiration timestamp from a JWT token.
   * 
   * @param token - The JWT token string
   * @returns The expiration time as a Unix timestamp in seconds
   * @throws Error if the token is invalid or has no exp claim
   * 
   * @example
   * ```typescript
   * const expTime = this.getTokenExpirationTime(token); // 1234567890
   * ```
   */
  getTokenExpirationTime(token: string): number {
    if (!token) {
      throw new Error('Token is required');
    }

    const payload = this.decodeJwt(token);
    const exp = payload['exp'];
    
    if (typeof exp !== 'number') {
      throw new Error('Token does not contain valid exp claim');
    }
    
    return exp;
  }

  /**
   * Calculates the time remaining until the token expires.
   * 
   * @param token - The JWT token string
   * @returns The number of seconds remaining until expiration (can be negative if expired)
   * @throws Error if the token is invalid
   * 
   * @example
   * ```typescript
   * const secondsLeft = this.getTimeUntilExpiry(token); // 300 (5 minutes)
   * if (secondsLeft < 60) {
   *   // Token expires in less than a minute
   * }
   * ```
   */
  getTimeUntilExpiry(token: string): number {
    const expirationTime = this.getTokenExpirationTime(token);
    const currentTime = Math.floor(Date.now() / 1000);
    return expirationTime - currentTime;
  }

  /**
   * Checks if a token is expiring within a specified threshold.
   * 
   * @param token - The JWT token string
   * @param thresholdSeconds - The threshold in seconds (default: 60 seconds)
   * @returns `true` if the token expires within the threshold, `false` otherwise
   * @throws Error if the token is invalid
   * 
   * @example
   * ```typescript
   * // Check if token expires in the next 2 minutes
   * if (this.isTokenExpiringSoon(token, 120)) {
   *   this.refreshToken().subscribe();
   * }
   * ```
   */
  isTokenExpiringSoon(token: string, thresholdSeconds: number = 60): boolean {
    if (thresholdSeconds < 0) {
      throw new Error('Threshold must be non-negative');
    }
    
    const timeUntilExpiry = this.getTimeUntilExpiry(token);
    return timeUntilExpiry <= thresholdSeconds;
  }

  /**
   * Refreshes the access token using the stored refresh token.
   * Calls the Keycloak token endpoint with grant_type=refresh_token.
   * Updates stored tokens on success and notifies queued requests.
   * 
   * @returns Observable that emits the TokenResponse on success
   * @throws Error if no refresh token is available or refresh fails
   * 
   * @example
   * ```typescript
   * this.tokenRefreshService.refreshToken().pipe(
   *   tap(response => {
   *     console.log('Token refreshed successfully');
   *   }),
   *   catchError(error => {
   *     console.error('Token refresh failed:', error);
   *     // Handle error - redirect to login or show message
   *     return throwError(() => error);
   *   })
   * ).subscribe();
   * ```
   */
  refreshToken(): Observable<TokenResponse> {
    const currentRefreshToken = localStorage.getItem('refresh_token');
    
    if (!currentRefreshToken) {
      this.isRefreshing = false;
      return throwError(() => new Error('No refresh token available'));
    }

    // Mark refresh as in progress
    this.isRefreshing = true;
    this.refreshSubject.next(null);

    const body = new HttpParams()
      .set('grant_type', 'refresh_token')
      .set('client_id', this.clientId)
      .set('refresh_token', currentRefreshToken);

    return this.http.post<TokenResponse>(this.keycloakUrl, body.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    }).pipe(
      tap(response => {
        // Update stored tokens with new values
        this.updateStoredTokens(response);
        
        // Mark refresh as complete and notify subscribers
        this.isRefreshing = false;
        this.refreshSubject.next(response.access_token);
      }),
      catchError(error => {
        // Reset refresh state on error
        this.isRefreshing = false;
        this.refreshSubject.next(null);
        
        // Pass error to caller - do not handle logout/redirect here
        const errorMessage = this.extractErrorMessage(error);
        return throwError(() => new Error(`Token refresh failed: ${errorMessage}`));
      })
    );
  }

  /**
   * Updates the stored tokens in localStorage with new values from a token response.
   * Handles refresh token rotation if Keycloak issues a new refresh token.
   * 
   * @param response - The TokenResponse containing new tokens
   * 
   * @example
   * ```typescript
   * this.http.post<TokenResponse>('/auth/refresh', {}).subscribe(response => {
   *   this.tokenRefreshService.updateStoredTokens(response);
   * });
   * ```
   */
  updateStoredTokens(response: TokenResponse): void {
    if (!response.access_token) {
      throw new Error('TokenResponse must contain access_token');
    }

    // Update access token
    localStorage.setItem('access_token', response.access_token);

    // Update refresh token (Keycloak may rotate it)
    if (response.refresh_token) {
      localStorage.setItem('refresh_token', response.refresh_token);
    }

    // Update current user in storage with new token
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        user.token = response.access_token;
        localStorage.setItem('currentUser', JSON.stringify(user));
      } catch (e) {
        // If parsing fails, just log - don't throw as tokens are already saved
        console.warn('[TokenRefreshService] Failed to update user token in storage', e);
      }
    }
  }

  /**
   * Gets an observable that emits when token refresh completes.
   * Filters out null values (refresh in progress) and takes only the first valid token.
   * Use this in interceptors to queue requests during refresh.
   * 
   * @returns Observable that emits the new access token when refresh completes
   * 
   * @example
   * ```typescript
   * // In an HTTP interceptor
   * if (this.tokenRefreshService.isRefreshing) {
   *   return this.tokenRefreshService.getRefreshObservable().pipe(
   *     switchMap(newToken => {
   *       // Clone request with new token and retry
   *       const cloned = req.clone({
   *         setHeaders: { Authorization: `Bearer ${newToken}` }
   *       });
   *       return next.handle(cloned);
   *     })
   *   );
   * }
   * ```
   */
  getRefreshObservable(): Observable<string> {
    return this.refreshSubject.asObservable().pipe(
      filter((token): token is string => token !== null),
      take(1)
    );
  }

  /**
   * Extracts a readable error message from an HTTP error response.
   * 
   * @param error - The error object from the HTTP response
   * @returns A human-readable error message
   */
  private extractErrorMessage(error: unknown): string {
    if (error && typeof error === 'object') {
      const errorObj = error as Record<string, unknown>;
      
      // Check for error message in common locations
      if (typeof errorObj['error_description'] === 'string') {
        return errorObj['error_description'];
      }
      if (typeof errorObj['error'] === 'string') {
        return errorObj['error'];
      }
      if (typeof errorObj['message'] === 'string') {
        return errorObj['message'];
      }
      
      // Check for HTTP status
      if (typeof errorObj['status'] === 'number') {
        const status = errorObj['status'];
        if (status === 400) return 'Invalid request';
        if (status === 401) return 'Invalid or expired refresh token';
        if (status === 403) return 'Access denied';
        if (status === 500) return 'Server error';
        return `HTTP ${status}`;
      }
    }
    
    return 'Unknown error';
  }
}
