import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, map, of, throwError } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { TransaccionDinero } from '../models/TransaccionDinero';

@Injectable({
  providedIn: 'root',
})
export class TransaccionDineroService {
  private readonly apiUrl = `${API_BASE_URL}/api/transacciones-dinero`;

  constructor(private readonly http: HttpClient) {}

  listar(): Observable<TransaccionDinero[]> {
    return this.http.get<TransaccionDinero[] | null>(`${this.apiUrl}/lista`).pipe(
      map((transacciones) => transacciones ?? []),
      catchError((error: HttpErrorResponse) => (error.status === 204 ? of([]) : throwError(() => error))),
    );
  }

  listarPorUsuario(idUsuario: number): Observable<TransaccionDinero[]> {
    return this.http.get<TransaccionDinero[] | null>(`${this.apiUrl}/usuario/${idUsuario}`).pipe(
      map((transacciones) => transacciones ?? []),
      catchError((error: HttpErrorResponse) => {
        if (error.status === 204 || error.status === 404) {
          return of([]);
        }

        return throwError(() => error);
      }),
    );
  }
}
