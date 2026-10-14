export interface Empleado {
  nombre: string; apellido: string; dni: string; cuil: string;
  email: string; clave: string; foto_url: string; perfil: string;
}

export function validarEmpleado(datos: Empleado): Record<string, string> {
  const errores: Record<string, string> = {};
  for (const campo of ['nombre', 'apellido'] as const) {
    if (!/^[\p{L}\p{M}]+(?:[ '-][\p{L}\p{M}]+)*$/u.test(datos[campo]) || datos[campo].length > 80)
      errores[campo] = 'Ingresá letras, con un máximo de 80 caracteres.';
  }
  if (!/^\d{7,8}$/.test(datos.dni)) errores.dni = 'El DNI debe tener 7 u 8 dígitos.';
  const pesos = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const resto = 11 - pesos.reduce((suma, peso, i) => suma + peso * Number(datos.cuil[i]), 0) % 11;
  const digito = resto === 11 ? 0 : resto === 10 ? 9 : resto;
  if (!/^\d{11}$/.test(datos.cuil) || !['20', '23', '24', '27'].includes(datos.cuil.slice(0, 2)) || digito !== Number(datos.cuil[10]))
    errores.cuil = 'Ingresá un CUIL válido, con sus 11 dígitos.';
  else if (datos.cuil.slice(2, 10) !== datos.dni.padStart(8, '0')) errores.cuil = 'El CUIL no corresponde al DNI ingresado.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.email) || datos.email.length > 254) errores.email = 'Ingresá un correo electrónico válido.';
  if (datos.clave.length < 8 || datos.clave.length > 72 || !/\S/.test(datos.clave)) errores.clave = 'La contraseña debe tener entre 8 y 72 caracteres.';
  if (!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/.test(datos.foto_url) || datos.foto_url.length > 2800000)
    errores.foto_url = 'Tomá una foto de hasta 2 MB desde la cámara.';
  if (datos.perfil !== 'cocinero') errores.perfil = 'El perfil debe ser cocinero.';
  return errores;
}

// Formato del código del DNI argentino: trámite@apellido@nombres@sexo@DNI@…
export function leerDni(texto: string): Pick<Empleado, 'nombre' | 'apellido' | 'dni'> {
  const partes = texto.trim().split('@');
  if (partes.length < 5 || !/^\d{7,8}$/.test(partes[4]) || !partes[1]?.trim() || !partes[2]?.trim())
    throw new Error('El código no contiene un DNI compatible. Probá nuevamente o completá los datos manualmente.');
  return { nombre: partes[2].trim(), apellido: partes[1].trim(), dni: partes[4] };
}
