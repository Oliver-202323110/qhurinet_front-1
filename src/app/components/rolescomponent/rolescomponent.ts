import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Rol } from '../../models/Rol';
import { Usuario } from '../../models/Usuario';
import { RolService } from '../../services/rolservice';
import { UsuarioService } from '../../services/usuarioservice';
import { obtenerMensajeBackend } from '../../utils/backend-error';

@Component({
  selector: 'app-rolescomponent',
  imports: [CommonModule, FormsModule],
  templateUrl: './rolescomponent.html',
  styleUrl: './rolescomponent.css',
})
export class RolesComponent implements OnInit {
  roles: Rol[] = [];
  usuarios: Usuario[] = [];
  cargando = true;
  mensajeError = '';
  mensajeExito = '';
  cambios: Record<number, string> = {};

  constructor(
    private readonly rolService: RolService,
    private readonly usuarioService: UsuarioService,
  ) {}

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando = true;
    this.rolService.listar().subscribe({
      next: (roles) => {
        this.roles = roles;
        this.cargarUsuarios();
      },
      error: (error) => {
        this.mensajeError = obtenerMensajeBackend(error);
        this.cargando = false;
      },
    });
  }

  cargarUsuarios(): void {
    this.usuarioService.listar().subscribe({
      next: (usuarios) => {
        this.usuarios = usuarios;
        this.cambios = usuarios.reduce<Record<number, string>>((acc, usuario) => {
          acc[usuario.id] = usuario.roles?.[0] ?? 'USER';
          return acc;
        }, {});
        this.cargando = false;
      },
      error: (error) => {
        this.mensajeError = obtenerMensajeBackend(error);
        this.cargando = false;
      },
    });
  }

  cambiarRol(usuario: Usuario): void {
    const nuevoRol = this.cambios[usuario.id];

    if (!nuevoRol || nuevoRol === usuario.roles?.[0]) {
      return;
    }

    if (typeof window !== 'undefined' && !window.confirm(`¿Cambiar el rol de ${usuario.nombre} a ${nuevoRol}?`)) {
      this.cambios[usuario.id] = usuario.roles?.[0] ?? 'USER';
      return;
    }

    this.usuarioService
      .actualizarAdmin(usuario.id, {
        username: usuario.username,
        nombre: usuario.nombre,
        correo: usuario.correo,
        enabled: usuario.enabled,
        roles: [nuevoRol],
      })
      .subscribe({
        next: () => {
          this.mensajeExito = 'Rol actualizado correctamente.';
          this.cargarUsuarios();
        },
        error: (error) => {
          this.mensajeError = obtenerMensajeBackend(error);
          this.cambios[usuario.id] = usuario.roles?.[0] ?? 'USER';
        },
      });
  }
}
