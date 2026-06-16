import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../services/authservice';
import { obtenerMensajeBackend } from '../../../utils/backend-error';

@Component({
  selector: 'app-login',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class LoginComponent implements OnInit {
  cargando = false;
  mostrarPassword = false;
  mensajeError = '';
  mensajeInfo = '';
  submitted = false;
  private readonly fb = inject(FormBuilder);

  readonly form = this.fb.group({
    username: ['', [Validators.required]],
    password: ['', [Validators.required]],
    recordar: [false],
  });

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    if (this.route.snapshot.queryParamMap.get('expired')) {
      this.mensajeInfo = 'Tu sesion ha expirado. Inicia sesion nuevamente.';
    }
  }

  ingresar(): void {
    this.submitted = true;
    this.mensajeError = '';

    if (this.form.invalid) {
      this.mensajeError = 'Completa tu correo y contrasena.';
      return;
    }

    this.cargando = true;
    const username = String(this.form.value.username ?? '').trim();
    const password = String(this.form.value.password ?? '');
    const recordar = Boolean(this.form.value.recordar);

    this.authService.login(username, password, recordar).subscribe({
      next: () => {
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
        this.cargando = false;
        void this.router.navigateByUrl(returnUrl || this.authService.rutaDespuesDeLogin());
      },
      error: (error) => {
        this.cargando = false;
        this.mensajeError =
          error instanceof HttpErrorResponse && error.status === 401
            ? 'Correo o contrasena incorrectos.'
            : obtenerMensajeBackend(error);
      },
    });
  }

  campoInvalido(nombre: 'username' | 'password'): boolean {
    const control = this.form.get(nombre);
    return Boolean(control?.invalid && (control.touched || this.submitted));
  }
}
