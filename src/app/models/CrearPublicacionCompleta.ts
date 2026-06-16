import { Publicacion } from './Publicacion';
import { PublicacionMaterial } from './PublicacionMaterial';

export interface CrearPublicacionCompleta {
  publicacion: Publicacion;
  materiales: PublicacionMaterial[];
  observaciones: string;
  fechaDisponibilidad: string;
  imagen: File | null;
}

export interface CrearPublicacionResultado {
  publicacion: Publicacion;
  completada: boolean;
  advertencias: string[];
}
