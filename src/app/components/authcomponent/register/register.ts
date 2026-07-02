import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../services/authservice';
import { obtenerMensajeBackend } from '../../../utils/backend-error';

@Component({
  selector: 'app-register',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class RegisterComponent {
  cargando = false;
  submitted = false;
  mensajeError = '';
  mensajeExito = '';
  mostrarPassword = false;
  private readonly fb = inject(FormBuilder);

  readonly rolesPermitidos = [
    { value: 'GENERADOR', label: 'Emisor eco-consciente' },
    { value: 'RECOLECTOR', label: 'Recolector' },
  ];

  readonly form = this.fb.group(
    {
      nombre: ['', [Validators.required, Validators.maxLength(150)]],
      correo: ['', [Validators.required, Validators.email, Validators.maxLength(150)]],
      password: ['', [Validators.required, Validators.minLength(8), this.passwordFuerteValidator()]],
      confirmPassword: ['', [Validators.required]],
      tipoCuenta: ['', [Validators.required]],
    },
    { validators: [this.passwordsCoincidenValidator()] },
  );

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
  ) {}

  registrar(): void {
    this.submitted = true;
    this.mensajeError = '';
    this.mensajeExito = '';

    if (this.form.invalid) {
      this.mensajeError = 'Revisa los campos marcados antes de continuar.';
      this.form.markAllAsTouched();
      return;
    }

    const correo = String(this.form.value.correo ?? '').trim().toLowerCase();
    this.cargando = true;

    this.authService
      .register({
        username: correo,
        correo,
        nombre: String(this.form.value.nombre ?? '').trim(),
        password: String(this.form.value.password ?? ''),
        tipoCuenta: String(this.form.value.tipoCuenta ?? ''),
      })
      .subscribe({
        next: () => {
          this.cargando = false;
          this.mensajeExito = 'Cuenta creada correctamente. Ya puedes iniciar sesión.';
          setTimeout(() => void this.router.navigate(['/login']), 1200);
        },
        error: (error) => {
          this.cargando = false;
          this.mensajeError = obtenerMensajeBackend(error) || 'No pudimos crear la cuenta. Inténtalo nuevamente.';
        },
      });
  }

  campoInvalido(nombre: string): boolean {
    const control = this.form.get(nombre);
    return Boolean(control?.invalid && (control.touched || this.submitted));
  }

  mensajeCampo(nombre: string): string {
    const control = this.form.get(nombre);
    const errors = control?.errors;

    if (!errors) {
      if (nombre === 'confirmPassword' && this.form.errors?.['passwordsDistintas']) {
        return 'Las contraseñas no coinciden.';
      }

      return '';
    }

    if (errors['required']) {
      return 'Este campo es obligatorio.';
    }

    if (errors['email']) {
      return 'Ingresa un correo válido.';
    }

    if (errors['maxlength']) {
      return `Máximo ${errors['maxlength'].requiredLength} caracteres.`;
    }

    if (errors['minlength']) {
      return `Mínimo ${errors['minlength'].requiredLength} caracteres.`;
    }

    if (errors['passwordDebil']) {
      return 'Usa mayúscula, minúscula y número.';
    }

    return 'Valor inválido.';
  }

  private passwordFuerteValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = String(control.value ?? '');

      if (!value) {
        return null;
      }

      return /[a-z]/.test(value) && /[A-Z]/.test(value) && /\d/.test(value)
        ? null
        : { passwordDebil: true };
    };
  }

  private passwordsCoincidenValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const password = control.get('password')?.value;
      const confirmPassword = control.get('confirmPassword')?.value;

      if (!password || !confirmPassword) {
        return null;
      }

      return password === confirmPassword ? null : { passwordsDistintas: true };
    };
  }
}
