import { createClient } from 'npm:@supabase/supabase-js@2';
import { validarEmpleado, type Empleado } from '../_shared/empleado.ts';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const respuesta = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return respuesta(405, { error: 'Método no permitido.' });
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false, autoRefreshToken: false } });
  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return respuesta(401, { error: 'Iniciá sesión para continuar.' });
  const { data: sesion, error: authError } = await admin.auth.getUser(token);
  if (authError || !sesion.user) return respuesta(401, { error: 'La sesión venció. Volvé a ingresar.' });
  const { data: actor, error: actorError } = await admin.from('usuarios').select('perfil').eq('id', sesion.user.id).single();
  if (actorError || !actor || !['dueno', 'supervisor'].includes(actor.perfil)) return respuesta(403, { error: 'Solo el dueño o supervisor puede agregar empleados.' });
  let datos: Empleado;
  try {
    const body = await req.json();
    if (['nombre', 'apellido', 'dni', 'cuil', 'email', 'clave', 'foto_url', 'perfil'].some(k => typeof body[k] !== 'string')) throw new Error();
    datos = { nombre: body.nombre.trim(), apellido: body.apellido.trim(), dni: body.dni.trim(), cuil: body.cuil.replace(/[\s-]/g, ''), email: body.email.trim().toLowerCase(), clave: body.clave, foto_url: body.foto_url, perfil: body.perfil };
  } catch { return respuesta(400, { error: 'Los datos del formulario no son válidos.' }); }
  const errores = validarEmpleado(datos);
  if (Object.keys(errores).length) return respuesta(400, { error: Object.values(errores).join(' '), errores });
  const { data: existentes, error: consultaError } = await admin.from('usuarios').select('id').or(`dni.eq.${datos.dni},cuil.eq.${datos.cuil}`);
  if (consultaError) return respuesta(500, { error: 'No se pudo verificar el empleado. Revisá la migración de la base de datos.' });
  if (existentes?.length) return respuesta(409, { error: 'Ya existe una persona con ese DNI o CUIL.' });
  const { data: cuenta, error: crearError } = await admin.auth.admin.createUser({ email: datos.email, password: datos.clave, email_confirm: true });
  if (crearError || !cuenta.user) return respuesta(400, { error: crearError?.code === 'email_exists' || crearError?.code === 'user_already_exists' ? 'El correo electrónico ya está registrado.' : 'No se pudo crear la cuenta. Verificá el correo y los requisitos de contraseña.' });
  const { clave: _clave, ...perfil } = datos;
  const { error: guardarError } = await admin.from('usuarios').upsert({ ...perfil, id: cuenta.user.id, estado: 'aceptado' }, { onConflict: 'id' });
  if (guardarError) {
    const { error: rollbackError } = await admin.auth.admin.deleteUser(cuenta.user.id);
    if (rollbackError) console.error('Alta incompleta: requiere revisión de Auth', cuenta.user.id);
    return respuesta(500, { error: rollbackError ? 'El alta quedó incompleta. Avisá al administrador antes de volver a intentar.' : guardarError.code === '23505' ? 'El DNI, CUIL o correo ya está registrado.' : 'No se pudo guardar el perfil. Revisá la estructura de usuarios y volvé a intentar.' });
  }
  return respuesta(201, { id: cuenta.user.id, mensaje: 'Empleado registrado correctamente.' });
});
