import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, map, of, throwError } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { Material } from '../models/Material';

@Injectable({
  providedIn: 'root',
})
export class MaterialService {
  private readonly apiUrl = `${API_BASE_URL}/api/materiales`;

  constructor(private readonly http: HttpClient) {}

  listar(): Observable<Material[]> {
    return this.http.get<Material[] | null>(this.apiUrl).pipe(
      map((materiales) => materiales ?? []),
      catchError((error: HttpErrorResponse) => {
        if (error.status === 204) {
          return of([]);
        }

        return throwError(() => error);
      }),
    );
  }

  buscarPorId(id: number): Observable<Material> {
    return this.http.get<Material>(`${this.apiUrl}/${id}`);
  }
}
