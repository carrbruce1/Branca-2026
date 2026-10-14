import { describe, expect, it } from 'vitest';
import { leerDni, validarEmpleado } from '../../supabase/functions/_shared/empleado';

const valido = { nombre: 'María José', apellido: "O'Connor", dni: '12345678', cuil: '20123456786', email: 'cocina@example.com', clave: 'Cocina2026', foto_url: 'data:image/jpeg;base64,YQ==', perfil: 'cocinero' };
describe('validaciones del alta de empleado', () => {
  it('acepta datos completos, acentos y CUIL con verificador válido', () => {
    expect(validarEmpleado(valido)).toEqual({});
  });
  it('rechaza un CUIL con verificador incorrecto o de otro DNI', () => {
    expect(validarEmpleado({ ...valido, cuil: '20123456780' })).toHaveProperty('cuil');
    expect(validarEmpleado({ ...valido, dni: '87654321' })).toHaveProperty('cuil');
  });
  it('rechaza datos vacíos, perfiles privilegiados y fotos que no son imágenes', () => {
    const errores = validarEmpleado({ nombre: '', apellido: '123', dni: 'abc', cuil: '', email: 'a@', clave: '', foto_url: 'https://foto', perfil: 'dueno' });
    expect(Object.keys(errores)).toHaveLength(8);
  });
  it('extrae únicamente los datos disponibles del DNI y rechaza códigos ajenos', () => {
    expect(leerDni('00123456789@PEREZ@ANA MARIA@F@12345678@A@01/01/1990')).toEqual({ nombre: 'ANA MARIA', apellido: 'PEREZ', dni: '12345678' });
    expect(() => leerDni('https://restaurante/mesa/1')).toThrow();
  });
});
