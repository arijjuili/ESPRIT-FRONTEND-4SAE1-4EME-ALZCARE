import { HttpInterceptorFn, HttpErrorResponse, HttpRequest, HttpHandlerFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError, of, BehaviorSubject, filter, take, tap } from 'rxjs';
import { TokenRefreshService } from '../services/token-refresh.service';

// Shared state for refresh (at module level)
let isRefreshing = false;
const refreshSubject = new BehaviorSubject<string | null>(null);

// Token endpoint pattern to skip auth header
const TOKEN_ENDPOINT_PATTERN = '/protocol/openid-connect/token';

/**
 * Decode JWT token to get payload
 */
function decodeToken(token: string): any {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

/**
 * Check if token is expiring soon (within 60 seconds)
 */
function isTokenExpiringSoon(token: string): boolean {
  const payload = decodeToken(token);
  if (!payload || !payload.exp) {
    return false;
  }
  const expirationTime = payload.exp * 1000; // Convert to milliseconds
  const currentTime = Date.now();
  const bufferTime = 60 * 1000; // 60 seconds buffer
  return expirationTime - currentTime < bufferTime;
}

/**
 * Check if token is a mock token (for development)
 */
function isMockToken(token: string | null): boolean {
  return !!token && token.startsWith('mock-');
}

/**
 * Check if request is to the token endpoint
 */
function isTokenRequest(url: string): boolean {
  return url.includes(TOKEN_ENDPOINT_PATTERN);
}

/**
 * Add auth header to request
 */
function addAuthHeader(req: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
  return req.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`
    }
  });
}

/**
 * Handle logout - clear storage and redirect
 */
function logout(): void {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('currentUser');
  window.location.href = '/login';
}

/**
 * Auth Interceptor - Handles token refresh proactively and reactively
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const tokenRefreshService = inject(TokenRefreshService);

  // Skip auth header for token requests
  if (isTokenRequest(req.url)) {
    return next(req);
  }

  const token = localStorage.getItem('access_token');

  // No token - proceed without auth header
  if (!token) {
    return next(req);
  }

  // Check if token is expiring soon
  if (isTokenExpiringSoon(token) && !isRefreshing) {
    // Start token refresh proactively
    isRefreshing = true;
    refreshSubject.next(null);

    return tokenRefreshService.refreshToken().pipe(
      tap((response) => {
        isRefreshing = false;
        refreshSubject.next(response.access_token);
      }),
      switchMap((response) => {
        // Retry the original request with new token
        const authReq = addAuthHeader(req, response.access_token);
        return next(authReq);
      }),
      catchError((error) => {
        isRefreshing = false;
        refreshSubject.next(null);
        logout();
        return throwError(() => error);
      })
    );
  }

  // If refresh is in progress, queue this request
  if (isRefreshing) {
    return refreshSubject.pipe(
      filter((newToken) => newToken !== null),
      take(1),
      switchMap((newToken) => {
        const authReq = addAuthHeader(req, newToken!);
        return next(authReq);
      })
    );
  }

  // Normal case - add auth header and proceed
  const authReq = addAuthHeader(req, token);

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // Handle 401 errors - try refresh once before logging out
      // But don't logout if the refresh succeeds but original request still fails (backend service down)
      const token = localStorage.getItem('access_token');
      if (error.status === 401 && !isTokenRequest(req.url) && token && !isMockToken(token)) {
        if (isRefreshing) {
          // Wait for ongoing refresh and retry
          return refreshSubject.pipe(
            filter((newToken) => newToken !== null),
            take(1),
            switchMap((newToken) => {
              const retryReq = addAuthHeader(req, newToken!);
              return next(retryReq);
            }),
            catchError((refreshError) => {
              // Don't logout - just pass the error through
              return throwError(() => refreshError);
            })
          );
        }

        // Start refresh process
        isRefreshing = true;
        refreshSubject.next(null);
        let refreshSucceeded = false;

        return tokenRefreshService.refreshToken().pipe(
          tap((response) => {
            refreshSucceeded = true;
            isRefreshing = false;
            refreshSubject.next(response.access_token);
          }),
          switchMap((response) => {
            // Retry the original request with new token
            const retryReq = addAuthHeader(req, response.access_token);
            return next(retryReq);
          }),
          catchError((refreshError: HttpErrorResponse) => {
            isRefreshing = false;
            refreshSubject.next(null);

            // Only redirect if refresh itself fails with auth error (401/400)
            // Don't logout if refresh succeeds but original request fails (backend service down)
            if (refreshSucceeded) {
              // Token refresh worked, but the API still failed - service is down, don't logout
              return throwError(() => refreshError);
            }

            // Token refresh failed - might be auth issue
            if (refreshError.status === 401 || refreshError.status === 400) {
              logout();
            }

            return throwError(() => refreshError);
          })
        );
      }

      // For all other errors (including 500, service unavailable, etc.), just pass through
      return throwError(() => error);
    })
  );
};
