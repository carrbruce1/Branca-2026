import { BarcodeFormat, EncodeHintType, QRCodeWriter } from '@zxing/library';
import { supabase } from './Supabasecliente';

export const tiposMesa = ['VIP', 'estandar', 'movilidad_reducida'] as const;
export type TipoMesa = typeof tiposMesa[number];
export interface Mesa {
  id: string;
  numero: number;
  cantidad_comensales: number;
  tipo: TipoMesa;
  disponibilidad: 'vacia' | 'ocupada';
  foto_url: string;
}
export interface DatosMesa {
  numero: string;
  cantidad_comensales: string;
  tipo: string;
  foto_url: string;
}
export const nombresTipo: Record<TipoMesa, string> = {
  VIP: 'VIP',
  estandar: 'Estándar',
  movilidad_reducida: 'Para comensales con movilidad reducida',
};

export function validarMesa(datos: DatosMesa): Record<string, string> {
  const errores: Record<string, string> = {};
  if (!/^\d+$/.test(datos.numero) || Number(datos.numero) < 1 || Number(datos.numero) > 9999) {
    errores.numero = 'Ingresá un número entero entre 1 y 9999.';
  }
  if (!/^\d+$/.test(datos.cantidad_comensales) || Number(datos.cantidad_comensales) < 1 || Number(datos.cantidad_comensales) > 100) {
    errores.cantidad_comensales = 'Ingresá una capacidad de entre 1 y 100 comensales.';
  }
  if (!tiposMesa.includes(datos.tipo as TipoMesa)) errores.tipo = 'Seleccioná un tipo de mesa válido.';
  if (!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/.test(datos.foto_url) || datos.foto_url.length > 2800000) {
    errores.foto_url = 'Tomá una foto de la mesa de hasta 2 MB desde la cámara.';
  }
  return errores;
}

// Identidad estable, independiente del puerto o dirección donde se ejecute la app.
export function contenidoQrMesa(id: string): string {
  return JSON.stringify({ tipo: 'mesa', version: 1, id });
}

export function imagenQrMesa(id: string): string {
  const matriz = new QRCodeWriter().encode(contenidoQrMesa(id), BarcodeFormat.QR_CODE, 0, 0, new Map([[EncodeHintType.MARGIN, 4]]));
  const lado = matriz.getWidth();
  const cuadros: string[] = [];
  for (let y = 0; y < lado; y++) {
    for (let x = 0; x < lado; x++) {
      if (matriz.get(x, y)) cuadros.push(`M${x},${y}h1v1h-1z`);
    }
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${lado} ${lado}" width="320" height="320" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="white"/><path d="${cuadros.join('')}" fill="black"/></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function errorMesas(error: { code?: string }): string {
  if (error.code === '23505') return 'Ya existe una mesa con ese número.';
  if (error.code === '42501') return 'No tenés permisos para gestionar mesas. Ingresá como dueño o supervisor.';
  if (error.code === '42P01' || error.code === 'PGRST205') return 'Falta configurar la tabla de mesas en Supabase. Avisá al administrador.';
  if (error.code === '23514') return 'Los datos de la mesa no cumplen las validaciones. Revisá el formulario.';
  return 'No se pudo completar la operación. Revisá la conexión y volvé a intentar.';
}

export async function listarMesas(): Promise<Mesa[]> {
  const { data, error } = await supabase.from('mesas').select('id, numero, cantidad_comensales, tipo, disponibilidad, foto_url').order('numero');
  if (error) throw new Error(errorMesas(error));
  return data as Mesa[];
}

export async function crearMesa(datos: DatosMesa): Promise<Mesa> {
  const errores = validarMesa(datos);
  if (Object.keys(errores).length) throw new Error(Object.values(errores).join(' '));
  const { data, error } = await supabase.from('mesas').insert({
    numero: Number(datos.numero),
    cantidad_comensales: Number(datos.cantidad_comensales),
    tipo: datos.tipo,
    disponibilidad: 'vacia',
    foto_url: datos.foto_url,
  }).select('id, numero, cantidad_comensales, tipo, disponibilidad, foto_url').single();
  if (error) throw new Error(errorMesas(error));
  return data as Mesa;
}

export async function cambiarDisponibilidad(mesa: Mesa): Promise<Mesa> {
  const { data, error } = await supabase.from('mesas')
    .update({ disponibilidad: mesa.disponibilidad === 'vacia' ? 'ocupada' : 'vacia' })
    .eq('id', mesa.id).eq('disponibilidad', mesa.disponibilidad)
    .select('id, numero, cantidad_comensales, tipo, disponibilidad, foto_url').maybeSingle();
  if (error) throw new Error(errorMesas(error));
  if (!data) throw new Error('La mesa cambió o ya no está disponible. Actualizá el listado antes de intentar nuevamente.');
  return data as Mesa;
}
