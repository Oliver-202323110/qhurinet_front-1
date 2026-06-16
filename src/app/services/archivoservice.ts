import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { ArchivoResponse } from '../models/ArchivoResponse';

@Injectable({
  providedIn: 'root',
})
export class ArchivoService {
  private readonly apiUrl = `${API_BASE_URL}/api/archivos`;
  readonly formatosPermitidos = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  readonly tamanoMaximo = 5 * 1024 * 1024;

  constructor(private readonly http: HttpClient) {}

  subirImagen(file: File): Observable<ArchivoResponse> {
    const error = this.validarImagen(file);

    if (error) {
      return throwError(() => new Error(error));
    }

    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<ArchivoResponse>(this.apiUrl, formData);
  }

  eliminarImagen(nombre: string): Observable<{ nombre: string; eliminado: boolean }> {
    return this.http.delete<{ nombre: string; eliminado: boolean }>(`${this.apiUrl}/${nombre}`);
  }

  validarImagen(file: File): string {
    if (!this.formatosPermitidos.includes(file.type)) {
      return 'La imagen debe ser JPG, PNG, WEBP o GIF.';
    }

    if (file.size > this.tamanoMaximo) {
      return 'La imagen no debe superar los 5 MB.';
    }

    return '';
  }
}
