import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, map, of, throwError } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';

export interface ReporteGlobal {
  publicaciones: number;
  recolecciones: number;
  materialesRegistrados: number;
  puntosTransacciones: number;
  calificaciones: number;
}

export interface ReporteMaterialCategoria {
  categoria: string;
  cantidadKg: number;
}

export interface ReporteUsuario {
  idUsuario: number;
  publicaciones: number;
  recolecciones: number;
  puntosMovidos: number;
}

export interface HistorialMaterialUsuario {
  material: string;
  categoria: string;
  cantidad: number;
  ultimaPublicacion: string;
}

@Injectable({
  providedIn: 'root',
})
export class ReporteService {
  private readonly estadisticasUrl = `${API_BASE_URL}/api/estadisticas`;
  private readonly publicacionesUrl = `${API_BASE_URL}/api/publicaciones`;
  private readonly recoleccionesUrl = `${API_BASE_URL}/api/recolecciones`;
  private readonly transaccionesPuntosUrl = `${API_BASE_URL}/api/transacciones-puntos`;

  constructor(private readonly http: HttpClient) {}

  globales(): Observable<ReporteGlobal> {
    return this.http.get<ReporteGlobal>(`${this.estadisticasUrl}/globales`);
  }

  materialesReciclados(): Observable<ReporteMaterialCategoria[]> {
    return this.http.get<ReporteMaterialCategoria[] | null>(`${this.estadisticasUrl}/materiales`).pipe(
      map((data) => data ?? []),
      catchError((error: HttpErrorResponse) => {
        if (error.status === 204 || error.status === 404) {
          return of([] as ReporteMaterialCategoria[]);
        }

        return throwError(() => error);
      }),
    );
  }

  reporteUsuario(idUsuario: number): Observable<ReporteUsuario> {
    return this.http.get<ReporteUsuario>(`${this.estadisticasUrl}/usuario/${idUsuario}`);
  }

  historialMaterialesUsuario(idUsuario: number): Observable<HistorialMaterialUsuario[]> {
    return this.http.get<HistorialMaterialUsuario[] | null>(`${this.publicacionesUrl}/historial/${idUsuario}`).pipe(
      map((data) => data ?? []),
      catchError((error: HttpErrorResponse) => {
        if (error.status === 204 || error.status === 404) {
          return of([] as HistorialMaterialUsuario[]);
        }

        return throwError(() => error);
      }),
    );
  }

  historialActividades(filtros: {
    idUsuario?: number;
    fechaInicio?: string;
    fechaFin?: string;
    estado?: string;
    material?: string;
  }): Observable<any[]> {
    let params = new HttpParams();

    Object.entries(filtros).forEach(([key, value]) => {
      if (value !== undefined && value !== null && String(value).trim() !== '') {
        params = params.set(key, String(value));
      }
    });

    return this.http.get<any[] | null>(`${this.recoleccionesUrl}/historial`, { params }).pipe(
      map((data) => data ?? []),
      catchError((error: HttpErrorResponse) => {
        if (error.status === 204 || error.status === 404) {
          return of([] as any[]);
        }

        return throwError(() => error);
      }),
    );
  }

  historialPuntos(idUsuario: number): Observable<any[]> {
    return this.http.get<any[] | null>(`${this.transaccionesPuntosUrl}/usuario/${idUsuario}`).pipe(
      map((data) => data ?? []),
      catchError((error: HttpErrorResponse) => {
        if (error.status === 204 || error.status === 404) {
          return of([] as any[]);
        }

        return throwError(() => error);
      }),
    );
  }
}