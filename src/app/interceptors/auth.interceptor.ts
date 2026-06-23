import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { AuthService } from '../services/authservice';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const token = authService.getToken();
  const isBackendRequest = request.url.startsWith(API_BASE_URL) || request.url.startsWith('/api/');
  const isAuthRequest = request.url.includes('/api/auth/');

  const authRequest =
    token && isBackendRequest && !isAuthRequest
      ? request.clone({
          setHeaders: {
            Authorization: `Bearer ${token}`,
          },
        })
      : request;

  return next(authRequest).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse) || !isBackendRequest || isAuthRequest) {
        return throwError(() => error);
      }

      if (error.status !== 401 || !authService.getRefreshToken()) {
        return throwError(() => error);
      }

      return authService.refresh().pipe(
        switchMap(() =>
          next(
            request.clone({
              setHeaders: {
                Authorization: `Bearer ${authService.getToken() ?? ''}`,
              },
            }),
          ),
        ),
        catchError(() => {
          authService.limpiarSesion();
          void router.navigate(['/login'], { queryParams: { expired: '1' } });
          return throwError(() => error);
        }),
      );
    }),
  );
};
