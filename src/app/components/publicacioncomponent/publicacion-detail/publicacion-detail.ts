import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PublicacionDetalle } from '../../../models/PublicacionDetalle';
import { AuthService } from '../../../services/authservice';
import { PublicacionService } from '../../../services/publicacionservice';
import { obtenerMensajeBackend } from '../../../utils/backend-error';

@Component({
  selector: 'app-publicacion-detail',
  imports: [CommonModule, RouterLink],
  templateUrl: './publicacion-detail.html',
  styleUrl: './publicacion-detail.css',
})
export class PublicacionDetail implements OnInit {
  detalle: PublicacionDetalle | null = null;
  cargando = true;
  mensajeError = '';

  constructor(
    private readonly route: ActivatedRoute,
    private readonly publicacionService: PublicacionService,
    public readonly authService: AuthService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.publicacionService.obtenerDetalle(id).subscribe({
      next: (detalle) => {
        this.detalle = detalle;
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

  puedeEditar(): boolean {
    const idUsuario = this.authService.getCurrentUserId();
    return Boolean(this.detalle && (this.authService.isAdmin() || this.detalle.publicacion.idUsuario === idUsuario));
  }

  get totalPuntos(): number {
    if (!this.detalle) {
      return 0;
    }
    return this.detalle.materiales.reduce((sum, m) => sum + m.puntosEstimados, 0);
  }

  estrellas(promedio: number): string {
    const llenas = Math.round(promedio);
    return '★'.repeat(llenas) + '☆'.repeat(5 - llenas);
  }
}
