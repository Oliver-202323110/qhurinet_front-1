import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { Certificado } from '../../../models/Certificado';
import { AuthService } from '../../../services/authservice';
import { CertificadoService } from '../../../services/certificadoservice';
import { obtenerMensajeBackend } from '../../../utils/backend-error';

@Component({
  selector: 'app-certificado-list',
  imports: [CommonModule, FormsModule],
  templateUrl: './certificado-list.html',
  styleUrl: './certificado-list.css',
})
export class CertificadoListComponent implements OnInit {
  cargando = true;
  mensajeError = '';
  mensajeExito = '';
  certificados: Certificado[] = [];
  propios: Certificado[] = [];
  seleccionado: Certificado | null = null;
  dificultad = '';

  constructor(
    private readonly certificadoService: CertificadoService,
    private readonly authService: AuthService,
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

    this.cargando = true;
    forkJoin({
      certificados: this.dificultad
        ? this.certificadoService.filtrarPorDificultad(this.dificultad)
        : this.certificadoService.listar(),
      propios: this.certificadoService.listarPorUsuario(idUsuario),
    }).subscribe({
      next: ({ certificados, propios }) => {
        this.certificados = certificados;
        this.propios = propios;
        this.cargando = false;
      },
      error: (error) => {
        this.mensajeError = obtenerMensajeBackend(error);
        this.cargando = false;
      },
    });
  }

  estaObtenido(certificado: Certificado): boolean {
    return this.propios.some((item) => item.id === certificado.id || item.nombre === certificado.nombre);
  }

  estado(certificado: Certificado): string {
    if (this.estaObtenido(certificado)) {
      return 'obtenido';
    }

    return this.authService.getCurrentUserPoints() >= (certificado.puntosRequeridos ?? 0)
      ? 'disponible'
      : 'bloqueado';
  }

  descargar(certificado: Certificado): void {
    this.certificadoService.descargarPdf(certificado.id).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `certificado-${certificado.id}.pdf`;
        link.click();
        URL.revokeObjectURL(url);
        this.mensajeExito = 'Certificado descargado correctamente.';
      },
      error: (error) => {
        this.mensajeError = obtenerMensajeBackend(error);
      },
    });
  }
}
