export class Publicacion {
  id: number = 0;
  idUsuario: number = 0;
  usuarioNombre: string = '';

  titulo: string = '';
  descripcion: string = '';

  categoria: string = '';
  material: string = '';
  tipoPunto: string = 'recoleccion';

  direccion: string = '';

  latitud: number = 0;
  longitud: number = 0;

  activo: boolean = true;
  createdAt: string = '';

  constructor() {}
}