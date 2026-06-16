import { Publicacion } from './Publicacion';

export interface MaterialDetalle {
  idMaterial: number;
  nombreMaterial: string;
  categoriaMaterial: string;
  cantidad: number;
  unidad: string;
  puntosPorKg: number;
  puntosEstimados: number;
}

export interface PublicacionDetalle {
  publicacion: Publicacion;
  materiales: MaterialDetalle[];
  reputacionPromedio: number;
  cantidadCalificaciones: number;
}
