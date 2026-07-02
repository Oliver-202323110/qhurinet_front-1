import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map, switchMap, tap } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { LoginResponse, RegisterRequest, Usuario } from '../models/Usuario';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly apiUrl = `${API_BASE_URL}/api/auth`;
  private readonly usuarioApiUrl = `${API_BASE_URL}/api/usuarios`;
  private readonly tokenKey = 'qhurinet_token';
  private readonly refreshTokenKey = 'qhurinet_refresh_token';
  private readonly userIdKey = 'qhurinet_user_id';
  private readonly userRoleKey = 'qhurinet_user_role';
  private readonly userNameKey = 'qhurinet_user_name';
  private readonly userPointsKey = 'qhurinet_user_points';
  private readonly rememberKey = 'qhurinet_remember_session';
  private readonly rutasPorRol: Record<string, string> = {
  ADMIN: '/verificacion/admin',
  GENERADOR: '/publicaciones/explorar',
  EMISOR: '/publicaciones/explorar',
  RECOLECTOR: '/resumen',
  BODEGA: '/resumen',
  USER: '/resumen',
};

private readonly prioridadRoles = ['ADMIN', 'RECOLECTOR', 'BODEGA', 'GENERADOR', 'EMISOR', 'USER'];

  constructor(private readonly http: HttpClient) {}

  login(username: string, password: string, recordar = false): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, { username, password }).pipe(
      tap((response) => this.guardarTokens(response, recordar)),
      switchMap((response) =>
        this.obtenerUsuarioActual().pipe(
          map(() => response),
        ),
      ),
    );
  }

  register(request: RegisterRequest): Observable<Usuario> {
    return this.http.post<Usuario>(`${this.apiUrl}/register`, request);
  }

  refresh(): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${this.apiUrl}/refresh`, {
        refreshToken: this.getRefreshToken(),
      })
      .pipe(tap((response) => this.guardarTokens(response, this.recordarSesion())));
  }

  logout(): Observable<unknown> {
    return this.http
      .post<unknown>(`${this.apiUrl}/logout`, { refreshToken: this.getRefreshToken() })
      .pipe(tap(() => this.limpiarSesion()));
  }

  obtenerUsuarioActual(): Observable<Usuario> {
    return this.http.get<Usuario>(`${this.usuarioApiUrl}/me`).pipe(tap((usuario) => this.guardarUsuario(usuario)));
  }

  guardarTokens(response: LoginResponse, recordar = false): void {
    this.setStorageValue(this.tokenKey, response.token, recordar);
    this.setStorageValue(this.refreshTokenKey, response.refreshToken, recordar);
    this.setStorageValue(this.rememberKey, recordar ? 'true' : 'false', recordar);
  }

  guardarUsuario(usuario: Usuario): void {
  const recordar = this.recordarSesion();
  const roles = this.extraerRolesUsuario(usuario);
  const rolPrincipal = this.obtenerRolPrincipal(roles);

  this.setStorageValue(this.userIdKey, String(usuario.id), recordar);
  this.setStorageValue(this.userNameKey, usuario.nombre || usuario.username, recordar);
  this.setStorageValue(this.userRoleKey, rolPrincipal, recordar);
  this.setStorageValue(this.userPointsKey, this.getCurrentUserPoints().toString(), recordar);
}

  limpiarSesion(): void {
    [
      this.tokenKey,
      this.refreshTokenKey,
      this.userIdKey,
      this.userRoleKey,
      this.userNameKey,
      this.userPointsKey,
      this.rememberKey,
    ].forEach((key) => this.removeStorageValue(key));
  }

  estaAutenticado(): boolean {
    return Boolean(this.getToken());
  }

  getToken(): string | null {
    return this.getStorageValue(this.tokenKey);
  }

  getRefreshToken(): string | null {
    return this.getStorageValue(this.refreshTokenKey);
  }

  getCurrentUserId(): number | null {
    return this.toNumber(this.getStorageValue(this.userIdKey));
  }

  getCurrentUserRole(): string {
    const storedRole = this.getStorageValue(this.userRoleKey);

    if (storedRole) {
      return this.normalizarRol(storedRole);
    }

    const payload = this.getTokenPayload();
    return this.normalizarRol(String(payload?.['roles'] ?? payload?.['role'] ?? 'USER'));
  }

  getRoles(): string[] {
    return this.getCurrentUserRole()
      .split(',')
      .map((role) => this.normalizarRol(role))
      .filter(Boolean);
  }

  tieneRol(roles: string[]): boolean {
    const permitidos = roles.map((role) => this.normalizarRol(role));
    return this.getRoles().some((role) => permitidos.includes(role));
  }

  isAdmin(): boolean {
    return this.tieneRol(['ADMIN']);
  }

  getCurrentUserName(): string {
    return this.getStorageValue(this.userNameKey) ?? 'Usuario';
  }

  getCurrentUserPoints(): number {
    return this.toNumber(this.getStorageValue(this.userPointsKey)) ?? 0;
  }

  rutaDespuesDeLogin(): string {
  const rolPrincipal = this.obtenerRolPrincipal(this.getRoles());
  return this.rutasPorRol[rolPrincipal] ?? '/resumen';
}

  recordarSesion(): boolean {
    return this.getStorageValue(this.rememberKey) === 'true';
  }

  private getTokenPayload(): Record<string, unknown> | null {
    const token = this.getToken();

    if (!token || typeof globalThis.atob !== 'function') {
      return null;
    }

    const parts = token.split('.');

    if (parts.length < 2) {
      return null;
    }

    try {
      const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
      return JSON.parse(globalThis.atob(padded)) as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  private getStorageValue(key: string): string | null {
    if (!this.hasStorage()) {
      return null;
    }

    return window.localStorage.getItem(key) ?? window.sessionStorage.getItem(key);
  }

  private setStorageValue(key: string, value: string, local: boolean): void {
    if (!this.hasStorage()) {
      return;
    }

    const primary = local ? window.localStorage : window.sessionStorage;
    const secondary = local ? window.sessionStorage : window.localStorage;
    primary.setItem(key, value);
    secondary.removeItem(key);
  }

  private removeStorageValue(key: string): void {
    if (!this.hasStorage()) {
      return;
    }

    window.localStorage.removeItem(key);
    window.sessionStorage.removeItem(key);
  }

  private hasStorage(): boolean {
    return typeof window !== 'undefined' && Boolean(window.localStorage) && Boolean(window.sessionStorage);
  }

  private toNumber(value: unknown): number | null {
    const numberValue = Number(value);
    return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : null;
  }

  private extraerRolesUsuario(usuario: Usuario): string[] {
  const roles = (usuario.roles ?? [])
    .map((role) => this.normalizarRol(role))
    .filter(Boolean);

  const tipoCuenta = this.normalizarRol(usuario.tipoCuenta ?? '');

  if (tipoCuenta && (!roles.length || roles.every((role) => role === 'USER'))) {
    return [tipoCuenta];
  }

  return roles.length ? roles : ['USER'];
  }

  private obtenerRolPrincipal(roles: string[]): string {
    const normalizados = roles.map((role) => this.normalizarRol(role)).filter(Boolean);

    return this.prioridadRoles.find((role) => normalizados.includes(role)) ?? normalizados[0] ?? 'USER';
  }

  private normalizarRol(role: string): string {
    const normalizado = role.replace('ROLE_', '').trim().toUpperCase();

    if (normalizado === 'EMISOR') {
      return 'GENERADOR';
    }

    return normalizado;
  }
}
