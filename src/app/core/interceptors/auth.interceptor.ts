import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Get access token from localStorage
  const token = localStorage.getItem('access_token');

  // Clone the request and add Authorization header if token exists
  const authReq = token
    ? req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      })
    : req;

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // Only redirect on 401 if this is NOT the login/token request
      if (error.status === 401 && !req.url.includes('/token')) {
        // Token expired or invalid - logout user
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('currentUser');
        // Redirect to login page
        window.location.href = '/login';
      }
      return throwError(() => error);
    })
  );
};
