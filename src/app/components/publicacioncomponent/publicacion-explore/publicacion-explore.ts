import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Publicacion } from '../../../models/Publicacion';
import { PublicacionService } from '../../../services/publicacionservice';
import { obtenerMensajeBackend } from '../../../utils/backend-error';

@Component({
  selector: 'app-publicacion-explore',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './publicacion-explore.html',
  styleUrl: './publicacion-explore.css',
})
export class PublicacionExplore implements OnInit {
  publicaciones: Publicacion[] = [];
  cargando = true;
  mensajeError = '';
  texto = '';

  constructor(private readonly publicacionService: PublicacionService) {}

  ngOnInit(): void {
    this.cargarActivas();
  }

  cargarActivas(): void {
    this.cargando = true;
    this.publicacionService.listarActivas().subscribe({
      next: (publicaciones) => {
        this.publicaciones = publicaciones;
        this.cargando = false;
      },
      error: (error) => {
        this.mensajeError = obtenerMensajeBackend(error);
        this.cargando = false;
      },
    });
  }

  buscar(): void {
    const texto = this.texto.trim();

    if (!texto) {
      this.cargarActivas();
      return;
    }

    this.cargando = true;
    this.publicacionService.buscar(texto).subscribe({
      next: (publicaciones) => {
        this.publicaciones = publicaciones;
        this.cargando = false;
      },
      error: (error) => {
        this.mensajeError = obtenerMensajeBackend(error);
        this.cargando = false;
      },
    });
  }
}
