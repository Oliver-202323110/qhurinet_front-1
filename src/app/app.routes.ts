import { Routes } from '@angular/router';
import { AccessDeniedComponent } from './components/accessdeniedcomponent/accessdeniedcomponent';
import { LoginComponent } from './components/authcomponent/login/login';
import { RegisterComponent } from './components/authcomponent/register/register';
import { CertificadoListComponent } from './components/certificadocomponent/certificado-list/certificado-list';
import { LayoutComponent } from './components/layoutcomponent/layoutcomponent';
import { PerfilComponent } from './components/perfilcomponent/perfilcomponent';
import { PublicacionDetail } from './components/publicacioncomponent/publicacion-detail/publicacion-detail';
import { PublicacionEdit } from './components/publicacioncomponent/publicacion-edit/publicacion-edit';
import { PublicacionExplore } from './components/publicacioncomponent/publicacion-explore/publicacion-explore';
import { PublicacionInsert } from './components/publicacioncomponent/publicacion-insert/publicacion-insert';
import { PublicacionList } from './components/publicacioncomponent/publicacion-list/publicacion-list';
import { PublicacionComponent } from './components/publicacioncomponent/publicacioncomponent';
import { ResumenComponent } from './components/resumencomponent/resumencomponent';
import { RolesComponent } from './components/rolescomponent/rolescomponent';
import { TransaccionDineroListComponent } from './components/transacciondinerocomponent/transaccion-dinero-list/transaccion-dinero-list';
import { DocumentoAdminComponent } from './components/verificacioncomponent/documento-admin/documento-admin';
import { DocumentoVerificacionComponent } from './components/verificacioncomponent/documento-verificacion/documento-verificacion';
import { authGuard } from './guards/auth.guard';
import { publicGuard } from './guards/public.guard';
import { roleGuard } from './guards/role.guard';

export const routes: Routes = [
  {
    path: 'login',
    component: LoginComponent,
    canActivate: [publicGuard],
  },
  {
    path: 'register',
    component: RegisterComponent,
    canActivate: [publicGuard],
  },
  {
    path: '',
    component: LayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        redirectTo: 'resumen',
        pathMatch: 'full',
      },
      {
        path: 'resumen',
        component: ResumenComponent,
      },
      {
        path: 'perfil',
        component: PerfilComponent,
      },
      {
        path: 'certificados',
        component: CertificadoListComponent,
      },
      {
        path: 'transacciones-dinero',
        component: TransaccionDineroListComponent,
      },
      {
        path: 'verificacion',
        component: DocumentoVerificacionComponent,
      },
      {
        path: 'verificacion/admin',
        component: DocumentoAdminComponent,
        canActivate: [roleGuard],
        data: { roles: ['ADMIN'] },
      },
      {
        path: 'roles',
        component: RolesComponent,
        canActivate: [roleGuard],
        data: { roles: ['ADMIN'] },
      },
      {
        path: 'acceso-denegado',
        component: AccessDeniedComponent,
      },
      {
        path: 'publicaciones',
        component: PublicacionComponent,
        children: [
          {
            path: '',
            redirectTo: 'lista',
            pathMatch: 'full',
          },
          {
            path: 'lista',
            component: PublicacionList,
          },
          {
            path: 'nuevo',
            component: PublicacionInsert,
          },
          {
            path: 'explorar',
            component: PublicacionExplore,
          },
          {
            path: 'detalle/:id',
            component: PublicacionDetail,
          },
          {
            path: 'editar/:id',
            component: PublicacionEdit,
          },
        ],
      },
    ],
  },
  {
    path: '**',
    redirectTo: 'resumen',
  },
];
