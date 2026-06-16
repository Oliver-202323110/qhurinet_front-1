import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, map, of, throwError } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { Certificado } from '../models/Certificado';

@Injectable({
  providedIn: 'root',
})
export class CertificadoService {
  private readonly apiUrl = `${API_BASE_URL}/api/certificados`;

  constructor(private readonly http: HttpClient) {}

  listar(): Observable<Certificado[]> {
    return this.http.get<Certificado[] | null>(`${this.apiUrl}/lista`).pipe(
      map((certificados) => certificados ?? []),
      catchError((error: HttpErrorResponse) => (error.status === 204 ? of([]) : throwError(() => error))),
    );
  }

  listarPorUsuario(idUsuario: number): Observable<Certificado[]> {
    return this.http.get<Certificado[] | null>(`${this.apiUrl}/usuario/${idUsuario}`).pipe(
      map((certificados) => certificados ?? []),
      catchError((error: HttpErrorResponse) => (error.status === 204 ? of([]) : throwError(() => error))),
    );
  }

  filtrarPorDificultad(nivel: string): Observable<Certificado[]> {
    return this.http.get<Certificado[] | null>(`${this.apiUrl}/dificultad/${nivel}`).pipe(
      map((certificados) => certificados ?? []),
      catchError((error: HttpErrorResponse) => (error.status === 204 ? of([]) : throwError(() => error))),
    );
  }

  descargarPdf(id: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${id}/pdf`, { responseType: 'blob' });
  }
}
