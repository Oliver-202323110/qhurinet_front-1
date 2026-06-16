import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { forkJoin, map, of, switchMap, catchError } from 'rxjs';
import { MaterialDetalle } from '../../../models/PublicacionDetalle';
import { Publicacion } from '../../../models/Publicacion';
import { AuthService } from '../../../services/authservice';
import { PublicacionService } from '../../../services/publicacionservice';
import { obtenerMensajeBackend } from '../../../utils/backend-error';

interface PublicacionCard {
  publicacion: Publicacion;
  materiales: MaterialDetalle[];
  errorDetalle: string;
}

@Component({
  selector: 'app-publicacion-list',
  imports: [CommonModule, RouterLink],
  templateUrl: './publicacion-list.html',
  styleUrl: './publicacion-list.css',
})
export class PublicacionList implements OnInit {
  cargando = true;
  mensajeError = '';
  mensajeExito = '';
  eliminandoId: number | null = null;
  publicaciones: PublicacionCard[] = [];

  constructor(
    private readonly authService: AuthService,
    private readonly publicacionService: PublicacionService,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    this.cargarPublicaciones();
  }

  esAdmin(): boolean {
    return this.authService.isAdmin();
  }

  cargarPublicaciones(): void {
    this.cargando = true;
    this.mensajeError = '';

    const idUsuario = this.authService.getCurrentUserId();

    if (!idUsuario) {
      this.cargando = false;
      this.mensajeError = 'No se pudo identificar al usuario autenticado. Inicia sesión nuevamente.';
      return;
    }

    this.publicacionService
      .listarPorUsuario(idUsuario)
      .pipe(
        switchMap((publicaciones) => {
          if (publicaciones.length === 0) {
            return of([]);
          }

          return forkJoin(
            publicaciones.map((publicacion) =>
              this.publicacionService.obtenerDetalle(publicacion.id).pipe(
                map((detalle) => ({
                  publicacion,
                  materiales: detalle.materiales ?? [],
                  errorDetalle: '',
                })),
                catchError(() =>
                  of({
                    publicacion,
                    materiales: [],
                    errorDetalle: 'No se pudieron cargar los materiales.',
                  }),
                ),
              ),
            ),
          );
        }),
      )
      .subscribe({
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

  editar(id: number): void {
    void this.router.navigate(['/publicaciones/editar', id]);
  }

  eliminar(card: PublicacionCard): void {
    if (!this.esAdmin()) {
      return;
    }

    if (typeof window !== 'undefined' && !window.confirm('¿Eliminar esta publicación?')) {
      return;
    }

    this.eliminandoId = card.publicacion.id;
    this.mensajeError = '';
    this.mensajeExito = '';

    this.publicacionService.eliminar(card.publicacion.id).subscribe({
      next: () => {
        this.publicaciones = this.publicaciones.filter(
          (item) => item.publicacion.id !== card.publicacion.id,
        );
        this.mensajeExito = 'Publicación eliminada correctamente.';
        this.eliminandoId = null;
      },
      error: (error) => {
        this.mensajeError = obtenerMensajeBackend(error);
        this.eliminandoId = null;
      },
    });
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
      year: 'numeric',
    }).format(date);
  }

  trackByPublicacion(_: number, item: PublicacionCard): number {
    return item.publicacion.id;
  }

  trackByMaterial(_: number, item: MaterialDetalle): number {
    return item.idMaterial;
  }
}
