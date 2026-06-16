import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { Rol } from '../models/Rol';

@Injectable({
  providedIn: 'root',
})
export class RolService {
  private readonly apiUrl = `${API_BASE_URL}/api/roles`;

  constructor(private readonly http: HttpClient) {}

  listar(): Observable<Rol[]> {
    return this.http.get<Rol[]>(`${this.apiUrl}/lista`);
  }
}
