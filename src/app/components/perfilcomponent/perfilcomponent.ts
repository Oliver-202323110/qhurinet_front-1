import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin, switchMap } from 'rxjs';
import { Usuario, UsuarioPerfil } from '../../models/Usuario';
import { ArchivoService } from '../../services/archivoservice';
import { AuthService } from '../../services/authservice';
import { UsuarioService } from '../../services/usuarioservice';
import { obtenerMensajeBackend } from '../../utils/backend-error';

@Component({
  selector: 'app-perfilcomponent',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './perfilcomponent.html',
  styleUrl: './perfilcomponent.css',
})
export class PerfilComponent implements OnInit {
  cargando = true;
  guardando = false;
  mensajeError = '';
  mensajeExito = '';
  usuario: Usuario | null = null;
  perfil: UsuarioPerfil | null = null;
  foto: File | null = null;
  fotoError = '';
  private readonly fb = inject(FormBuilder);

  readonly form = this.fb.group({
    nombre: ['', [Validators.required, Validators.maxLength(150)]],
    telefono: ['', [Validators.maxLength(30)]],
    descripcion: ['', [Validators.maxLength(250)]],
    tipoCuenta: ['GENERADOR', [Validators.required]],
  });

  constructor(
    private readonly usuarioService: UsuarioService,
    private readonly authService: AuthService,
    private readonly archivoService: ArchivoService,
  ) {}

  ngOnInit(): void {
    this.cargarPerfil();
  }

  cargarPerfil(): void {
    this.cargando = true;
    this.mensajeError = '';

    this.usuarioService
      .me()
      .pipe(
        switchMap((usuario) => {
          this.usuario = usuario;
          this.authService.guardarUsuario(usuario);
          return this.usuarioService.perfil(usuario.id);
        }),
      )
      .subscribe({
        next: (perfil) => {
          this.perfil = perfil;
          this.form.patchValue({
            nombre: perfil.nombre,
            telefono: '',
            descripcion: perfil.descripcion,
            tipoCuenta: perfil.tipoCuenta || 'GENERADOR',
          });
          this.cargando = false;
        },
        error: (error) => {
          this.mensajeError = obtenerMensajeBackend(error);
          this.cargando = false;
        },
      });
  }

  guardar(): void {
    this.form.markAllAsTouched();
    this.mensajeError = '';
    this.mensajeExito = '';

    if (this.form.invalid || !this.usuario) {
      this.mensajeError = 'Revisa los campos marcados antes de continuar.';
      return;
    }

    this.guardando = true;
    const id = this.usuario.id;
    const nombre = String(this.form.value.nombre ?? '').trim();
    const telefono = String(this.form.value.telefono ?? '').trim();
    const descripcion = String(this.form.value.descripcion ?? '').trim();
    const tipoCuenta = String(this.form.value.tipoCuenta ?? 'GENERADOR');

    const operaciones = [
      this.usuarioService.actualizarDatosBasicos(id, { nombre, telefono }),
      this.usuarioService.actualizarDescripcion(id, descripcion),
      this.usuarioService.actualizarTipoCuenta(id, tipoCuenta),
    ];

    const guardar$ = this.foto
      ? this.archivoService.subirImagen(this.foto).pipe(
          switchMap((archivo) =>
            forkJoin([...operaciones, this.usuarioService.actualizarFoto(id, archivo.url)]),
          ),
        )
      : forkJoin(operaciones);

    guardar$.subscribe({
      next: () => {
        this.guardando = false;
        this.foto = null;
        this.mensajeExito = 'Perfil actualizado correctamente.';
        this.cargarPerfil();
      },
      error: (error) => {
        this.guardando = false;
        this.mensajeError = obtenerMensajeBackend(error);
      },
    });
  }

  seleccionarFoto(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.foto = null;
    this.fotoError = '';

    if (!file) {
      return;
    }

    const error = this.archivoService.validarImagen(file);
    if (error) {
      this.fotoError = error;
      input.value = '';
      return;
    }

    this.foto = file;
  }

  inicial(): string {
    return (this.perfil?.nombre || this.usuario?.nombre || 'U').charAt(0).toUpperCase();
  }

  campoInvalido(nombre: string): boolean {
    const control = this.form.get(nombre);
    return Boolean(control?.invalid && control.touched);
  }
}
