import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, map, of, throwError } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { DocumentoRevision, DocumentoVerificacion } from '../models/DocumentoVerificacion';

@Injectable({
  providedIn: 'root',
})
export class DocumentoVerificacionService {
  private readonly apiUrl = `${API_BASE_URL}/api/documentos-verificacion`;

  constructor(private readonly http: HttpClient) {}

  listar(): Observable<DocumentoVerificacion[]> {
    return this.http.get<DocumentoVerificacion[] | null>(`${this.apiUrl}/lista`).pipe(
      map((documentos) => documentos ?? []),
      catchError((error: HttpErrorResponse) => (error.status === 204 ? of([]) : throwError(() => error))),
    );
  }

  listarPorUsuario(idUsuario: number): Observable<DocumentoVerificacion[]> {
    return this.http.get<DocumentoVerificacion[] | null>(`${this.apiUrl}/usuario/${idUsuario}`).pipe(
      map((documentos) => documentos ?? []),
      catchError((error: HttpErrorResponse) => (error.status === 204 ? of([]) : throwError(() => error))),
    );
  }

  listarPorEstado(estado: string): Observable<DocumentoVerificacion[]> {
    return this.http.get<DocumentoVerificacion[] | null>(`${this.apiUrl}/estado/${estado}`).pipe(
      map((documentos) => documentos ?? []),
      catchError((error: HttpErrorResponse) => (error.status === 204 ? of([]) : throwError(() => error))),
    );
  }

  insertar(documento: Partial<DocumentoVerificacion>): Observable<DocumentoVerificacion> {
    return this.http.post<DocumentoVerificacion>(this.apiUrl, documento);
  }

  revisar(id: number, revision: DocumentoRevision): Observable<DocumentoVerificacion> {
    return this.http.put<DocumentoVerificacion>(`${this.apiUrl}/${id}/revisar`, revision);
  }
}
