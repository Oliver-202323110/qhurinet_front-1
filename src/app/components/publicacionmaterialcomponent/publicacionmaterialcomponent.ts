import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin, of, catchError, map, switchMap} from 'rxjs';
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
    private readonly cdr: ChangeDetectorRef,
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
    this.cdr.detectChanges();
  }

  abrirFormularioEditar(material: Material): void {
    this.nuevoMaterial = { ...material };
    this.editandoMaterial = material;
    this.mostrarFormulario = true;
    this.mensajeError = '';
    this.mensajeExito = '';
    this.cdr.detectChanges();
  }

  cancelarFormulario(): void {
    this.mostrarFormulario = false;
    this.editandoMaterial = null;
    this.nuevoMaterial = new Material();
    this.guardando = false;
    this.cdr.detectChanges();
  }

  guardarMaterial(): void {
    if (!this.nuevoMaterial.nombre.trim() || !this.nuevoMaterial.categoria.trim()) {
      this.mensajeError = 'Nombre y categoría son obligatorios.';
      this.cdr.detectChanges();
      return;
    }

    if (this.nuevoMaterial.puntosPorKg < 0) {
      this.mensajeError = 'Los puntos por kg deben ser mayor o igual a 0.';
      this.cdr.detectChanges();
      return;
    }

    this.guardando = true;
    this.mensajeError = '';
    this.mensajeExito = '';
    this.cdr.detectChanges();

    const nombre = this.nuevoMaterial.nombre;

    const cerrarYActualizar = (mensaje: string) => {
      this.guardando = false;
      this.mostrarFormulario = false;
      this.editandoMaterial = null;
      this.nuevoMaterial = new Material();

      this.mensajeExito = mensaje;

      this.cdr.detectChanges();

      this.cargarMateriales();
      this.cargarPublicaciones();

      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const manejarError = (error: unknown) => {
      this.guardando = false;
      this.mensajeError = obtenerMensajeBackend(error);
      this.cdr.detectChanges();
    };

    if (this.editandoMaterial) {
      this.materialService.actualizar(this.editandoMaterial.id, this.nuevoMaterial).subscribe({
        next: () => {
          cerrarYActualizar(`Material "${nombre}" actualizado correctamente.`);
        },
        error: manejarError,
      });
    } else {
      this.materialService.crear(this.nuevoMaterial).subscribe({
        next: () => {
          cerrarYActualizar(`Material "${nombre}" creado correctamente.`);
        },
        error: manejarError,
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
        this.cdr.detectChanges();
      },
    });
  }

  totalPuntosPublicacion(materiales: MaterialDetalle[]): number {
    return materiales.reduce((sum, m) => sum + m.puntosEstimados, 0);
  }

  filtrarCategoria(): void {}

  private cargarMateriales(): void {
    this.cargandoMateriales = true;
    this.mensajeError = '';
    this.cdr.detectChanges();

    this.materialService.listar().subscribe({
      next: (materiales) => {
        this.materiales = materiales ?? [];
        this.categorias = [
          ...new Set(this.materiales.map((m) => m.categoria).filter(Boolean)),
        ];
        this.cargandoMateriales = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.mensajeError = obtenerMensajeBackend(error);
        this.cargandoMateriales = false;
        this.cdr.detectChanges();
      },
    });
  }

  private cargarPublicaciones(): void {
    this.cargandoPublicaciones = true;
    this.cdr.detectChanges();

    const idUsuario = this.authService.getCurrentUserId();

    if (!idUsuario) {
      this.publicaciones = [];
      this.cargandoPublicaciones = false;
      this.cdr.detectChanges();
      return;
    }

    const consulta$ = this.esAdmin()
      ? this.publicacionService.listar()
      : this.publicacionService.listarPorUsuario(idUsuario);

    consulta$.subscribe({
      next: (publicaciones) => {
        this.publicaciones = (publicaciones ?? []).map((publicacion) => ({
          publicacion,
          materiales: [],
        }));

        this.cargandoPublicaciones = false;
        this.cdr.detectChanges();

        this.cargarMaterialesDePublicaciones();
      },
      error: (error) => {
        this.mensajeError = obtenerMensajeBackend(error);
        this.publicaciones = [];
        this.cargandoPublicaciones = false;
        this.cdr.detectChanges();
      },
    });
  }

  private cargarMaterialesDePublicaciones(): void {
    this.publicaciones.forEach((item, index) => {
      if (!item.publicacion.id) {
        return;
      }

      this.publicacionService.obtenerDetalle(item.publicacion.id).subscribe({
        next: (detalle) => {
          this.publicaciones = this.publicaciones.map((pub, i) =>
            i === index
              ? {
                  ...pub,
                  materiales: detalle.materiales ?? [],
                }
              : pub,
          );

          this.cdr.detectChanges();
        },
        error: () => {
          this.publicaciones = this.publicaciones.map((pub, i) =>
            i === index
              ? {
                  ...pub,
                  materiales: [],
                }
              : pub,
          );

          this.cdr.detectChanges();
        },
      });
    });
  }
}
