import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';
import { AuthService } from '../services/authservice';
import { authGuard } from './auth.guard';
import { roleGuard } from './role.guard';

describe('authGuard', () => {
  it('permite navegar cuando existe sesion', () => {
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: { estaAutenticado: () => true } },
        provideRouter([]),
      ],
    });

    const result = TestBed.runInInjectionContext(() =>
      authGuard({} as ActivatedRouteSnapshot, { url: '/resumen' } as RouterStateSnapshot),
    );

    expect(result).toBe(true);
  });

  it('redirige a login cuando no existe sesion', () => {
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: { estaAutenticado: () => false } },
        provideRouter([]),
      ],
    });
    const router = TestBed.inject(Router);

    const result = TestBed.runInInjectionContext(() =>
      authGuard({} as ActivatedRouteSnapshot, { url: '/publicaciones/nuevo' } as RouterStateSnapshot),
    ) as UrlTree;

    expect(router.serializeUrl(result)).toBe('/login?returnUrl=%2Fpublicaciones%2Fnuevo');
  });
});

describe('roleGuard', () => {
  it('bloquea rutas de administrador para un rol sin permiso', () => {
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: { tieneRol: () => false } },
        provideRouter([]),
      ],
    });
    const router = TestBed.inject(Router);
    const route = { data: { roles: ['ADMIN'] } } as unknown as ActivatedRouteSnapshot;

    const result = TestBed.runInInjectionContext(() =>
      roleGuard(route, { url: '/roles' } as RouterStateSnapshot),
    ) as UrlTree;

    expect(router.serializeUrl(result)).toBe('/acceso-denegado');
  });
});
