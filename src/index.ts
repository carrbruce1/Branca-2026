export type Perfil =
  | 'dueño'
  | 'supervisor'
  | 'metre'
  | 'mozo'
  | 'cocinero'
  | 'cantinero'
  | 'cliente_registrado';

export type EstadoUsuario = 'pendiente_aprobacion' | 'aprobado' | 'rechazado';

export interface Usuario {
  id: string;
  nombres: string;
  apellidos: string;
  dni: string;
  cuil: string | null;
  email: string;
  perfil: Perfil;
  foto_url: string | null;
  estado: EstadoUsuario;
  fecha_registro: string;
  fecha_aprobacion: string | null;
  aprobado_por: string | null;
}

export type TipoMesa = 'vip' | 'estandar' | 'movilidad_reducida';
export type DisponibilidadMesa = 'vacia' | 'ocupada';

export interface Mesa {
  id: string;
  numero: number;
  cantidad_comensales: number;
  tipo: TipoMesa;
  disponibilidad: DisponibilidadMesa;
  foto_url: string | null;
  qr_codigo: string;
}

export const PERFILES_EMPLEADO: Perfil[] = [
  'dueño',
  'supervisor',
  'metre',
  'mozo',
  'cocinero',
  'cantinero',
];

export const ETIQUETA_PERFIL: Record<Perfil, string> = {
  dueño: 'Dueño',
  supervisor: 'Supervisor',
  metre: 'Metre',
  mozo: 'Mozo',
  cocinero: 'Cocinero',
  cantinero: 'Cantinero',
  cliente_registrado: 'Cliente',
};