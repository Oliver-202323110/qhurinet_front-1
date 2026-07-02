import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Publicacion } from '../../models/Publicacion';
import { AuthService } from '../../services/authservice';
import { PublicacionService } from '../../services/publicacionservice';
import { obtenerMensajeBackend } from '../../utils/backend-error';

@Component({
  selector: 'app-resumencomponent',
  imports: [CommonModule, RouterLink],
  templateUrl: './resumencomponent.html',
  styleUrl: './resumencomponent.css',
})
export class ResumenComponent implements OnInit {
  cargando = true;
  mensajeError = '';
  publicaciones: Publicacion[] = [];

  constructor(
    private readonly authService: AuthService,
    private readonly publicacionService: PublicacionService,
  ) {}

  ngOnInit(): void {
    const idUsuario = this.authService.getCurrentUserId();

    if (!idUsuario) {
      this.cargando = false;
      this.mensajeError = 'No se pudo identificar al usuario autenticado. Inicia sesión nuevamente.';
      return;
    }

    this.publicacionService.listarPorUsuario(idUsuario).subscribe({
      next: (publicaciones) => {
        this.publicaciones = publicaciones;
        this.cargando = false;
      },
      error: (error) => {
        this.mensajeError = obtenerMensajeBackend(error);
        this.cargando = false;
      },
    });
  }

  get nombreUsuario(): string {
    return this.authService.getCurrentUserName();
  }

  get publicacionesActivas(): number {
    return this.publicaciones.filter((publicacion) => publicacion.activo).length;
  }

  get puntosUsuario(): number {
    return this.authService.getCurrentUserPoints();
  }

  get recientes(): Publicacion[] {
    return this.publicaciones.slice(0, 2);
  }

  get esGenerador(): boolean {
  return this.authService.tieneRol(['GENERADOR', 'EMISOR']);
  }

  get esRecolector(): boolean {
    return this.authService.tieneRol(['RECOLECTOR', 'BODEGA']);
  }

  get esAdmin(): boolean {
    return this.authService.tieneRol(['ADMIN']);
  }

  get puedePublicarMaterial(): boolean {
    return this.esGenerador || this.esRecolector || this.esAdmin;
  }

  get puedeExplorarPuntos(): boolean {
    return this.esGenerador || this.esAdmin;
  }

  get puedeVerCertificados(): boolean {
    return this.esRecolector || this.esAdmin;
  }

  formatearFecha(fecha: string): string {
    if (!fecha) {
      return '';
    }

    const date = new Date(fecha);

    if (Number.isNaN(date.getTime())) {
      return '';
    }

    return new Intl.DateTimeFormat('es-PE', {
      day: '2-digit',
      month: 'short',
    }).format(date);
  }
}
