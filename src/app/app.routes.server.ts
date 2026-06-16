import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    path: 'publicaciones/editar/:id',
    renderMode: RenderMode.Server,
  },
  {
    path: 'publicaciones/detalle/:id',
    renderMode: RenderMode.Server,
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender,
  },
];
