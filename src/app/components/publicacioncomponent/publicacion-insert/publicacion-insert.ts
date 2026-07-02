import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
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
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { throwError } from 'rxjs';
import { Material } from '../../../models/Material';
import { Publicacion } from '../../../models/Publicacion';
import { PublicacionMaterial } from '../../../models/PublicacionMaterial';
import { CrearPublicacionCompleta } from '../../../models/CrearPublicacionCompleta';
import { ArchivoService } from '../../../services/archivoservice';
import { AuthService } from '../../../services/authservice';
import { MaterialService } from '../../../services/materialservice';
import { PublicacionService } from '../../../services/publicacionservice';
import { obtenerMensajeBackend } from '../../../utils/backend-error';

@Component({
  selector: 'app-publicacion-insert',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './publicacion-insert.html',
  styleUrl: './publicacion-insert.css',
})
export class PublicacionInsert implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  publicacion: Publicacion = new Publicacion();
  materialesDisponibles: Material[] = [];
  imagen: File | null = null;
  imagenError = '';
  cargandoMateriales = true;
  guardando = false;
  submitted = false;
  mensajeExito = '';
  mensajeError = '';
  advertencias: string[] = [];

  readonly form = this.fb.group({
    titulo: ['', [Validators.required, Validators.maxLength(150)]],
    direccion: ['', [Validators.required, Validators.maxLength(250)]],
    fechaDisponibilidad: ['', [Validators.required, this.fechaFuturaValidator()]],
    latitud: ['', [Validators.required, Validators.min(-90), Validators.max(90)]],
    longitud: ['', [Validators.required, Validators.min(-180), Validators.max(180)]],
    materiales: this.fb.array([], [this.alMenosUnMaterialValidator()]),
    observaciones: ['', [Validators.maxLength(200)]],
  });

  constructor(
    private readonly materialService: MaterialService,
    private readonly publicacionService: PublicacionService,
    private readonly archivoService: ArchivoService,
    private readonly authService: AuthService,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    this.cargarMateriales();
  }

  get materialesArray(): FormArray {
    return this.form.get('materiales') as FormArray;
  }

  get observacionesLength(): number {
    return String(this.form.get('observaciones')?.value ?? '').length;
  }

  cargarMateriales(): void {
    this.cargandoMateriales = true;
    this.mensajeError = '';

    this.materialService.listar().subscribe({
      next: (materiales) => {
        this.materialesDisponibles = materiales ?? [];
        this.materialesArray.clear();

        this.materialesDisponibles.forEach((material) => {
          this.materialesArray.push(this.crearGrupoMaterial(material));
        });

        this.materialesArray.updateValueAndValidity();
        this.cargandoMateriales = false;
      },
      error: (error) => {
        this.materialesDisponibles = [];
        this.materialesArray.clear();
        this.cargandoMateriales = false;
        this.mensajeError =
          obtenerMensajeBackend(error) || 'No se pudieron cargar los materiales registrados.';
      },
    });
  }

  registrar(): void {
    if (this.guardando) {
      return;
    }

    this.submitted = true;
    this.mensajeError = '';
    this.mensajeExito = '';
    this.advertencias = [];
    this.form.markAllAsTouched();
    this.materialesArray.updateValueAndValidity();

    if (this.form.invalid || this.imagenError) {
      this.mensajeError = 'Revisa los campos marcados antes de crear la publicación.';
      return;
    }

    this.guardando = true;

    const datos = this.construirDatosPublicacion();

    if (!datos) {
      this.guardando = false;
      this.mensajeError = 'No se pudo identificar al usuario autenticado. Inicia sesión nuevamente.';
      return;
    }

    this.publicacionService.crearPublicacionCompleta(datos).subscribe({
      next: (resultado) => {
        this.guardando = false;
        this.publicacion = resultado.publicacion;

        if (resultado.completada) {
          this.mensajeExito = 'Publicación creada correctamente.';
        } else {
          this.mensajeError =
            'La publicación fue creada, pero algunos datos adicionales no pudieron guardarse.';
          this.advertencias = resultado.advertencias;
        }

        this.navegarAlListado();
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

  seleccionarImagen(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.imagenError = '';
    this.imagen = null;

    if (!file) {
      return;
    }

    const error = this.archivoService.validarImagen(file);

    if (error) {
      this.imagenError = error;
      input.value = '';
      return;
    }

    this.imagen = file;
  }

  quitarImagen(input: HTMLInputElement): void {
    this.imagen = null;
    this.imagenError = '';
    input.value = '';
  }

  obtenerMaterialesSeleccionados(): PublicacionMaterial[] {
    return this.materialesArray
      .getRawValue()
      .filter((material: { seleccionado: boolean }) => material.seleccionado)
      .map((material: { idMaterial: number; cantidad: string | number }) => ({
        idMaterial: Number(material.idMaterial),
        cantidad: Number(material.cantidad),
        unidad: 'kg',
      }));
  }

  campoInvalido(nombre: string): boolean {
    const control = this.form.get(nombre);
    return Boolean(control?.invalid && (control.touched || control.dirty || this.submitted));
  }

  mensajeCampo(nombre: string): string {
    const control = this.form.get(nombre);
    const errors = control?.errors;

    if (!errors) {
      return '';
    }

    if (errors['required']) {
      return 'Este campo es obligatorio.';
    }

    if (errors['maxlength']) {
      const max = errors['maxlength'].requiredLength;
      return `Máximo ${max} caracteres.`;
    }

    if (errors['min'] || errors['max']) {
      if (nombre === 'latitud') {
        return 'La latitud debe estar entre -90 y 90.';
      }

      if (nombre === 'longitud') {
        return 'La longitud debe estar entre -180 y 180.';
      }
    }

    if (errors['fechaNoFutura']) {
      return 'La fecha debe ser posterior al día actual.';
    }

    return 'El valor ingresado no es válido.';
  }

  materialSeleccionado(index: number): boolean {
    return Boolean(this.materialesArray.at(index).get('seleccionado')?.value);
  }

  cantidadInvalida(index: number): boolean {
    const control = this.materialesArray.at(index).get('cantidad');
    return Boolean(control?.invalid && (control.touched || control.dirty || this.submitted));
  }

  mensajeCantidad(index: number): string {
    const errors = this.materialesArray.at(index).get('cantidad')?.errors;

    if (!errors) {
      return '';
    }

    if (errors['required']) {
      return 'Ingresa la cantidad.';
    }

    if (errors['mayorCero']) {
      return 'La cantidad debe ser mayor que cero.';
    }

    if (errors['dosDecimales']) {
      return 'Usa máximo dos decimales.';
    }

    return 'Cantidad no válida.';
  }

  materialesInvalidos(): boolean {
    return Boolean(this.materialesArray.errors?.['materialRequerido'] && this.submitted);
  }

  formatoTamano(bytes: number): string {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(mb >= 1 ? 1 : 2)} MB`;
  }

  private crearGrupoMaterial(material: Material): FormGroup {
    const grupo = this.fb.group({
      idMaterial: [material.id],
      nombre: [material.nombre],
      categoria: [material.categoria],
      seleccionado: [false],
      cantidad: [{ value: '', disabled: true }],
    });

    grupo
      .get('seleccionado')
      ?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((seleccionado) => {
        const cantidad = grupo.get('cantidad');

        if (!cantidad) {
          return;
        }

        if (seleccionado) {
          cantidad.enable({ emitEvent: false });
          cantidad.setValidators([Validators.required, this.mayorQueCeroValidator(), this.dosDecimalesValidator()]);
        } else {
          cantidad.reset('', { emitEvent: false });
          cantidad.clearValidators();
          cantidad.disable({ emitEvent: false });
        }

        cantidad.updateValueAndValidity({ emitEvent: false });
        this.materialesArray.updateValueAndValidity();
      });

    return grupo;
  }

  private obtenerDatosMaterialesSeleccionados(): Material[] {
    return this.materialesArray
      .getRawValue()
      .filter((material: { seleccionado: boolean }) => material.seleccionado)
      .map(
        (material: { idMaterial: number; nombre: string; categoria: string }) =>
          ({
            id: Number(material.idMaterial),
            nombre: material.nombre,
            categoria: material.categoria,
            descripcion: '',
            puntosPorKg: 0,
            usuarioId: 0,
          }) as Material,
      );
  }

  private construirDatosPublicacion(): CrearPublicacionCompleta | null {
    const idUsuario = this.authService.getCurrentUserId();

    if (!idUsuario) {
      return null;
    }

    const materialesSeleccionados = this.obtenerMaterialesSeleccionados();
    const datosMaterial = this.obtenerDatosMaterialesSeleccionados();
    const observaciones = String(this.form.get('observaciones')?.value ?? '').trim();
    const publicacion = new Publicacion();

    publicacion.idUsuario = idUsuario;
    publicacion.titulo = String(this.form.get('titulo')?.value ?? '').trim();
    publicacion.direccion = String(this.form.get('direccion')?.value ?? '').trim();
    publicacion.latitud = Number(this.form.get('latitud')?.value);
    publicacion.longitud = Number(this.form.get('longitud')?.value);
    publicacion.tipoPunto = 'recoleccion';
    publicacion.activo = true;
    publicacion.descripcion = observaciones || 'Material reciclable disponible para recojo';

    if (datosMaterial.length === 1) {
      publicacion.material = datosMaterial[0].nombre;
      publicacion.categoria = datosMaterial[0].categoria;
    } else {
      publicacion.material = 'Mixto';
      publicacion.categoria = 'mixto';
    }

    return {
      publicacion,
      materiales: materialesSeleccionados,
      observaciones,
      fechaDisponibilidad: String(this.form.get('fechaDisponibilidad')?.value ?? ''),
      imagen: this.imagen,
    };
  }

  private navegarAlListado(): void {
    setTimeout(() => {
      void this.router.navigate(['/publicaciones/lista']);
    }, 1600);
  }

  private alMenosUnMaterialValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const formArray = control as FormArray;
      const tieneSeleccion = formArray.controls.some(
        (item) => item.get('seleccionado')?.value === true,
      );

      return tieneSeleccion ? null : { materialRequerido: true };
    };
  }

  private mayorQueCeroValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (control.value === null || control.value === '') {
        return null;
      }

      const valor = Number(control.value);
      return Number.isFinite(valor) && valor > 0 ? null : { mayorCero: true };
    };
  }

  private dosDecimalesValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (control.value === null || control.value === '') {
        return null;
      }

      const valor = String(control.value);
      return /^\d+(\.\d{1,2})?$/.test(valor) ? null : { dosDecimales: true };
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

      if (Number.isNaN(fecha.getTime())) {
        return { fechaNoFutura: true };
      }

      return fecha > hoy ? null : { fechaNoFutura: true };
    };
  }
}
