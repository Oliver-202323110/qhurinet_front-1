import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { Usuario } from '../../../models/Usuario';
import { AuthService } from '../../../services/authservice';
import { RegisterComponent } from './register';

describe('RegisterComponent', () => {
  let fixture: ComponentFixture<RegisterComponent>;
  let component: RegisterComponent;
  let authService: { register: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    authService = {
      register: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [RegisterComponent],
      providers: [{ provide: AuthService, useValue: authService }, provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(RegisterComponent);
    component = fixture.componentInstance;
  });

  it('exige que la confirmacion de contraseña coincida', () => {
    component.form.patchValue({
      nombre: 'Usuario QhuriNet',
      correo: 'usuario@test.com',
      tipoCuenta: 'GENERADOR',
      password: 'Password1',
      confirmPassword: 'Password2',
    });

    expect(component.form.valid).toBe(false);
    expect(component.mensajeCampo('confirmPassword')).toBe('Las contraseñas no coinciden.');
  });

  it('envia el registro con correo como username cuando el formulario es valido', () => {
    const usuario: Usuario = {
      id: 1,
      username: 'usuario@test.com',
      nombre: 'Usuario QhuriNet',
      correo: 'usuario@test.com',
      enabled: true,
      roles: ['ROLE_USER'],
    };
    authService.register.mockReturnValue(of(usuario));
    component.form.patchValue({
      nombre: 'Usuario QhuriNet',
      correo: 'USUARIO@test.com',
      tipoCuenta: 'GENERADOR',
      password: 'Password1',
      confirmPassword: 'Password1',
    });

    component.registrar();

    expect(authService.register).toHaveBeenCalledWith({
      username: 'usuario@test.com',
      correo: 'usuario@test.com',
      nombre: 'Usuario QhuriNet',
      password: 'Password1',
    });
    expect(component.mensajeExito).toBe('Cuenta creada correctamente. Ya puedes iniciar sesión.');
  });

  it('muestra conflicto cuando el correo ya existe', () => {
    authService.register.mockReturnValue(
      throwError(
        () => new HttpErrorResponse({ status: 409, error: { error: 'Este correo ya se encuentra registrado.' } }),
      ),
    );
    component.form.patchValue({
      nombre: 'Usuario QhuriNet',
      correo: 'usuario@test.com',
      tipoCuenta: 'GENERADOR',
      password: 'Password1',
      confirmPassword: 'Password1',
    });

    component.registrar();

    expect(component.mensajeError).toBe('Este correo ya se encuentra registrado.');
  });
});
