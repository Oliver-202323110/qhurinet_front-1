import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, map, of, throwError } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { CanjeIncentivoRequest, Incentivo, UsuarioIncentivo, ValorPuntosAccion } from '../models/Incentivo';

@Injectable({
  providedIn: 'root',
})
export class IncentivoService {
  private readonly apiUrl = `${API_BASE_URL}/api/incentivos`;
  private readonly usuarioIncentivoUrl = `${API_BASE_URL}/api/usuario-incentivos`;

  constructor(private readonly http: HttpClient) {}

  listar(): Observable<Incentivo[]> {
    return this.http.get<Incentivo[] | null>(`${this.apiUrl}/lista`).pipe(
      map((incentivos) => incentivos ?? []),
      catchError((error: HttpErrorResponse) => (error.status === 204 ? of([]) : throwError(() => error))),
    );
  }

  listarActivos(): Observable<Incentivo[]> {
    return this.http.get<Incentivo[] | null>(`${this.apiUrl}/activos`).pipe(
      map((incentivos) => incentivos ?? []),
      catchError((error: HttpErrorResponse) => {
        if (error.status === 204) {
          return of([]);
        }

        if (error.status === 404) {
          return this.listar().pipe(map((incentivos) => incentivos.filter((incentivo) => incentivo.activo)));
        }

        return throwError(() => error);
      }),
    );
  }

  obtener(id: number): Observable<Incentivo> {
    return this.http.get<Incentivo>(`${this.apiUrl}/${id}`);
  }

  listarPorUsuario(idUsuario: number): Observable<UsuarioIncentivo[]> {
    return this.http.get<any[] | null>(`${this.usuarioIncentivoUrl}/progreso/${idUsuario}`).pipe(
      map((items) =>
        (items ?? []).map((item) => ({
          id: item.idUsuarioIncentivo ?? 0,
          idUsuario,
          idIncentivo: item.idIncentivo ?? 0,
          incentivoNombre: item.nombre ?? 'Incentivo',
          estado: item.estado ?? 'en_progreso',
          puntosCanjeados: 0,
          codigoCanje: '',
          fechaCanje: item.completadoEn ?? '',
          fechaVencimiento: '',
          completado: item.estado === 'reclamado' || item.estado === 'completado',
        })),
      ),
      catchError((error: HttpErrorResponse) =>
        error.status === 204 || error.status === 404 ? of([]) : throwError(() => error),
      ),
    );
  }

  canjear(request: CanjeIncentivoRequest): Observable<any> {
    return this.http.post<any>(
      `${this.apiUrl}/${request.idIncentivo}/canjear/${request.idUsuario}`,
      {},
    );
  }

  listarValorPuntos(): Observable<ValorPuntosAccion[]> {
    return this.http.get<ValorPuntosAccion[] | null>(`${this.apiUrl}/valor-puntos`).pipe(
      map((acciones) => acciones ?? []),
      catchError((error: HttpErrorResponse) => (error.status === 204 || error.status === 404 ? of([]) : throwError(() => error))),
    );
  }
}
