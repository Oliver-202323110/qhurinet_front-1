import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DocumentoVerificacion } from '../../../models/DocumentoVerificacion';
import { DocumentoVerificacionService } from '../../../services/documentoverificacionservice';
import { obtenerMensajeBackend } from '../../../utils/backend-error';

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

  constructor(private readonly documentoService: DocumentoVerificacionService) {}

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando = true;
    const request$ = this.filtroEstado
      ? this.documentoService.listarPorEstado(this.filtroEstado)
      : this.documentoService.listar();

    request$.subscribe({
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

  revisar(estado: 'aprobado' | 'rechazado'): void {
    if (!this.seleccionado) {
      return;
    }

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
}
