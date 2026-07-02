import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Publicacion } from '../../../models/Publicacion';
import { MaterialService } from '../../../services/materialservice';
import { PublicacionService } from '../../../services/publicacionservice';
import { obtenerMensajeBackend } from '../../../utils/backend-error';
import { API_BASE_URL } from '../../../config/api.config';

@Component({
  selector: 'app-publicacion-explore',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './publicacion-explore.html',
  styleUrl: './publicacion-explore.css',
})
export class PublicacionExplore implements OnInit {
  todasPublicaciones: Publicacion[] = [];
  publicaciones: Publicacion[] = [];
  categorias: string[] = [];
  cargando = true;
  mensajeError = '';
  texto = '';
  categoriaSeleccionada = '';

  paginaActual = 1;
  elementosPorPagina = 6;
  totalPaginas = 1;

  constructor(
    private readonly publicacionService: PublicacionService,
    private readonly materialService: MaterialService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.materialService.obtenerCategorias().subscribe({
      next: (categorias) => (this.categorias = categorias),
    });
    this.cargarActivas();
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

  cargarActivas(): void {
    this.cargando = true;
    this.mensajeError = '';
    this.publicacionService.listarActivas().subscribe({
      next: (publicaciones) => {
        this.todasPublicaciones = publicaciones;
        this.aplicarFiltros();
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

  buscar(): void {
    const texto = this.texto.trim();

    if (!texto && !this.categoriaSeleccionada) {
      this.cargarActivas();
      return;
    }

    if (texto) {
      this.cargando = true;
      this.publicacionService.buscar(texto).subscribe({
        next: (publicaciones) => {
          this.todasPublicaciones = publicaciones;
          this.aplicarFiltros();
          this.cargando = false;
        },
        error: (error) => {
          this.mensajeError = obtenerMensajeBackend(error);
          this.cargando = false;
        },
      });
    } else {
      this.aplicarFiltros();
    }
  }

  filtrarPorCategoria(): void {
    this.paginaActual = 1;
    if (this.texto.trim()) {
      this.buscar();
    } else {
      this.aplicarFiltros();
    }
  }

  limpiar(): void {
    this.texto = '';
    this.categoriaSeleccionada = '';
    this.paginaActual = 1;
    this.cargarActivas();
  }

  irAPagina(pagina: number): void {
    if (pagina >= 1 && pagina <= this.totalPaginas) {
      this.paginaActual = pagina;
      this.paginar();
    }
  }

  get paginas(): number[] {
    return Array.from({ length: this.totalPaginas }, (_, i) => i + 1);
  }

  private aplicarFiltros(): void {
    let filtradas = this.todasPublicaciones;

    if (this.categoriaSeleccionada) {
      filtradas = filtradas.filter(
        (p) => p.categoria.toLowerCase() === this.categoriaSeleccionada.toLowerCase(),
      );
    }

    this.todasPublicaciones = this.todasPublicaciones;
    this.totalPaginas = Math.max(1, Math.ceil(filtradas.length / this.elementosPorPagina));

    if (this.paginaActual > this.totalPaginas) {
      this.paginaActual = 1;
    }

    const inicio = (this.paginaActual - 1) * this.elementosPorPagina;
    this.publicaciones = filtradas.slice(inicio, inicio + this.elementosPorPagina);
  }

  private paginar(): void {
    this.aplicarFiltros();
  }
}
