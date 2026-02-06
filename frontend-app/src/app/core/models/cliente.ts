export interface Cliente {
  id: number;
  nombre: string;
  correo?: string | null;
  telefono?: string | null;
  cedula?: string | null;
  activo?: boolean;
  creditoMaximo?: number;
  diasCredito?: number;
  saldoDeuda?: number;
  puntos?: number;
  creadoEn?: string;
  actualizadoEn?: string;
}

