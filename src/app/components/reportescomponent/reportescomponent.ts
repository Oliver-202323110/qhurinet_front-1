import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/authservice';
import {
  HistorialMaterialUsuario,
  ReporteGlobal,
  ReporteMaterialCategoria,
  ReporteService,
  ReporteUsuario,
} from '../../services/reporteservice';
import { obtenerMensajeBackend } from '../../utils/backend-error';

@Component({
  selector: 'app-reportescomponent',
  imports: [CommonModule, FormsModule],
  templateUrl: './reportescomponent.html',
  styleUrl: './reportescomponent.css',
})
export class Reportescomponent implements OnInit {
  cargando = true;
  mensajeError = '';

  globales?: ReporteGlobal;
  reporteUsuario?: ReporteUsuario;
  materiales: ReporteMaterialCategoria[] = [];
  historialMateriales: HistorialMaterialUsuario[] = [];
  historialActividades: any[] = [];
  historialPuntos: any[] = [];

  filtroEstado = '';
  filtroMaterial = '';
  filtroFechaInicio = '';
  filtroFechaFin = '';

  constructor(
    private readonly reporteService: ReporteService,
    private readonly authService: AuthService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.cargar();
  }

  get esAdmin(): boolean {
    return this.authService.tieneRol(['ADMIN']);
  }

  cargar(): void {
    const idUsuario = this.authService.getCurrentUserId();

    if (!idUsuario) {
      this.cargando = false;
      this.mensajeError = 'No se pudo identificar al usuario autenticado.';
      this.cdr.detectChanges();
      return;
    }

    this.cargando = true;
    this.mensajeError = '';
    this.cdr.detectChanges();

    this.cargarReporteUsuario(idUsuario);
    this.cargarMateriales();
    this.cargarHistorialMateriales(idUsuario);
    this.cargarHistorialActividades(idUsuario);
    this.cargarHistorialPuntos(idUsuario);

    if (this.esAdmin) {
      this.cargarGlobales();
    }
  }

  cargarGlobales(): void {
    this.reporteService.globales().subscribe({
      next: (data) => {
        this.globales = data;
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.mensajeError = obtenerMensajeBackend(error);
        this.cdr.detectChanges();
      },
    });
  }

  cargarReporteUsuario(idUsuario: number): void {
    this.reporteService.reporteUsuario(idUsuario).subscribe({
      next: (data) => {
        this.reporteUsuario = data;
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

  cargarMateriales(): void {
    this.reporteService.materialesReciclados().subscribe({
      next: (data) => {
        this.materiales = data;
        this.cdr.detectChanges();
      },
      error: () => {
        this.materiales = [];
        this.cdr.detectChanges();
      },
    });
  }

  cargarHistorialMateriales(idUsuario: number): void {
    this.reporteService.historialMaterialesUsuario(idUsuario).subscribe({
      next: (data) => {
        this.historialMateriales = data;
        this.cdr.detectChanges();
      },
      error: () => {
        this.historialMateriales = [];
        this.cdr.detectChanges();
      },
    });
  }

  cargarHistorialActividades(idUsuario: number): void {
    this.reporteService
      .historialActividades({
        idUsuario,
        fechaInicio: this.filtroFechaInicio ? `${this.filtroFechaInicio}T00:00:00` : '',
        fechaFin: this.filtroFechaFin ? `${this.filtroFechaFin}T23:59:59` : '',
        estado: this.filtroEstado,
        material: this.filtroMaterial,
      })
      .subscribe({
        next: (data) => {
          this.historialActividades = data;
          this.cdr.detectChanges();
        },
        error: () => {
          this.historialActividades = [];
          this.cdr.detectChanges();
        },
      });
  }

  cargarHistorialPuntos(idUsuario: number): void {
    this.reporteService.historialPuntos(idUsuario).subscribe({
      next: (data) => {
        this.historialPuntos = data;
        this.cdr.detectChanges();
      },
      error: () => {
        this.historialPuntos = [];
        this.cdr.detectChanges();
      },
    });
  }

  aplicarFiltros(): void {
    const idUsuario = this.authService.getCurrentUserId();

    if (!idUsuario) {
      return;
    }

    this.cargarHistorialActividades(idUsuario);
  }

  limpiarFiltros(): void {
    this.filtroEstado = '';
    this.filtroMaterial = '';
    this.filtroFechaInicio = '';
    this.filtroFechaFin = '';
    this.aplicarFiltros();
  }

  formatearFecha(fecha: string): string {
    if (!fecha) {
      return '-';
    }

    const date = new Date(fecha);

    if (Number.isNaN(date.getTime())) {
      return '-';
    }

    return new Intl.DateTimeFormat('es-PE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(date);
  }

  get maxKgMateriales(): number {
  const valores = this.materiales.map((item) => Number(item.cantidadKg) || 0);
  return Math.max(...valores, 1);
}

  porcentajeKg(cantidadKg: number): number {
    const valor = Number(cantidadKg) || 0;
    return Math.round((valor / this.maxKgMateriales) * 100);
  }

  get actividadUsuarioGrafico(): { nombre: string; valor: number }[] {
    if (!this.reporteUsuario) {
      return [];
    }

    return [
      {
        nombre: 'Publicaciones',
        valor: this.reporteUsuario.publicaciones ?? 0,
      },
      {
        nombre: 'Recolecciones',
        valor: this.reporteUsuario.recolecciones ?? 0,
      },
      {
        nombre: 'Puntos movidos',
        valor: this.reporteUsuario.puntosMovidos ?? 0,
      },
      {
        nombre: 'Materiales',
        valor: this.historialMateriales.length,
      },
    ];
  }

  get maxActividadUsuario(): number {
    const valores = this.actividadUsuarioGrafico.map((item) => item.valor);
    return Math.max(...valores, 1);
  }

  porcentajeActividad(valor: number): number {
    return Math.round((valor / this.maxActividadUsuario) * 100);
  }
}
