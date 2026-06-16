export interface DocumentoVerificacion {
  id: number;
  idUsuario: number;
  usuarioNombre: string;
  tipo: string;
  urlArchivo: string;
  estado: string;
  motivoRechazo: string;
  createdAt: string;
  reviewedAt: string;
}

export interface DocumentoRevision {
  estado: string;
  motivoRechazo: string;
}
