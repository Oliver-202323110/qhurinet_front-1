import { Routing } from '../../services/routing';
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
import { Publicacion } from '../../models/Publicacion';
import { PublicacionService } from '../../services/publicacionservice';
import { obtenerMensajeBackend } from '../../utils/backend-error';

interface PuntoRuta {
  id: string;
  titulo: string;
  latitud: number;
  longitud: number;
}

@Component({
  selector: 'app-rutasrecojocomponent',
  imports: [CommonModule],
  templateUrl: './rutasrecojocomponent.html',
  styleUrl: './rutasrecojocomponent.css',
})
export class RutasRecojoComponent implements OnInit, AfterViewInit, OnDestroy {
  publicaciones: Publicacion[] = [];
  publicacionSeleccionada: Publicacion | null = null;

  cargando = true;
  mensajeError = '';
  distanciaKm = 0;
  tiempoMin = 0;
  rutaTrazada = false;

  private L?: any;
  private mapa?: any;
  private grupoMarcadores?: any;
  private marcadorOrigen?: any;
  private lineaRuta?: any;

  private origen?: PuntoRuta;

  readonly centroInicial: [number, number] = [-12.0464, -77.0428];

  constructor(
    private readonly publicacionService: PublicacionService,
    private readonly routingService: Routing,
    private readonly cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private readonly platformId: Object,
  ) {}

  ngOnInit(): void {
    this.cargarPublicaciones();
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
    this.marcadorOrigen = undefined;
    this.lineaRuta = undefined;
  }

  cargarPublicaciones(): void {
    this.cargando = true;
    this.mensajeError = '';
    this.cdr.detectChanges();

    this.publicacionService.listarActivas().subscribe({
      next: (publicaciones) => {
        this.publicaciones = publicaciones ?? [];
        this.cargando = false;
        this.cdr.detectChanges();
        this.actualizarMarcadoresMapa();
      },
      error: (error) => {
        this.publicaciones = [];
        this.mensajeError = obtenerMensajeBackend(error);
        this.cargando = false;
        this.cdr.detectChanges();
      },
    });
  }

  usarMiUbicacion(): void {
    if (!isPlatformBrowser(this.platformId) || !navigator.geolocation) {
      this.mensajeError = 'Tu navegador no permite obtener la ubicación actual.';
      this.cdr.detectChanges();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (posicion) => {
        this.fijarOrigen(posicion.coords.latitude, posicion.coords.longitude);
      },
      () => {
        this.mensajeError = 'No se pudo obtener tu ubicación actual. También puedes hacer clic en el mapa.';
        this.cdr.detectChanges();
      },
    );
  }

  trazarRuta(publicacion: Publicacion): void {
    if (!this.origen) {
      this.mensajeError = 'Primero selecciona tu ubicación actual con el botón o haciendo clic en el mapa.';
      this.cdr.detectChanges();
      return;
    }

    if (
      publicacion.latitud === null ||
      publicacion.latitud === undefined ||
      publicacion.longitud === null ||
      publicacion.longitud === undefined
    ) {
      this.mensajeError = 'La publicación seleccionada no tiene coordenadas válidas.';
      this.cdr.detectChanges();
      return;
    }

    const origenLat = this.origen.latitud;
    const origenLng = this.origen.longitud;
    const destinoLat = Number(publicacion.latitud);
    const destinoLng = Number(publicacion.longitud);

    if (
      Number.isNaN(origenLat) ||
      Number.isNaN(origenLng) ||
      Number.isNaN(destinoLat) ||
      Number.isNaN(destinoLng)
    ) {
      this.mensajeError = 'No se pudo calcular la ruta porque hay coordenadas inválidas.';
      this.cdr.detectChanges();
      return;
    }

    this.publicacionSeleccionada = publicacion;
    this.rutaTrazada = false;
    this.distanciaKm = 0;
    this.tiempoMin = 0;
    this.mensajeError = '';
    this.cdr.detectChanges();

    this.routingService.getRoute(origenLat, origenLng, destinoLat, destinoLng).subscribe({
      next: (data) => {
        const ruta = data?.routes?.[0];

        if (!ruta?.geometry?.coordinates?.length) {
          this.mensajeError = 'No se pudo obtener una ruta por calles para este punto.';
          this.cdr.detectChanges();
          return;
        }

        const coordinates = ruta.geometry.coordinates;

        const routePoints = coordinates.map((pair: number[]) => {
          return [pair[1], pair[0]];
        });

        this.lineaRuta?.remove();

        this.lineaRuta = this.L.polyline(routePoints, {
          color: '#2A5C43',
          weight: 6,
          opacity: 0.85,
        }).addTo(this.mapa);

        this.distanciaKm = Number(((ruta.distance ?? 0) / 1000).toFixed(2));
        this.tiempoMin = Math.round((ruta.duration ?? 0) / 60);
        this.rutaTrazada = true;

        this.mapa.fitBounds(routePoints, {
          padding: [40, 40],
        });

        this.cdr.detectChanges();
      },
      error: () => {
        this.mensajeError = 'No se pudo trazar la ruta por calles. Verifica conexión o servicio de rutas.';
        this.rutaTrazada = false;
        this.cdr.detectChanges();
      },
    });
  }

  limpiarRuta(): void {
    this.publicacionSeleccionada = null;
    this.distanciaKm = 0;
    this.rutaTrazada = false;
    this.lineaRuta?.remove();
    this.lineaRuta = undefined;
    this.cdr.detectChanges();
  }

  private async inicializarMapa(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const contenedorMapa = document.getElementById('mapa-rutas-recojo');

    if (!contenedorMapa || this.mapa) {
      return;
    }

    this.L = await import('leaflet');
    const L = this.L;

    this.mapa = L.map(contenedorMapa).setView(this.centroInicial, 12);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(this.mapa);

    this.grupoMarcadores = L.layerGroup().addTo(this.mapa);

    this.mapa.on('click', (event: any) => {
      this.fijarOrigen(event.latlng.lat, event.latlng.lng);
    });

    this.mapa.on('popupopen', (event: any) => {
      const boton = event.popup
        .getElement()
        ?.querySelector('.route-popup-button') as HTMLButtonElement | null;

      if (!boton) {
        return;
      }

      boton.addEventListener('click', () => {
        const id = Number(boton.dataset['publicacionId']);
        const publicacion = this.publicaciones.find((item) => item.id === id);

        if (publicacion) {
          this.trazarRuta(publicacion);
          this.mapa?.closePopup();
        }
      });
    });

    setTimeout(() => {
      this.mapa?.invalidateSize();
      this.actualizarMarcadoresMapa();
    }, 300);
  }

  private fijarOrigen(latitud: number, longitud: number): void {
    if (!this.mapa || !this.L) {
      return;
    }

    const lat = Number(latitud.toFixed(6));
    const lng = Number(longitud.toFixed(6));

    this.origen = {
      id: 'origen',
      titulo: 'Mi ubicación',
      latitud: lat,
      longitud: lng,
    };

    const posicion: [number, number] = [lat, lng];

    if (!this.marcadorOrigen) {
      this.marcadorOrigen = this.L.marker(posicion, {
        draggable: true,
        icon: this.crearIconoOrigen(),
      }).addTo(this.mapa);

      this.marcadorOrigen.bindPopup('<strong>Mi ubicación actual</strong>');

      this.marcadorOrigen.on('dragend', () => {
        const nuevaPosicion = this.marcadorOrigen?.getLatLng();

        if (nuevaPosicion) {
          this.fijarOrigen(nuevaPosicion.lat, nuevaPosicion.lng);
        }
      });
    } else {
      this.marcadorOrigen.setLatLng(posicion);
    }

    this.mapa.setView(posicion, this.mapa.getZoom());
    this.cdr.detectChanges();
  }

  private actualizarMarcadoresMapa(): void {
    if (!this.mapa || !this.L || !this.grupoMarcadores) {
      return;
    }

    this.grupoMarcadores.clearLayers();

    const publicacionesConUbicacion = this.publicaciones.filter((publicacion) => {
      return publicacion.latitud !== null &&
        publicacion.latitud !== undefined &&
        publicacion.longitud !== null &&
        publicacion.longitud !== undefined;
    });

    const bounds: any[] = [];

    publicacionesConUbicacion.forEach((publicacion) => {
      const latitud = Number(publicacion.latitud);
      const longitud = Number(publicacion.longitud);

      if (Number.isNaN(latitud) || Number.isNaN(longitud)) {
        return;
      }

      const marcador = this.L.marker([latitud, longitud], {
        icon: this.crearIconoPublicacion(),
      });

      marcador.bindPopup(`
        <strong>${this.escaparHtml(publicacion.titulo || 'Publicación')}</strong><br>
        ${this.escaparHtml(publicacion.direccion || 'Sin dirección')}<br>
        <small>${this.escaparHtml(publicacion.material || 'Material no especificado')}</small><br>
        <button
          type="button"
          class="route-popup-button"
          data-publicacion-id="${publicacion.id}"
        >
          Trazar ruta
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
    return this.L.divIcon({
      className: 'qhurinet-publicacion-marker',
      html: '<span>Q</span>',
      iconSize: [36, 36],
      iconAnchor: [18, 18],
      popupAnchor: [0, -18],
    });
  }

  private crearIconoOrigen(): any {
    return this.L.divIcon({
      className: 'qhurinet-origen-marker',
      html: '<span>R</span>',
      iconSize: [36, 36],
      iconAnchor: [18, 18],
      popupAnchor: [0, -18],
    });
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