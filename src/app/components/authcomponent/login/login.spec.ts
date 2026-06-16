import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { LoginResponse } from '../../../models/Usuario';
import { AuthService } from '../../../services/authservice';
import { LoginComponent } from './login';

describe('LoginComponent', () => {
  let fixture: ComponentFixture<LoginComponent>;
  let component: LoginComponent;
  let authService: { login: ReturnType<typeof vi.fn>; rutaDespuesDeLogin: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    authService = {
      login: vi.fn(),
      rutaDespuesDeLogin: vi.fn(() => '/resumen'),
    };

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [{ provide: AuthService, useValue: authService }, provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
  });

  it('bloquea el envio cuando faltan credenciales', () => {
    component.ingresar();

    expect(authService.login).not.toHaveBeenCalled();
    expect(component.mensajeError).toBe('Completa tu correo y contrasena.');
  });

  it('redirige cuando el backend acepta el login', () => {
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    const response: LoginResponse = {
      token: 'token',
      expiresIn: 900000,
      tokenType: 'Bearer',
      refreshToken: 'refresh',
    };
    authService.login.mockReturnValue(of(response));
    component.form.patchValue({ username: 'user@test.com', password: 'Password1' });

    component.ingresar();

    expect(authService.login).toHaveBeenCalledWith('user@test.com', 'Password1', false);
    expect(navigateSpy).toHaveBeenCalledWith('/resumen');
  });

  it('muestra un mensaje seguro cuando las credenciales son invalidas', () => {
    authService.login.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 401, error: { error: 'Unauthorized' } })),
    );
    component.form.patchValue({ username: 'user@test.com', password: 'bad' });

    component.ingresar();

    expect(component.mensajeError).toBe('Correo o contrasena incorrectos.');
  });
});
