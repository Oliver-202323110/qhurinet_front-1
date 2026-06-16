import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, forkJoin, map, of, switchMap, throwError } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import {
  CrearPublicacionCompleta,
  CrearPublicacionResultado,
} from '../models/CrearPublicacionCompleta';
import { Publicacion } from '../models/Publicacion';
import { PublicacionDetalle } from '../models/PublicacionDetalle';
import { PublicacionMaterial } from '../models/PublicacionMaterial';
import { obtenerMensajeBackend } from '../utils/backend-error';
import { ArchivoService } from './archivoservice';

@Injectable({
  providedIn: 'root',
})
export class PublicacionService {
  private readonly apiUrl = `${API_BASE_URL}/api/publicaciones`;

  constructor(
    private readonly http: HttpClient,
    private readonly archivoService: ArchivoService,
  ) {}

  listar(): Observable<Publicacion[]> {
    return this.http.get<Publicacion[] | null>(`${this.apiUrl}/lista`).pipe(
      map((publicaciones) => publicaciones ?? []),
      catchError((error: HttpErrorResponse) => this.listaVaciaSiNoContent(error)),
    );
  }

  listarActivas(): Observable<Publicacion[]> {
    return this.http.get<Publicacion[] | null>(`${this.apiUrl}/activos`).pipe(
      map((publicaciones) => publicaciones ?? []),
      catchError((error: HttpErrorResponse) => this.listaVaciaSiNoContent(error)),
    );
  }

  buscar(texto: string): Observable<Publicacion[]> {
    return this.http
      .get<Publicacion[] | null>(`${this.apiUrl}/buscar`, { params: { texto } })
      .pipe(
        map((publicaciones) => publicaciones ?? []),
        catchError((error: HttpErrorResponse) => this.listaVaciaSiNoContent(error)),
      );
  }

  listarPorUsuario(idUsuario: number): Observable<Publicacion[]> {
    return this.http.get<Publicacion[] | null>(`${this.apiUrl}/usuario/${idUsuario}`).pipe(
      map((publicaciones) => publicaciones ?? []),
      catchError((error: HttpErrorResponse) => this.listaVaciaSiNoContent(error)),
    );
  }

  buscarPorId(id: number): Observable<Publicacion> {
    return this.http.get<Publicacion>(`${this.apiUrl}/${id}`);
  }

  obtenerDetalle(id: number): Observable<PublicacionDetalle> {
    return this.http.get<PublicacionDetalle>(`${this.apiUrl}/${id}/detalle`);
  }

  insertar(publicacion: Publicacion): Observable<Publicacion> {
    return this.http.post<Publicacion>(this.apiUrl, publicacion);
  }

  actualizar(id: number, publicacion: Publicacion): Observable<Publicacion> {
    return this.http.put<Publicacion>(`${this.apiUrl}/${id}`, publicacion);
  }

  actualizarObservaciones(id: number, observaciones: string): Observable<Publicacion> {
    return this.http.put<Publicacion>(`${this.apiUrl}/${id}/observaciones`, { observaciones });
  }

  actualizarFechaDisponibilidad(id: number, fecha: string): Observable<Publicacion> {
    return this.http.put<Publicacion>(`${this.apiUrl}/${id}/fecha-disponibilidad`, {
      fechaDisponibilidad: fecha,
    });
  }

  actualizarEvidencia(id: number, imagenesJson: string): Observable<Publicacion> {
    return this.http.put<Publicacion>(`${this.apiUrl}/${id}/evidencia`, { imagenesJson });
  }

  registrarMaterial(
    idPublicacion: number,
    material: PublicacionMaterial,
  ): Observable<PublicacionMaterial> {
    return this.http.post<PublicacionMaterial>(`${this.apiUrl}/${idPublicacion}/materiales`, {
      ...material,
      idPublicacion,
      unidad: material.unidad || 'kg',
    });
  }

  eliminarMaterial(idPublicacion: number, idMaterial: number): Observable<unknown> {
    return this.http.delete<unknown>(`${this.apiUrl}/${idPublicacion}/materiales/${idMaterial}`);
  }

  eliminar(id: number): Observable<unknown> {
    return this.http.delete<unknown>(`${this.apiUrl}/${id}`);
  }

  validarInformacion(id: number): Observable<{ idPublicacion: number; valida: boolean; errores: string[] }> {
    return this.http.post<{ idPublicacion: number; valida: boolean; errores: string[] }>(
      `${this.apiUrl}/${id}/validar`,
      {},
    );
  }

  crearPublicacionCompleta(datos: CrearPublicacionCompleta): Observable<CrearPublicacionResultado> {
    return this.insertar(datos.publicacion).pipe(
      switchMap((publicacion) => {
        if (!publicacion.id) {
          return throwError(() => new Error('No se recibió el identificador de la publicación creada.'));
        }

        const operaciones: Observable<string | null>[] = [
          ...datos.materiales.map((material) =>
            this.registrarMaterial(publicacion.id, material).pipe(
              map(() => null),
              catchError((error) =>
                of(
                  `No se pudo registrar el material ${material.idMaterial}: ${obtenerMensajeBackend(error)}`,
                ),
              ),
            ),
          ),
          this.actualizarObservaciones(publicacion.id, datos.observaciones).pipe(
            map(() => null),
            catchError((error) =>
              of(`No se pudieron guardar las observaciones: ${obtenerMensajeBackend(error)}`),
            ),
          ),
          this.actualizarFechaDisponibilidad(publicacion.id, datos.fechaDisponibilidad).pipe(
            map(() => null),
            catchError((error) =>
              of(`No se pudo guardar la fecha de disponibilidad: ${obtenerMensajeBackend(error)}`),
            ),
          ),
        ];

        if (datos.imagen) {
          operaciones.push(
            this.archivoService.subirImagen(datos.imagen).pipe(
              switchMap((archivo) =>
                this.actualizarEvidencia(
                  publicacion.id,
                  JSON.stringify([{ nombre: archivo.nombre, url: archivo.url }]),
                ),
              ),
              map(() => null),
              catchError((error) =>
                of(`No se pudo guardar la imagen de evidencia: ${obtenerMensajeBackend(error)}`),
              ),
            ),
          );
        }

        operaciones.push(
          this.validarInformacion(publicacion.id).pipe(
            map((resultado) =>
              resultado.valida ? null : `Validación incompleta: ${resultado.errores.join(', ')}`,
            ),
            catchError((error) =>
              of(`No se pudo validar la publicación: ${obtenerMensajeBackend(error)}`),
            ),
          ),
        );

        return forkJoin(operaciones).pipe(
          map((resultados) => {
            const advertencias = resultados.filter((mensaje): mensaje is string => Boolean(mensaje));

            return {
              publicacion,
              completada: advertencias.length === 0,
              advertencias,
            };
          }),
        );
      }),
    );
  }

  private listaVaciaSiNoContent(error: HttpErrorResponse): Observable<Publicacion[]> {
    if (error.status === 204) {
      return of([]);
    }

    return throwError(() => error);
  }
}
