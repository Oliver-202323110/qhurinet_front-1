import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MaterialDetalle } from '../../../models/PublicacionDetalle';
import { Publicacion } from '../../../models/Publicacion';
import { AuthService } from '../../../services/authservice';
import { PublicacionService } from '../../../services/publicacionservice';
import { obtenerMensajeBackend } from '../../../utils/backend-error';
import { API_BASE_URL } from '../../../config/api.config';

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
  cancelandoId: number | null = null;
  todasPublicaciones: PublicacionCard[] = [];
  publicaciones: PublicacionCard[] = [];

  paginaActual = 1;
  elementosPorPagina = 6;
  totalPaginas = 1;

  constructor(
    private readonly authService: AuthService,
    private readonly publicacionService: PublicacionService,
    private readonly router: Router,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.cargarPublicaciones();
  }

  esAdmin(): boolean {
    return this.authService.isAdmin();
  }

  obtenerImagenPublicacion(publicacion: Publicacion): string {
    if (!publicacion.imagenesJson) {
      return '';
    }

    try {
      const imagenes = JSON.parse(publicacion.imagenesJson);
      const url = Array.isArray(imagenes) ? imagenes[0]?.url : imagenes?.url;
      return this.normalizarUrlImagen(url);
    } catch {
      return this.normalizarUrlImagen(publicacion.imagenesJson);
    }
  }

  private normalizarUrlImagen(url?: string): string {
    if (!url) {
      return '';
    }

    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
      return url;
    }

      return `${API_BASE_URL}${url.startsWith('/') ? url : `/${url}`}`;
  }

  cargarPublicaciones(): void {
    this.cargando = true;
    this.mensajeError = '';
    this.mensajeExito = '';

    const idUsuario = this.authService.getCurrentUserId();

    if (!idUsuario) {
      this.cargando = false;
      this.mensajeError = 'No se pudo identificar al usuario autenticado. Inicia sesión nuevamente.';
      this.cdr.detectChanges();
      return;
    }

    const consulta$ = this.esAdmin()
      ? this.publicacionService.listar()
      : this.publicacionService.listarPorUsuario(idUsuario);

    consulta$.subscribe({
      next: (publicaciones) => {
        this.todasPublicaciones = (publicaciones ?? []).map((publicacion) => ({
          publicacion,
          materiales: [],
          errorDetalle: '',
        }));

        this.actualizarPaginacion();
        this.cargando = false;

        this.cdr.detectChanges();

        this.cargarMaterialesDePublicaciones();
      },
      error: (error) => {
        this.mensajeError = obtenerMensajeBackend(error);
        this.cargando = false;
        this.cdr.detectChanges();
      },
    });
  }

  private cargarMaterialesDePublicaciones(): void {
    this.todasPublicaciones.forEach((card, index) => {
      if (!card.publicacion.id) {
        return;
      }

      this.publicacionService.obtenerDetalle(card.publicacion.id).subscribe({
        next: (detalle) => {
          const cardActualizada: PublicacionCard = {
            ...card,
            materiales: detalle.materiales ?? [],
            errorDetalle: '',
          };

          this.todasPublicaciones = this.todasPublicaciones.map((item, i) =>
            i === index ? cardActualizada : item,
          );

          this.actualizarPaginacion();
          this.cdr.detectChanges();
        },
        error: () => {
          const cardActualizada: PublicacionCard = {
            ...card,
            materiales: [],
            errorDetalle: 'No se pudieron cargar los materiales.',
          };

          this.todasPublicaciones = this.todasPublicaciones.map((item, i) =>
            i === index ? cardActualizada : item,
          );

          this.actualizarPaginacion();
          this.cdr.detectChanges();
        },
      });
    });
  }

  editar(id: number): void {
    void this.router.navigate(['/publicaciones/editar', id]);
  }

  cancelarRecoleccion(card: PublicacionCard): void {
    if (this.cancelandoId) {
      return;
    }

    if (typeof window !== 'undefined' && !window.confirm('¿Cancelar esta recolección? La publicación quedará inactiva.')) {
      return;
    }

    this.cancelandoId = card.publicacion.id;
    this.mensajeError = '';
    this.mensajeExito = '';

    const publicacionInactiva = { ...card.publicacion, activo: false };

    this.publicacionService.actualizar(card.publicacion.id, publicacionInactiva).subscribe({
      next: () => {
        card.publicacion.activo = false;
        this.mensajeExito = 'Recolección cancelada. La publicación fue marcada como inactiva.';
        this.cancelandoId = null;
      },
      error: (error) => {
        this.mensajeError = obtenerMensajeBackend(error);
        this.cancelandoId = null;
      },
    });
  }

  reactivarPublicacion(card: PublicacionCard): void {
    if (this.cancelandoId) {
      return;
    }

    this.cancelandoId = card.publicacion.id;
    this.mensajeError = '';
    this.mensajeExito = '';

    const publicacionActiva = { ...card.publicacion, activo: true };

    this.publicacionService.actualizar(card.publicacion.id, publicacionActiva).subscribe({
      next: () => {
        card.publicacion.activo = true;
        this.mensajeExito = 'Publicación reactivada correctamente.';
        this.cancelandoId = null;
      },
      error: (error) => {
        this.mensajeError = obtenerMensajeBackend(error);
        this.cancelandoId = null;
      },
    });
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
    this.cdr.detectChanges();

    this.publicacionService.eliminar(card.publicacion.id).subscribe({
      next: () => {
        this.todasPublicaciones = this.todasPublicaciones.filter(
          (item) => item.publicacion.id !== card.publicacion.id,
        );

        this.actualizarPaginacion();

        this.mensajeExito = 'Publicación eliminada correctamente.';
        this.eliminandoId = null;
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.mensajeError = obtenerMensajeBackend(error);
        this.eliminandoId = null;
        this.cdr.detectChanges();
      },
    });
  }

  irAPagina(pagina: number): void {
    if (pagina >= 1 && pagina <= this.totalPaginas) {
      this.paginaActual = pagina;
      this.actualizarPaginacion();
    }
  }

  get paginas(): number[] {
    return Array.from({ length: this.totalPaginas }, (_, i) => i + 1);
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

  private actualizarPaginacion(): void {
    this.totalPaginas = Math.max(1, Math.ceil(this.todasPublicaciones.length / this.elementosPorPagina));

    if (this.paginaActual > this.totalPaginas) {
      this.paginaActual = this.totalPaginas;
    }

    const inicio = (this.paginaActual - 1) * this.elementosPorPagina;
    this.publicaciones = this.todasPublicaciones.slice(inicio, inicio + this.elementosPorPagina);
  }
}
