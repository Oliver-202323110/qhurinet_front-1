import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { RouterLink } from '@angular/router';
import { isPlatformBrowser } from '@angular/common'; // Para verificar si estamos en el navegador
import { Routing } from '../../services/routing';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './landingcomponent.html',
  styleUrl: './landingcomponent.css',
})
export class LandingComponent implements OnInit {
  private map: any; // Cambiado a any para evitar problemas de tipado antes del import dinámico
  private isBrowser: boolean;

  // Ubicaciones fijadas en el distrito de Mala
  private puntoRecojo = { lat: -12.6578, lng: -76.6305 }; 
  private plantaReciclaje = { lat: -12.6642, lng: -76.6238 }; 

  // Inyectamos el PLATFORM_ID para detectar el entorno
  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private routingService: Routing
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit(): void {
    // Si estamos en el Servidor (SSR), detenemos la ejecución para que no falle
    if (!this.isBrowser) return;

    // Si estamos en el Navegador, cargamos Leaflet de forma segura e iniciamos
    this.loadLeafletAndMap();
  }

  private async loadLeafletAndMap(): Promise<void> {
    // Importación dinámica: Leaflet solo se descargará en el cliente
    const leafletModule = await import('leaflet');
    const L = (leafletModule as any).default ?? leafletModule;

    // 1. Inicializar el mapa
    this.map = L.map('map-id').setView([this.puntoRecojo.lat, this.puntoRecojo.lng], 14);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(this.map);

    // 2. Añadir marcadores
    L.marker([this.puntoRecojo.lat, this.puntoRecojo.lng]).addTo(this.map)
      .bindPopup('<b>Solicitud de Recojo</b><br>Material: Plástico PET y Cartón.')
      .openPopup();

    L.marker([this.plantaReciclaje.lat, this.plantaReciclaje.lng]).addTo(this.map)
      .bindPopup('<b>Planta de Destino QhuriNet</b><br>Procesamiento Ecológico.');

    // 3. Trazar la ruta consumiendo tu servicio
    this.routingService.getRoute(
      this.puntoRecojo.lat, this.puntoRecojo.lng, 
      this.plantaReciclaje.lat, this.plantaReciclaje.lng
    ).subscribe({
      next: (data) => {
        const coordinates = data.routes[0].geometry.coordinates;
        const routePoints = coordinates.map((pair: number[]) => [pair[1], pair[0]]);

        // Dibujamos la línea con el estilo verde de QhuriNet
        L.polyline(routePoints as any, { color: '#2A5C43', weight: 6, opacity: 0.8 }).addTo(this.map);
      },
      error: (err) => {
        console.error('Error al trazar la ruta de simulación:', err);
      }
    });
  }
}
