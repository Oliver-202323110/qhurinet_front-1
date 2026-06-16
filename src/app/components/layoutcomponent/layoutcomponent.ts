import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { catchError, filter, of } from 'rxjs';
import { AuthService } from '../../services/authservice';

interface NavItem {
  label: string;
  path: string;
  roles?: string[];
}

@Component({
  selector: 'app-layoutcomponent',
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './layoutcomponent.html',
  styleUrl: './layoutcomponent.css',
})
export class LayoutComponent {
  menuOpen = false;
  pageTitle = 'Resumen';

  readonly navItems: NavItem[] = [
    { label: 'Resumen', path: '/resumen' },
    { label: 'Publicaciones', path: '/publicaciones/lista' },
    { label: 'Explorar puntos', path: '/publicaciones/explorar' },
    { label: 'Perfil', path: '/perfil' },
    { label: 'Certificados', path: '/certificados' },
    { label: 'Transacciones', path: '/transacciones-dinero' },
    { label: 'Verificacion', path: '/verificacion' },
    { label: 'Revision docs', path: '/verificacion/admin', roles: ['ADMIN'] },
    { label: 'Roles', path: '/roles', roles: ['ADMIN'] },
  ];

  constructor(
    public readonly authService: AuthService,
    private readonly router: Router,
  ) {
    this.actualizarTitulo(this.router.url);
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe((event) => {
        this.actualizarTitulo(event.urlAfterRedirects);
        this.menuOpen = false;
      });
  }

  get visibleNavItems(): NavItem[] {
    return this.navItems.filter((item) => {
      if (!item.roles?.length) {
        return true;
      }

      return item.roles.some((role) => this.authService.tieneRol([role]));
    });
  }

  get nombreUsuario(): string {
    return this.authService.getCurrentUserName();
  }

  get inicialUsuario(): string {
    return this.nombreUsuario.trim().charAt(0).toUpperCase() || 'U';
  }

  get rolUsuario(): string {
    return this.authService.getCurrentUserRole() || 'USUARIO';
  }

  get puntosUsuario(): number {
    return this.authService.getCurrentUserPoints();
  }

  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
  }

  cerrarSesion(): void {
    this.authService
      .logout()
      .pipe(
        catchError(() => {
          this.authService.limpiarSesion();
          return of(null);
        }),
      )
      .subscribe(() => {
        void this.router.navigateByUrl('/login');
      });
  }

  trackByPath(_: number, item: NavItem): string {
    return item.path;
  }

  private actualizarTitulo(url: string): void {
    if (
      url.startsWith('/publicaciones/nuevo') ||
      url.startsWith('/publicaciones/editar') ||
      url.startsWith('/publicaciones/detalle')
    ) {
      this.pageTitle = 'Publicacion';
      return;
    }

    if (url.startsWith('/publicaciones')) {
      this.pageTitle = 'Publicaciones';
      return;
    }

    const item = this.navItems.find((navItem) => url.startsWith(navItem.path));
    this.pageTitle = item?.label ?? 'Resumen';
  }
}
