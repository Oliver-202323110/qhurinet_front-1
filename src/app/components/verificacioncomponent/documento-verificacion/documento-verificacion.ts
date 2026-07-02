import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { switchMap } from 'rxjs';
import { DocumentoVerificacion } from '../../../models/DocumentoVerificacion';
import { ArchivoService } from '../../../services/archivoservice';
import { AuthService } from '../../../services/authservice';
import { DocumentoVerificacionService } from '../../../services/documentoverificacionservice';
import { obtenerMensajeBackend } from '../../../utils/backend-error';
import { API_BASE_URL } from '../../../config/api.config';

@Component({
  selector: 'app-documento-verificacion',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './documento-verificacion.html',
  styleUrl: './documento-verificacion.css',
})
export class DocumentoVerificacionComponent implements OnInit, OnDestroy {
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
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.cargar();
  }

  ngOnDestroy(): void {
    this.revocarPreview();
  }

  cargar(): void {
    this.cargando = true;
    this.mensajeError = '';
    this.cdr.detectChanges();

    const idUsuario = this.authService.getCurrentUserId();

    if (!idUsuario) {
      this.mensajeError = 'No se pudo identificar al usuario autenticado.';
      this.documentos = [];
      this.cargando = false;
      this.cdr.detectChanges();
      return;
    }

    this.documentoService.listarPorUsuario(idUsuario).subscribe({
      next: (documentos) => {
        this.documentos = documentos ?? [];
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.documentos = [];
        this.mensajeError = obtenerMensajeBackend(error);
        this.cargando = false;
        this.cdr.detectChanges();
      },
    });
  }

  seleccionarArchivo(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.archivo = null;
    this.archivoError = '';
    this.revocarPreview();

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
      this.archivoError = this.archivo ? this.archivoError : 'Selecciona una imagen para continuar.';
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
        next: (documentoCreado) => {
          this.enviando = false;
          this.archivo = null;
          this.revocarPreview();

          this.documentos = [documentoCreado, ...this.documentos];

          this.mensajeExito = 'Documentación enviada correctamente.';
          this.cdr.detectChanges();

          this.cargar();
        },
        error: (error) => {
          this.enviando = false;
          this.mensajeError = obtenerMensajeBackend(error);
          this.cdr.detectChanges();
        },
      });
  }

  tieneAprobado(): boolean {
    return this.documentos.some((documento) => documento.estado?.toLowerCase() === 'aprobado');
  }

  tieneRechazado(): boolean {
    return this.documentos.some((documento) => documento.estado?.toLowerCase() === 'rechazado');
  }

  estadoClase(estado: string): string {
    const normalizado = estado?.toLowerCase();

    if (normalizado === 'aprobado') {
      return 'success';
    }

    if (normalizado === 'rechazado') {
      return 'inactive';
    }

    return 'warning';
  }

  puedeEnviar(): boolean {
    return !this.enviando && !this.tieneAprobado();
  }

  obtenerUrlArchivo(documento: DocumentoVerificacion): string {
    return this.normalizarUrlArchivo(documento.urlArchivo);
  }

  private normalizarUrlArchivo(url?: string): string {
    if (!url) {
      return '';
    }

    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
      return url;
    }

    return `${API_BASE_URL}${url.startsWith('/') ? url : `/${url}`}`;
  }

  private revocarPreview(): void {
    if (this.previewUrl) {
      URL.revokeObjectURL(this.previewUrl);
      this.previewUrl = '';
    }
  }
}
