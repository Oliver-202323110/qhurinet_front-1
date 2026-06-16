import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { switchMap } from 'rxjs';
import { DocumentoVerificacion } from '../../../models/DocumentoVerificacion';
import { ArchivoService } from '../../../services/archivoservice';
import { AuthService } from '../../../services/authservice';
import { DocumentoVerificacionService } from '../../../services/documentoverificacionservice';
import { obtenerMensajeBackend } from '../../../utils/backend-error';

@Component({
  selector: 'app-documento-verificacion',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './documento-verificacion.html',
  styleUrl: './documento-verificacion.css',
})
export class DocumentoVerificacionComponent implements OnInit {
  documentos: DocumentoVerificacion[] = [];
  cargando = true;
  enviando = false;
  mensajeError = '';
  mensajeExito = '';
  archivo: File | null = null;
  archivoError = '';
  previewUrl = '';
  private readonly fb = inject(FormBuilder);

  readonly form = this.fb.group({
    tipo: ['dni', [Validators.required]],
  });

  constructor(
    private readonly authService: AuthService,
    private readonly documentoService: DocumentoVerificacionService,
    private readonly archivoService: ArchivoService,
  ) {}

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    const idUsuario = this.authService.getCurrentUserId();

    if (!idUsuario) {
      this.mensajeError = 'No se pudo identificar al usuario autenticado.';
      this.cargando = false;
      return;
    }

    this.documentoService.listarPorUsuario(idUsuario).subscribe({
      next: (documentos) => {
        this.documentos = documentos;
        this.cargando = false;
      },
      error: (error) => {
        this.mensajeError = obtenerMensajeBackend(error);
        this.cargando = false;
      },
    });
  }

  seleccionarArchivo(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.archivo = null;
    this.archivoError = '';
    this.previewUrl = '';

    if (!file) {
      return;
    }

    const error = this.archivoService.validarImagen(file);
    if (error) {
      this.archivoError = error;
      input.value = '';
      return;
    }

    this.archivo = file;
    this.previewUrl = URL.createObjectURL(file);
  }

  enviar(): void {
    this.form.markAllAsTouched();
    this.mensajeError = '';
    this.mensajeExito = '';

    if (this.form.invalid || !this.archivo) {
      this.mensajeError = 'Adjunta un archivo válido antes de enviar.';
      return;
    }

    const idUsuario = this.authService.getCurrentUserId();
    if (!idUsuario) {
      this.mensajeError = 'No se pudo identificar al usuario autenticado.';
      return;
    }

    if (this.tieneAprobado()) {
      this.mensajeError = 'Ya tienes documentación aprobada. No puedes reenviarla sin autorización.';
      return;
    }

    this.enviando = true;
    this.archivoService
      .subirImagen(this.archivo)
      .pipe(
        switchMap((archivo) =>
          this.documentoService.insertar({
            idUsuario,
            tipo: String(this.form.value.tipo ?? 'dni'),
            urlArchivo: archivo.url,
            estado: 'pendiente',
            motivoRechazo: '',
          }),
        ),
      )
      .subscribe({
        next: () => {
          this.enviando = false;
          this.archivo = null;
          this.previewUrl = '';
          this.mensajeExito = 'Documentación enviada correctamente.';
          this.cargar();
        },
        error: (error) => {
          this.enviando = false;
          this.mensajeError = obtenerMensajeBackend(error);
        },
      });
  }

  tieneAprobado(): boolean {
    return this.documentos.some((documento) => documento.estado?.toLowerCase() === 'aprobado');
  }
}
