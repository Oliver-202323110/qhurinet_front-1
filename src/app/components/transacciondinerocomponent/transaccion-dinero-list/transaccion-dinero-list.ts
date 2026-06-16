import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TransaccionDinero } from '../../../models/TransaccionDinero';
import { AuthService } from '../../../services/authservice';
import { TransaccionDineroService } from '../../../services/transacciondineroservice';
import { obtenerMensajeBackend } from '../../../utils/backend-error';

@Component({
  selector: 'app-transaccion-dinero-list',
  imports: [CommonModule, FormsModule, CurrencyPipe, DatePipe],
  templateUrl: './transaccion-dinero-list.html',
  styleUrl: './transaccion-dinero-list.css',
})
export class TransaccionDineroListComponent implements OnInit {
  cargando = true;
  mensajeError = '';
  transacciones: TransaccionDinero[] = [];
  seleccionado: TransaccionDinero | null = null;
  filtroEstado = '';

  constructor(
    private readonly transaccionService: TransaccionDineroService,
    public readonly authService: AuthService,
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

    const request$ = this.authService.isAdmin()
      ? this.transaccionService.listar()
      : this.transaccionService.listarPorUsuario(idUsuario);

    request$.subscribe({
      next: (transacciones) => {
        this.transacciones = transacciones;
        this.cargando = false;
      },
      error: (error) => {
        this.mensajeError = obtenerMensajeBackend(error);
        this.cargando = false;
      },
    });
  }

  get filtradas(): TransaccionDinero[] {
    if (!this.filtroEstado) {
      return this.transacciones;
    }

    return this.transacciones.filter((item) => item.estado?.toLowerCase() === this.filtroEstado);
  }

  metodoSeguro(transaccion: TransaccionDinero): string {
    return transaccion.metodoPagoTipo || 'No registrado';
  }
}
