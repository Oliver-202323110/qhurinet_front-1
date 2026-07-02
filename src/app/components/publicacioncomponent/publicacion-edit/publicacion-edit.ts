import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin, of, switchMap } from 'rxjs';
import { Material } from '../../../models/Material';
import { MaterialDetalle } from '../../../models/PublicacionDetalle';
import { Publicacion } from '../../../models/Publicacion';
import { PublicacionMaterial } from '../../../models/PublicacionMaterial';
import { AuthService } from '../../../services/authservice';
import { MaterialService } from '../../../services/materialservice';
import { PublicacionService } from '../../../services/publicacionservice';
import { obtenerMensajeBackend } from '../../../utils/backend-error';

@Component({
  selector: 'app-publicacion-edit',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './publicacion-edit.html',
  styleUrl: './publicacion-edit.css',
})
export class PublicacionEdit implements OnInit {
  id = 0;
  publicacion: Publicacion | null = null;
  materialesDisponibles: Material[] = [];
  materialesOriginales: MaterialDetalle[] = [];
  cargando = true;
  guardando = false;
  submitted = false;
  mensajeError = '';
  mensajeExito = '';
  private readonly fb = inject(FormBuilder);

  readonly form = this.fb.group({
    titulo: ['', [Validators.required, Validators.maxLength(150)]],
    direccion: ['', [Validators.required, Validators.maxLength(250)]],
    fechaDisponibilidad: ['', [this.fechaFuturaValidator()]],
    latitud: ['', [Validators.required, Validators.min(-90), Validators.max(90)]],
    longitud: ['', [Validators.required, Validators.min(-180), Validators.max(180)]],
    materiales: this.fb.array([], [this.alMenosUnMaterialValidator()]),
    observaciones: ['', [Validators.maxLength(200)]],
    activo: [true],
  });

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly publicacionService: PublicacionService,
    private readonly materialService: MaterialService,
    private readonly authService: AuthService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.id = Number(this.route.snapshot.paramMap.get('id'));
    forkJoin({
      publicacion: this.publicacionService.buscarPorId(this.id),
      detalle: this.publicacionService.obtenerDetalle(this.id),
      materiales: this.materialService.listarMisMateriales(),
    }).subscribe({
      next: ({ publicacion, detalle, materiales }) => {
        const idUsuario = this.authService.getCurrentUserId();
        if (!this.authService.isAdmin() && publicacion.idUsuario !== idUsuario) {
          this.mensajeError = 'No tienes permisos para editar esta publicación.';
          this.cargando = false;
          this.cdr.detectChanges();
          return;
        }

        this.publicacion = publicacion;
        this.materialesOriginales = detalle.materiales;
        this.materialesDisponibles = materiales;
        this.crearMateriales(materiales, detalle.materiales);
        this.form.patchValue({
          titulo: publicacion.titulo,
          direccion: publicacion.direccion,
          latitud: String(publicacion.latitud),
          longitud: String(publicacion.longitud),
          activo: publicacion.activo,
          observaciones: '',
        });
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

  get materialesArray(): FormArray {
    return this.form.get('materiales') as FormArray;
  }

  get observacionesLength(): number {
    return String(this.form.get('observaciones')?.value ?? '').length;
  }

  guardar(): void {
    this.submitted = true;
    this.form.markAllAsTouched();
    this.mensajeError = '';
    this.mensajeExito = '';

    if (this.form.invalid || !this.publicacion) {
      this.mensajeError = 'Revisa los campos marcados antes de guardar.';
      return;
    }

    const actualizada = this.construirPublicacion();
    const materialesSeleccionados = this.obtenerMaterialesSeleccionados();
    const seleccionadosIds = materialesSeleccionados.map((material) => material.idMaterial);
    const eliminaciones = this.materialesOriginales
      .filter((material) => !seleccionadosIds.includes(material.idMaterial))
      .map((material) => this.publicacionService.eliminarMaterial(this.id, material.idMaterial));
    const registros = materialesSeleccionados.map((material) =>
      this.publicacionService.registrarMaterial(this.id, material),
    );
    const observaciones = String(this.form.value.observaciones ?? '').trim();
    const fecha = String(this.form.value.fechaDisponibilidad ?? '');

    const extras = [
      ...registros,
      ...eliminaciones,
      observaciones ? this.publicacionService.actualizarObservaciones(this.id, observaciones) : of(null),
      fecha ? this.publicacionService.actualizarFechaDisponibilidad(this.id, fecha) : of(null),
    ];

    this.guardando = true;
    this.publicacionService
      .actualizar(this.id, actualizada)
      .pipe(switchMap(() => forkJoin(extras)))
      .subscribe({
        next: () => {
          this.guardando = false;
          this.mensajeExito = 'Publicación actualizada correctamente.';
          setTimeout(() => void this.router.navigate(['/publicaciones/lista']), 900);
        },
        error: (error) => {
          this.guardando = false;
          this.mensajeError = obtenerMensajeBackend(error);
        },
      });
  }

  cancelar(): void {
    void this.router.navigate(['/publicaciones/lista']);
  }

  campoInvalido(nombre: string): boolean {
    const control = this.form.get(nombre);
    return Boolean(control?.invalid && (control.touched || this.submitted));
  }

  materialSeleccionado(index: number): boolean {
    return Boolean(this.materialesArray.at(index).get('seleccionado')?.value);
  }

  cantidadInvalida(index: number): boolean {
    const control = this.materialesArray.at(index).get('cantidad');
    return Boolean(control?.invalid && (control.touched || this.submitted));
  }

  private crearMateriales(materiales: Material[], actuales: MaterialDetalle[]): void {
    this.materialesArray.clear();
    materiales.forEach((material) => {
      const actual = actuales.find((item) => item.idMaterial === material.id);
      const grupo = this.fb.group({
        idMaterial: [material.id],
        nombre: [material.nombre],
        categoria: [material.categoria],
        seleccionado: [Boolean(actual)],
        cantidad: [{ value: actual?.cantidad ?? '', disabled: !actual }],
      });
      this.configurarCantidad(grupo);
      this.materialesArray.push(grupo);
    });
  }

  private configurarCantidad(grupo: FormGroup): void {
    const seleccionado = grupo.get('seleccionado');
    const cantidad = grupo.get('cantidad');

    if (seleccionado?.value) {
      cantidad?.setValidators([Validators.required, this.mayorQueCeroValidator(), this.dosDecimalesValidator()]);
    }

    seleccionado?.valueChanges.subscribe((checked) => {
      if (checked) {
        cantidad?.enable();
        cantidad?.setValidators([Validators.required, this.mayorQueCeroValidator(), this.dosDecimalesValidator()]);
      } else {
        cantidad?.reset('');
        cantidad?.clearValidators();
        cantidad?.disable();
      }
      cantidad?.updateValueAndValidity();
      this.materialesArray.updateValueAndValidity();
    });
  }

  private construirPublicacion(): Publicacion {
    const seleccionados = this.obtenerDatosMaterialesSeleccionados();
    const publicacion = { ...(this.publicacion as Publicacion) };
    publicacion.titulo = String(this.form.value.titulo ?? '').trim();
    publicacion.direccion = String(this.form.value.direccion ?? '').trim();
    publicacion.latitud = Number(this.form.value.latitud);
    publicacion.longitud = Number(this.form.value.longitud);
    publicacion.activo = Boolean(this.form.value.activo);
    publicacion.descripcion =
      String(this.form.value.observaciones ?? '').trim() || publicacion.descripcion || 'Material reciclable disponible para recojo';

    if (seleccionados.length === 1) {
      publicacion.material = seleccionados[0].nombre;
      publicacion.categoria = seleccionados[0].categoria;
    } else {
      publicacion.material = 'Mixto';
      publicacion.categoria = 'mixto';
    }

    return publicacion;
  }

  private obtenerMaterialesSeleccionados(): PublicacionMaterial[] {
    return this.materialesArray
      .getRawValue()
      .filter((material: { seleccionado: boolean }) => material.seleccionado)
      .map((material: { idMaterial: number; cantidad: string | number }) => ({
        idMaterial: Number(material.idMaterial),
        cantidad: Number(material.cantidad),
        unidad: 'kg',
      }));
  }

  private obtenerDatosMaterialesSeleccionados(): Material[] {
    return this.materialesArray
      .getRawValue()
      .filter((material: { seleccionado: boolean }) => material.seleccionado)
      .map((material: { idMaterial: number; nombre: string; categoria: string }) => ({
        id: Number(material.idMaterial),
        nombre: material.nombre,
        categoria: material.categoria,
        descripcion: '',
        puntosPorKg: 0,
        usuarioId: 0,
      }));
  }

  private alMenosUnMaterialValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const formArray = control as FormArray;
      return formArray.controls.some((item) => item.get('seleccionado')?.value)
        ? null
        : { materialRequerido: true };
    };
  }

  private mayorQueCeroValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (control.value === null || control.value === '') {
        return null;
      }
      return Number(control.value) > 0 ? null : { mayorCero: true };
    };
  }

  private dosDecimalesValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (control.value === null || control.value === '') {
        return null;
      }
      return /^\d+(\.\d{1,2})?$/.test(String(control.value)) ? null : { dosDecimales: true };
    };
  }

  private fechaFuturaValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return null;
      }
      const fecha = new Date(`${control.value}T00:00:00`);
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      return fecha > hoy ? null : { fechaNoFutura: true };
    };
  }
}
