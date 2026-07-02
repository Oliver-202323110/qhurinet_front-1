import { Routes } from '@angular/router';
import { AccessDeniedComponent } from './components/accessdeniedcomponent/accessdeniedcomponent';
import { LoginComponent } from './components/authcomponent/login/login';
import { RegisterComponent } from './components/authcomponent/register/register';
import { CertificadoListComponent } from './components/certificadocomponent/certificado-list/certificado-list';
import { IncentivoListComponent } from './components/incentivocomponent/incentivo-list/incentivo-list';
import { LandingComponent } from './components/landingcomponent/landingcomponent';
import { LayoutComponent } from './components/layoutcomponent/layoutcomponent';
import { PerfilComponent } from './components/perfilcomponent/perfilcomponent';
import { PublicacionDetail } from './components/publicacioncomponent/publicacion-detail/publicacion-detail';
import { PublicacionEdit } from './components/publicacioncomponent/publicacion-edit/publicacion-edit';
import { PublicacionExplore } from './components/publicacioncomponent/publicacion-explore/publicacion-explore';
import { PublicacionInsert } from './components/publicacioncomponent/publicacion-insert/publicacion-insert';
import { PublicacionList } from './components/publicacioncomponent/publicacion-list/publicacion-list';
import { PublicacionComponent } from './components/publicacioncomponent/publicacioncomponent';
import { Publicacionmaterialcomponent } from './components/publicacionmaterialcomponent/publicacionmaterialcomponent';
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
    path: '',
    component: LandingComponent,
    canActivate: [publicGuard],
    pathMatch: 'full',
  },
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
        canActivate: [roleGuard],
        data: { roles: ['RECOLECTOR', 'BODEGA', 'ADMIN'] },
      },
      {
        path: 'incentivos',
        component: IncentivoListComponent,
        canActivate: [roleGuard],
        data: { roles: ['GENERADOR', 'EMISOR', 'RECOLECTOR', 'BODEGA', 'ADMIN'] },
      },
      {
        path: 'transacciones-dinero',
        component: TransaccionDineroListComponent,
        canActivate: [roleGuard],
        data: { roles: ['ADMIN'] },
      },
      {
        path: 'verificacion',
        component: DocumentoVerificacionComponent,
        canActivate: [roleGuard],
        data: { roles: ['GENERADOR', 'EMISOR', 'RECOLECTOR', 'BODEGA', 'ADMIN'] },
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
        path: 'materiales',
        component: Publicacionmaterialcomponent,
        canActivate: [roleGuard],
        data: { roles: ['ADMIN'] },
      },
      {
        path: 'publicaciones',
        component: PublicacionComponent,
        canActivate: [roleGuard],
        data: { roles: ['GENERADOR', 'EMISOR', 'RECOLECTOR', 'BODEGA', 'ADMIN'] },
        children: [
          {
            path: '',
            redirectTo: 'lista',
            pathMatch: 'full',
          },
          {
            path: 'lista',
            component: PublicacionList,
            canActivate: [roleGuard],
            data: { roles: ['GENERADOR', 'EMISOR', 'RECOLECTOR', 'BODEGA', 'ADMIN'] },
          },
          {
            path: 'nuevo',
            component: PublicacionInsert,
            canActivate: [roleGuard],
            data: { roles: ['GENERADOR', 'EMISOR', 'RECOLECTOR', 'BODEGA', 'ADMIN'] },
          },
          {
            path: 'explorar',
            component: PublicacionExplore,
            canActivate: [roleGuard],
            data: { roles: ['GENERADOR', 'EMISOR', 'ADMIN'] },
          },
          {
            path: 'detalle/:id',
            component: PublicacionDetail,
            canActivate: [roleGuard],
            data: { roles: ['GENERADOR', 'EMISOR', 'RECOLECTOR', 'BODEGA', 'ADMIN'] },
          },
          {
            path: 'editar/:id',
            component: PublicacionEdit,
            canActivate: [roleGuard],
            data: { roles: ['GENERADOR', 'EMISOR', 'RECOLECTOR', 'BODEGA', 'ADMIN'] },
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
