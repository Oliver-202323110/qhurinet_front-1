import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  Inject,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
} from '@angular/core';
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
export class PublicacionExplore implements OnInit, AfterViewInit, OnDestroy {
  todasPublicaciones: Publicacion[] = [];
  publicacionesFiltradas: Publicacion[] = [];
  publicaciones: Publicacion[] = [];
  categorias: string[] = [];
  cargando = true;
  mensajeError = '';
  texto = '';
  categoriaSeleccionada = '';
  publicacionSeleccionada: Publicacion | null = null;
  materialesDetalle: any[] = [];
  detalleVisible = false;
  detalleCargando = false;
  detalleError = '';
  paginaActual = 1;
  elementosPorPagina = 6;
  totalPaginas = 1;
  private L?: any;
  private mapa?: any;
  private grupoMarcadores?: any;

  readonly centroInicial: [number, number] = [-12.0464, -77.0428];

  constructor(
    private readonly publicacionService: PublicacionService,
    private readonly materialService: MaterialService,
    private readonly cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private readonly platformId: Object,
  ) {}

  ngOnInit(): void {
    this.materialService.obtenerCategorias().subscribe({
      next: (categorias) => (this.categorias = categorias),
    });
    this.cargarActivas();
  }

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    setTimeout(() => {
      void this.inicializarMapa();
    }, 0);
  }

  ngOnDestroy(): void {
    this.mapa?.remove();
    this.mapa = undefined;
    this.grupoMarcadores = undefined;
  }

  private async inicializarMapa(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const contenedorMapa = document.getElementById('mapa-explorar-publicaciones');

    if (!contenedorMapa || this.mapa) {
      return;
    }

    const leafletModule = await import('leaflet');
    const L = (leafletModule as any).default ?? leafletModule;
    this.L = L;

    this.mapa = L.map(contenedorMapa).setView(this.centroInicial, 12);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(this.mapa);

    this.grupoMarcadores = L.layerGroup().addTo(this.mapa);

    this.mapa.on('popupopen', (event: any) => {
    const boton = event.popup
      .getElement()
      ?.querySelector('.popup-detail-button') as HTMLButtonElement | null;

    if (!boton) {
      return;
    }

    boton.addEventListener('click', () => {
      const id = Number(boton.dataset['publicacionId']);

      if (!Number.isNaN(id)) {
        this.abrirDetalleMapa(id);
        this.mapa?.closePopup();
      }
    });
  });

    setTimeout(() => {
      this.mapa?.invalidateSize();
      this.actualizarMarcadoresMapa();
    }, 300);
  }

  private actualizarMarcadoresMapa(): void {
    if (!this.mapa || !this.L || !this.grupoMarcadores) {
      return;
    }

    const L = this.L;

    this.grupoMarcadores.clearLayers();

    const publicacionesConUbicacion = this.publicacionesFiltradas.filter((publicacion) => {
      return publicacion.latitud !== null &&
        publicacion.latitud !== undefined &&
        publicacion.longitud !== null &&
        publicacion.longitud !== undefined;
    });

    if (publicacionesConUbicacion.length === 0) {
      return;
    }

    const bounds: any[] = [];

    publicacionesConUbicacion.forEach((publicacion) => {
      const latitud = Number(publicacion.latitud);
      const longitud = Number(publicacion.longitud);

      if (Number.isNaN(latitud) || Number.isNaN(longitud)) {
        return;
      }

      const marcador = L.marker([latitud, longitud], {
        icon: this.crearIconoPublicacion(),
      });

      marcador.bindPopup(`
      <strong>${this.escaparHtml(publicacion.titulo || 'Publicación')}</strong><br>
      ${this.escaparHtml(publicacion.direccion || 'Sin dirección')}<br>
      <small>${this.escaparHtml(publicacion.material || 'Material no especificado')}</small><br>
      <button
        type="button"
        class="popup-detail-button"
        data-publicacion-id="${publicacion.id}"
      >
        Ver detalle
      </button>
    `);

      marcador.addTo(this.grupoMarcadores);
      bounds.push([latitud, longitud]);
    });

    if (bounds.length === 1) {
      this.mapa.setView(bounds[0], 15);
    }

    if (bounds.length > 1) {
      this.mapa.fitBounds(bounds, {
        padding: [40, 40],
      });
    }

    this.cdr.detectChanges();
  }

  private crearIconoPublicacion(): any {
    if (!this.L) {
      return undefined;
    }

    return this.L.divIcon({
      className: 'qhurinet-publicacion-marker',
      html: '<span>Q</span>',
      iconSize: [36, 36],
      iconAnchor: [18, 18],
      popupAnchor: [0, -18],
    });
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
        this.todasPublicaciones = publicaciones ?? [];
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
      this.actualizarMarcadoresMapa();
      return;
    }

    if (texto) {
      this.cargando = true;
      this.publicacionService.buscar(texto).subscribe({
        next: (publicaciones) => {
          this.todasPublicaciones = publicaciones ?? [];
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
    let filtradas = [...this.todasPublicaciones];

    if (this.categoriaSeleccionada) {
      filtradas = filtradas.filter(
        (p) =>
          (p.categoria ?? '').toLowerCase() === this.categoriaSeleccionada.toLowerCase(),
      );
    }

    this.publicacionesFiltradas = filtradas;

    this.totalPaginas = Math.max(1, Math.ceil(filtradas.length / this.elementosPorPagina));

    if (this.paginaActual > this.totalPaginas) {
      this.paginaActual = 1;
    }

    const inicio = (this.paginaActual - 1) * this.elementosPorPagina;
    this.publicaciones = filtradas.slice(inicio, inicio + this.elementosPorPagina);

    this.actualizarMarcadoresMapa();
    this.cdr.detectChanges();
  }

  private paginar(): void {
    this.aplicarFiltros();
  }

  abrirDetalleMapa(idPublicacion: number): void {
    const publicacion = this.todasPublicaciones.find((item) => item.id === idPublicacion);

    if (!publicacion) {
      this.detalleError = 'No se encontró la publicación seleccionada.';
      this.detalleVisible = true;
      this.cdr.detectChanges();
      return;
    }

    this.publicacionSeleccionada = publicacion;
    this.materialesDetalle = [];
    this.detalleVisible = true;
    this.detalleCargando = true;
    this.detalleError = '';
    this.cdr.detectChanges();

    this.publicacionService.obtenerDetalle(idPublicacion).subscribe({
      next: (detalle) => {
        this.materialesDetalle = detalle.materiales ?? [];
        this.detalleCargando = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.detalleError = obtenerMensajeBackend(error);
        this.detalleCargando = false;
        this.cdr.detectChanges();
      },
    });
  }

  cerrarDetalleMapa(): void {
    this.detalleVisible = false;
    this.publicacionSeleccionada = null;
    this.materialesDetalle = [];
    this.detalleError = '';
    this.detalleCargando = false;
    this.cdr.detectChanges();
  }

  private escaparHtml(valor: string): string {
    return valor
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }
}
