import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin, of, catchError, map, switchMap } from 'rxjs';
import { Material } from '../../models/Material';
import { Publicacion } from '../../models/Publicacion';
import { MaterialDetalle, PublicacionDetalle } from '../../models/PublicacionDetalle';
import { AuthService } from '../../services/authservice';
import { MaterialService } from '../../services/materialservice';
import { PublicacionService } from '../../services/publicacionservice';
import { obtenerMensajeBackend } from '../../utils/backend-error';

interface PublicacionConMateriales {
  publicacion: Publicacion;
  materiales: MaterialDetalle[];
}

@Component({
  selector: 'app-publicacionmaterialcomponent',
  imports: [CommonModule, FormsModule],
  templateUrl: './publicacionmaterialcomponent.html',
  styleUrl: './publicacionmaterialcomponent.css',
})
export class Publicacionmaterialcomponent implements OnInit {
  materiales: Material[] = [];
  publicaciones: PublicacionConMateriales[] = [];
  categorias: string[] = [];
  categoriaFiltro = '';
  cargandoMateriales = true;
  cargandoPublicaciones = true;
  mensajeError = '';
  mensajeExito = '';

  mostrarFormulario = false;
  editandoMaterial: Material | null = null;
  guardando = false;
  eliminandoId: number | null = null;

  nuevoMaterial: Material = new Material();

  constructor(
    private readonly materialService: MaterialService,
    private readonly publicacionService: PublicacionService,
    private readonly authService: AuthService,
  ) {}

  ngOnInit(): void {
    this.cargarMateriales();
    this.cargarPublicaciones();
  }

  get materialesFiltrados(): Material[] {
    if (!this.categoriaFiltro) {
      return this.materiales;
    }
    return this.materiales.filter(
      (m) => m.categoria.toLowerCase() === this.categoriaFiltro.toLowerCase(),
    );
  }

  esAdmin(): boolean {
    return this.authService.isAdmin();
  }

  abrirFormularioNuevo(): void {
    this.nuevoMaterial = new Material();
    this.editandoMaterial = null;
    this.mostrarFormulario = true;
    this.mensajeError = '';
    this.mensajeExito = '';
  }

  abrirFormularioEditar(material: Material): void {
    this.nuevoMaterial = { ...material };
    this.editandoMaterial = material;
    this.mostrarFormulario = true;
    this.mensajeError = '';
    this.mensajeExito = '';
  }

  cancelarFormulario(): void {
    this.mostrarFormulario = false;
    this.editandoMaterial = null;
    this.nuevoMaterial = new Material();
  }

  guardarMaterial(): void {
    if (!this.nuevoMaterial.nombre.trim() || !this.nuevoMaterial.categoria.trim()) {
      this.mensajeError = 'Nombre y categoría son obligatorios.';
      return;
    }

    if (this.nuevoMaterial.puntosPorKg < 0) {
      this.mensajeError = 'Los puntos por kg deben ser mayor o igual a 0.';
      return;
    }

    this.guardando = true;
    this.mensajeError = '';
    this.mensajeExito = '';

    if (this.editandoMaterial) {
      this.materialService.actualizar(this.editandoMaterial.id, this.nuevoMaterial).subscribe({
        next: () => {
          this.mensajeExito = `Material "${this.nuevoMaterial.nombre}" actualizado correctamente.`;
          this.guardando = false;
          this.cancelarFormulario();
          this.cargarMateriales();
        },
        error: (error) => {
          this.mensajeError = obtenerMensajeBackend(error);
          this.guardando = false;
        },
      });
    } else {
      this.materialService.crear(this.nuevoMaterial).subscribe({
        next: () => {
          this.mensajeExito = `Material "${this.nuevoMaterial.nombre}" creado correctamente.`;
          this.guardando = false;
          this.cancelarFormulario();
          this.cargarMateriales();
        },
        error: (error) => {
          this.mensajeError = obtenerMensajeBackend(error);
          this.guardando = false;
        },
      });
    }
  }

  eliminarMaterial(material: Material): void {
    if (typeof window !== 'undefined' && !window.confirm(`¿Eliminar el material "${material.nombre}"?`)) {
      return;
    }

    this.eliminandoId = material.id;
    this.mensajeError = '';
    this.mensajeExito = '';

    this.materialService.eliminar(material.id).subscribe({
      next: () => {
        this.mensajeExito = `Material "${material.nombre}" eliminado.`;
        this.eliminandoId = null;
        this.cargarMateriales();
      },
      error: (error) => {
        this.mensajeError = obtenerMensajeBackend(error);
        this.eliminandoId = null;
      },
    });
  }

  totalPuntosPublicacion(materiales: MaterialDetalle[]): number {
    return materiales.reduce((sum, m) => sum + m.puntosEstimados, 0);
  }

  filtrarCategoria(): void {}

  private cargarMateriales(): void {
    this.cargandoMateriales = true;
    this.materialService.listar().subscribe({
      next: (materiales) => {
        this.materiales = materiales;
        this.categorias = [...new Set(materiales.map((m) => m.categoria).filter(Boolean))];
        this.cargandoMateriales = false;
      },
      error: (error) => {
        this.mensajeError = obtenerMensajeBackend(error);
        this.cargandoMateriales = false;
      },
    });
  }

  private cargarPublicaciones(): void {
    this.cargandoPublicaciones = true;
    const idUsuario = this.authService.getCurrentUserId();

    if (!idUsuario) {
      this.cargandoPublicaciones = false;
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
            publicaciones.map((pub) =>
              this.publicacionService.obtenerDetalle(pub.id).pipe(
                map((detalle) => ({
                  publicacion: pub,
                  materiales: detalle.materiales ?? [],
                })),
                catchError(() =>
                  of({
                    publicacion: pub,
                    materiales: [] as MaterialDetalle[],
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
          this.cargandoPublicaciones = false;
        },
        error: (error) => {
          this.mensajeError = obtenerMensajeBackend(error);
          this.cargandoPublicaciones = false;
        },
      });
  }
}
