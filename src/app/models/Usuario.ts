export interface Usuario {
  id: number;
  username: string;
  nombre: string;
  correo: string;
  enabled: boolean;
  createdAt?: string;
  roles: string[];
}

export interface UsuarioPerfil {
  id: number;
  username: string;
  nombre: string;
  tipoCuenta: string;
  descripcion: string;
  fotoUrl: string;
  verificado: boolean;
  disponible: boolean;
  puntosTotales: number;
  nivelParticipacion: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
  nombre: string;
  correo: string;
}

export interface LoginResponse {
  token: string;
  expiresIn: number;
  tokenType: string;
  refreshToken: string;
}
