import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/authservice';

export const roleGuard: CanActivateFn = (route) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const roles = route.data['roles'] as string[] | undefined;

  if (!roles || roles.length === 0 || authService.tieneRol(roles)) {
    return true;
  }

  return router.createUrlTree(['/acceso-denegado']);
};
