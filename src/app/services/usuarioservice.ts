import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { Usuario, UsuarioPerfil } from '../models/Usuario';

@Injectable({
  providedIn: 'root',
})
export class UsuarioService {
  private readonly apiUrl = `${API_BASE_URL}/api/usuarios`;

  constructor(private readonly http: HttpClient) {}

  me(): Observable<Usuario> {
    return this.http.get<Usuario>(`${this.apiUrl}/me`);
  }

  listar(): Observable<Usuario[]> {
    return this.http.get<Usuario[]>(`${this.apiUrl}/lista`);
  }

  perfil(id: number): Observable<UsuarioPerfil> {
    return this.http.get<UsuarioPerfil>(`${this.apiUrl}/${id}/perfil`);
  }

  actualizarDatosBasicos(id: number, datos: { nombre: string; telefono: string }): Observable<Usuario> {
    return this.http.put<Usuario>(`${this.apiUrl}/${id}/datos-basicos`, datos);
  }

  actualizarDescripcion(id: number, descripcion: string): Observable<Usuario> {
    return this.http.put<Usuario>(`${this.apiUrl}/${id}/descripcion`, { descripcion });
  }

  actualizarTipoCuenta(id: number, tipoCuenta: string): Observable<Usuario> {
    return this.http.put<Usuario>(`${this.apiUrl}/${id}/tipo-cuenta`, { tipoCuenta });
  }

  actualizarFoto(id: number, fotoUrl: string): Observable<Usuario> {
    return this.http.put<Usuario>(`${this.apiUrl}/${id}/foto`, { fotoUrl });
  }

  actualizarAdmin(id: number, usuario: Partial<Usuario> & { password?: string; roles?: string[] }): Observable<Usuario> {
    return this.http.put<Usuario>(`${this.apiUrl}/${id}`, usuario);
  }
}
