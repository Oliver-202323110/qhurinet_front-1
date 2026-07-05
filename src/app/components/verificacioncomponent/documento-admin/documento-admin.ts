import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DocumentoVerificacion } from '../../../models/DocumentoVerificacion';
import { DocumentoVerificacionService } from '../../../services/documentoverificacionservice';
import { obtenerMensajeBackend } from '../../../utils/backend-error';
import { API_BASE_URL } from '../../../config/api.config';

@Component({
  selector: 'app-documento-admin',
  imports: [CommonModule, FormsModule],
  templateUrl: './documento-admin.html',
  styleUrl: './documento-admin.css',
})
export class DocumentoAdminComponent implements OnInit {
  documentos: DocumentoVerificacion[] = [];
  seleccionado: DocumentoVerificacion | null = null;
  filtroEstado = '';
  motivoRechazo = '';
  cargando = true;
  procesando = false;
  mensajeError = '';
  mensajeExito = '';

  constructor(private readonly documentoService: DocumentoVerificacionService, private readonly cdr: ChangeDetectorRef,) {}

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando = true;
    this.mensajeError = '';
    this.seleccionado = null;
    this.motivoRechazo = '';
    const request$ = this.filtroEstado
      ? this.documentoService.listarPorEstado(this.filtroEstado)
      : this.documentoService.listar();

    request$.subscribe({
      next: (documentos) => {
        this.documentos = documentos;
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.mensajeError = obtenerMensajeBackend(error);
        this.cargando = false;
        this.cdr.detectChanges();
      },
    });
  }

  revisar(estado: 'aprobado' | 'rechazado'): void {
    if (!this.seleccionado) {
      return;
    }

    this.mensajeError = '';
    this.mensajeExito = '';

    if (estado === 'rechazado' && !this.motivoRechazo.trim()) {
      this.mensajeError = 'Indica el motivo del rechazo.';
      return;
    }

    this.procesando = true;
    this.documentoService
      .revisar(this.seleccionado.id, {
        estado,
        motivoRechazo: estado === 'rechazado' ? this.motivoRechazo.trim() : '',
      })
      .subscribe({
        next: () => {
          this.procesando = false;
          this.seleccionado = null;
          this.motivoRechazo = '';
          this.mensajeExito = 'Documento revisado correctamente.';
          this.cargar();
        },
        error: (error) => {
          this.procesando = false;
          this.mensajeError = obtenerMensajeBackend(error);
        },
      });
  }

  abrirRevision(documento: DocumentoVerificacion): void {
    this.seleccionado = documento;
    this.motivoRechazo = documento.motivoRechazo ?? '';
    this.mensajeError = '';
  }

  cerrarRevision(): void {
    this.seleccionado = null;
    this.motivoRechazo = '';
  }

  puedeRevisar(documento: DocumentoVerificacion): boolean {
    return documento.estado?.toLowerCase() === 'pendiente';
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

  esImagen(url: string): boolean {
    return /\.(jpe?g|png|webp|gif)(\?.*)?$/i.test(url);
  }

  obtenerUrlArchivo(documento: DocumentoVerificacion | null): string {
    if (!documento?.urlArchivo) {
      return '';
    }

    return this.normalizarUrlArchivo(documento.urlArchivo);
  }

  private normalizarUrlArchivo(url: string): string {
    if (!url) {
      return '';
    }

    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
      return url;
    }

    return `${API_BASE_URL}${url.startsWith('/') ? url : `/${url}`}`;
  }
}
