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
      catchError((error: HttpErrorResponse) => this.listaVaciaSiNoContent(error)),
    );
  }

  buscarPorId(id: number): Observable<Material> {
    return this.http.get<Material>(`${this.apiUrl}/${id}`);
  }

  crear(material: Material): Observable<Material> {
    return this.http.post<Material>(this.apiUrl, material);
  }

  actualizar(id: number, material: Material): Observable<string> {
    return this.http.put(`${this.apiUrl}/${id}`, material, { responseType: 'text' });
  }

  eliminar(id: number): Observable<string> {
    return this.http.delete(`${this.apiUrl}/${id}`, { responseType: 'text' });
  }

  listarPorCategoria(categoria: string): Observable<Material[]> {
    return this.listar().pipe(
      map((materiales) =>
        categoria ? materiales.filter((m) => m.categoria.toLowerCase() === categoria.toLowerCase()) : materiales,
      ),
    );
  }

  obtenerCategorias(): Observable<string[]> {
    return this.listar().pipe(
      map((materiales) => [...new Set(materiales.map((m) => m.categoria).filter(Boolean))]),
    );
  }

  private listaVaciaSiNoContent(error: HttpErrorResponse): Observable<Material[]> {
    if (error.status === 204) {
      return of([]);
    }
    return throwError(() => error);
  }
}
