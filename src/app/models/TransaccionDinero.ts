export interface TransaccionDinero {
  id: number;
  idUsuario: number;
  tipo: string;
  monto: number;
  moneda: string;
  estado: string;
  concepto: string;
  metodoPagoTipo: string;
  metodoPagoDetalle: string;
  referenciaExterna: string;
  createdAt: string;
}
