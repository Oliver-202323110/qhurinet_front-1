import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { Incentivo, UsuarioIncentivo, ValorPuntosAccion } from '../../../models/Incentivo';
import { AuthService } from '../../../services/authservice';
import { IncentivoService } from '../../../services/incentivoservice';
import { obtenerMensajeBackend } from '../../../utils/backend-error';

interface NotificacionIncentivo {
  titulo: string;
  detalle: string;
}

@Component({
  selector: 'app-incentivo-list',
  imports: [CommonModule, FormsModule],
  templateUrl: './incentivo-list.html',
  styleUrl: './incentivo-list.css',
})
export class IncentivoListComponent implements OnInit {
  incentivos: Incentivo[] = [];
  historial: UsuarioIncentivo[] = [];
  valoresPuntos: ValorPuntosAccion[] = [];
  seleccionado: Incentivo | null = null;
  filtro = '';
  cargando = true;
  procesandoId: number | null = null;
  mensajeError = '';
  mensajeExito = '';

  private readonly valoresPuntosBase: ValorPuntosAccion[] = [
    {
      accion: 'Publicar material reciclable',
      descripcion: 'Registro de material disponible para recoleccion.',
      puntos: 10,
    },
    {
      accion: 'Completar una recoleccion',
      descripcion: 'Entrega validada por el recolector o punto aliado.',
      puntos: 25,
    },
    {
      accion: 'Desafio diario',
      descripcion: 'Actividad de reciclaje completada dentro del dia.',
      puntos: 15,
    },
    {
      accion: 'Documento verificado',
      descripcion: 'Cuenta con documentacion aprobada por administracion.',
      puntos: 40,
    },
  ];

  constructor(
    private readonly incentivoService: IncentivoService,
    private readonly authService: AuthService,
  ) {}

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    const idUsuario = this.authService.getCurrentUserId();
    this.mensajeError = '';
    this.mensajeExito = '';

    if (!idUsuario) {
      this.mensajeError = 'No se pudo identificar al usuario autenticado.';
      this.cargando = false;
      return;
    }

    this.cargando = true;
    forkJoin({
      incentivos: this.incentivoService.listarActivos(),
      historial: this.incentivoService.listarPorUsuario(idUsuario),
      valoresPuntos: this.incentivoService.listarValorPuntos(),
    }).subscribe({
      next: ({ incentivos, historial, valoresPuntos }) => {
        this.incentivos = incentivos;
        this.historial = historial;
        this.valoresPuntos = valoresPuntos.length ? valoresPuntos : this.valoresPuntosBase;
        this.cargando = false;
      },
      error: (error) => {
        this.mensajeError = obtenerMensajeBackend(error);
        this.valoresPuntos = this.valoresPuntosBase;
        this.cargando = false;
      },
    });
  }

  get puntosUsuario(): number {
    return this.authService.getCurrentUserPoints();
  }

  get incentivosFiltrados(): Incentivo[] {
    const busqueda = this.filtro.trim().toLowerCase();

    if (!busqueda) {
      return this.incentivos;
    }

    return this.incentivos.filter((incentivo) =>
      [incentivo.nombre, incentivo.descripcion, incentivo.tipo].some((valor) =>
        valor?.toLowerCase().includes(busqueda),
      ),
    );
  }

  get totalCanjeados(): number {
    return this.historial.length;
  }

  get desafiosDisponibles(): number {
    return this.incentivos.filter((incentivo) => incentivo.tipo?.toLowerCase().includes('desafio')).length;
  }

  get notificaciones(): NotificacionIncentivo[] {
    const recordatorios = this.incentivos
      .filter((incentivo) => this.puedeCanjear(incentivo))
      .slice(0, 2)
      .map((incentivo) => ({
        titulo: 'Recompensa disponible',
        detalle: `${incentivo.nombre} puede canjearse con tus puntos actuales.`,
      }));

    const logros = this.historial.slice(0, 2).map((item) => ({
      titulo: 'Canje registrado',
      detalle: `${item.incentivoNombre} se encuentra en estado ${item.estado}.`,
    }));

    return [...recordatorios, ...logros];
  }

  puedeCanjear(incentivo: Incentivo): boolean {
    return incentivo.activo && this.stockDisponible(incentivo) && this.puntosUsuario >= (incentivo.costoPuntos ?? 0);
  }

  estadoIncentivo(incentivo: Incentivo): string {
    if (!incentivo.activo || !this.stockDisponible(incentivo)) {
      return 'no disponible';
    }

    if (this.historial.some((item) => item.idIncentivo === incentivo.id)) {
      return 'canjeado';
    }

    return this.puedeCanjear(incentivo) ? 'disponible' : 'bloqueado';
  }

  estadoClase(incentivo: Incentivo): string {
    const estado = this.estadoIncentivo(incentivo);

    if (estado === 'disponible') {
      return 'success';
    }

    if (estado === 'canjeado') {
      return 'warning';
    }

    return 'inactive';
  }

  canjear(incentivo: Incentivo): void {
    const idUsuario = this.authService.getCurrentUserId();
    this.mensajeError = '';
    this.mensajeExito = '';

    if (!idUsuario) {
      this.mensajeError = 'No se pudo identificar al usuario autenticado.';
      return;
    }

    if (!this.puedeCanjear(incentivo)) {
      this.mensajeError = 'No tienes puntos suficientes o el incentivo no esta disponible.';
      return;
    }

    if (typeof window !== 'undefined' && !window.confirm(`Canjear ${incentivo.costoPuntos} puntos por ${incentivo.nombre}?`)) {
      return;
    }

    this.procesandoId = incentivo.id;
    this.incentivoService.canjear({ idUsuario, idIncentivo: incentivo.id }).subscribe({
      next: () => {
        this.procesandoId = null;
        this.mensajeExito = 'Incentivo canjeado correctamente.';
        this.cargar();
      },
      error: (error) => {
        this.procesandoId = null;
        this.mensajeError = obtenerMensajeBackend(error);
      },
    });
  }

  formatearFecha(fecha?: string): string {
    if (!fecha) {
      return 'Sin fecha';
    }

    const date = new Date(fecha);

    if (Number.isNaN(date.getTime())) {
      return 'Sin fecha';
    }

    return new Intl.DateTimeFormat('es-PE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(date);
  }

  trackById(_: number, item: Incentivo | UsuarioIncentivo | ValorPuntosAccion): number | string {
    return 'id' in item ? item.id : item.accion;
  }

  private stockDisponible(incentivo: Incentivo): boolean {
    return (incentivo.stock ?? 1) > 0;
  }
}
