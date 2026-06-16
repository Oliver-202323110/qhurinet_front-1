import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { Publicacion } from '../../../models/Publicacion';
import { ArchivoService } from '../../../services/archivoservice';
import { AuthService } from '../../../services/authservice';
import { MaterialService } from '../../../services/materialservice';
import { PublicacionService } from '../../../services/publicacionservice';
import { PublicacionInsert } from './publicacion-insert';

describe('PublicacionInsert', () => {
  let fixture: ComponentFixture<PublicacionInsert>;
  let component: PublicacionInsert;
  let publicacionService: { crearPublicacionCompleta: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    publicacionService = {
      crearPublicacionCompleta: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [PublicacionInsert],
      providers: [
        { provide: MaterialService, useValue: { listar: vi.fn(() => of([])) } },
        { provide: PublicacionService, useValue: publicacionService },
        { provide: ArchivoService, useValue: { validarImagen: vi.fn(() => null) } },
        { provide: AuthService, useValue: { getCurrentUserId: vi.fn(() => 7) } },
        { provide: Router, useValue: { navigate: vi.fn() } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PublicacionInsert);
    component = fixture.componentInstance;
  });

  it('no permite enviar sin seleccionar material', () => {
    component.form.patchValue({
      titulo: 'Botellas PET limpias',
      direccion: 'Av. Arequipa 1234',
      fechaDisponibilidad: fechaFutura(),
      latitud: '-12.0464',
      longitud: '-77.0428',
    });

    component.registrar();

    expect(publicacionService.crearPublicacionCompleta).not.toHaveBeenCalled();
    expect(component.mensajeError).toBe('Revisa los campos marcados antes de crear la publicación.');
  });

  it('rechaza observaciones mayores a 200 caracteres', () => {
    component.form.get('observaciones')?.setValue('x'.repeat(201));

    expect(component.form.get('observaciones')?.valid).toBe(false);
  });

  it('rechaza fecha actual o pasada', () => {
    component.form.get('fechaDisponibilidad')?.setValue('2020-01-01');

    expect(component.form.get('fechaDisponibilidad')?.hasError('fechaNoFutura')).toBe(true);
  });

  it('crea una publicacion usando el usuario autenticado', () => {
    const publicacion = new Publicacion();
    publicacion.id = 10;
    publicacionService.crearPublicacionCompleta.mockReturnValue(
      of({ publicacion, completada: true, advertencias: [] }),
    );
    component.materialesArray.push(
      new FormGroup({
        idMaterial: new FormControl(1),
        nombre: new FormControl('Plastico PET'),
        categoria: new FormControl('plastico'),
        seleccionado: new FormControl(true),
        cantidad: new FormControl(4.5),
      }),
    );
    component.form.patchValue({
      titulo: 'Botellas PET limpias',
      direccion: 'Av. Arequipa 1234',
      fechaDisponibilidad: fechaFutura(),
      latitud: '-12.0464',
      longitud: '-77.0428',
      observaciones: 'Material limpio',
    });

    component.registrar();

    expect(publicacionService.crearPublicacionCompleta).toHaveBeenCalled();
    const payload = publicacionService.crearPublicacionCompleta.mock.calls[0][0];
    expect(payload.publicacion.idUsuario).toBe(7);
    expect(payload.materiales).toEqual([{ idMaterial: 1, cantidad: 4.5, unidad: 'kg' }]);
  });

  function fechaFutura(): string {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    return date.toISOString().slice(0, 10);
  }
});
