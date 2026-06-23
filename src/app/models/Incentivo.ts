export interface Incentivo {
  id: number;
  nombre: string;
  descripcion: string;
  tipo: string;
  costoPuntos: number;
  puntosOtorgados?: number;
  frecuencia?: string;
  stock?: number;
  activo: boolean;
  fechaInicio?: string;
  fechaFin?: string;
  createdAt?: string;
}

export interface UsuarioIncentivo {
  id: number;
  idUsuario: number;
  idIncentivo: number;
  usuarioNombre?: string;
  incentivoNombre: string;
  estado: string;
  puntosCanjeados: number;
  codigoCanje?: string;
  fechaCanje: string;
  fechaVencimiento?: string;
  completado?: boolean;
}

export interface CanjeIncentivoRequest {
  idUsuario: number;
  idIncentivo: number;
}

export interface ValorPuntosAccion {
  accion: string;
  descripcion: string;
  puntos: number;
}
