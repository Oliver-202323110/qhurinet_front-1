import { HttpErrorResponse } from '@angular/common/http';

export function obtenerMensajeBackend(error: unknown): string {
  if (!(error instanceof HttpErrorResponse)) {
    if (error instanceof Error && error.message) {
      return error.message;
    }

    return 'No se pudo completar la operacion. Intenta nuevamente.';
  }

  if (error.status === 400) {
    const mensaje = extraerMensaje(error.error);

    if (mensaje.toLowerCase().includes('correo') && mensaje.toLowerCase().includes('existe')) {
      return 'Este correo ya se encuentra registrado.';
    }

    return mensaje || 'Revisa los campos marcados antes de continuar.';
  }

  if (error.status === 401) {
    return 'Tu sesion ha expirado. Inicia sesion nuevamente.';
  }

  if (error.status === 403) {
    return 'No tienes permisos para realizar esta accion.';
  }

  if (error.status === 404) {
    return 'No se encontro el recurso solicitado.';
  }

  if (error.status === 409) {
    return extraerMensaje(error.error) || 'El recurso ya existe o no puede duplicarse.';
  }

  if (error.status === 413) {
    return 'El archivo es demasiado grande.';
  }

  if (error.status === 415) {
    return 'El formato del archivo no esta permitido.';
  }

  if (error.status === 429) {
    return extraerMensaje(error.error) || 'Demasiadas solicitudes.';
  }

  if (error.status === 500) {
    return 'Ocurrio un problema inesperado en el servidor.';
  }

  return extraerMensaje(error.error) || 'No se pudo completar la operacion. Intenta nuevamente.';
}

function extraerMensaje(error: unknown): string {
  if (!error) {
    return '';
  }

  if (typeof error === 'string') {
    return error;
  }

  if (typeof error === 'object' && 'error' in error) {
    const valor = (error as { error?: unknown }).error;

    if (typeof valor === 'string') {
      return valor;
    }
  }

  if (typeof error === 'object' && 'message' in error) {
    const valor = (error as { message?: unknown }).message;

    if (typeof valor === 'string') {
      return valor;
    }
  }

  return '';
}
