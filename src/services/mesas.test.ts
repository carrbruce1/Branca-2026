import { describe, expect, it } from 'vitest';
import { BinaryBitmap, HybridBinarizer, QRCodeReader, RGBLuminanceSource } from '@zxing/library';
import { contenidoQrMesa, errorMesas, imagenQrMesa, validarMesa } from './mesas';

const valida = { numero: '1', cantidad_comensales: '4', tipo: 'estandar', foto_url: 'data:image/jpeg;base64,YQ==' };

describe('alta de mesas', () => {
  it('acepta los tres tipos de mesa y los límites de capacidad y número', () => {
    for (const tipo of ['VIP', 'estandar', 'movilidad_reducida']) {
      expect(validarMesa({ ...valida, tipo })).toEqual({});
    }
    expect(validarMesa({ ...valida, numero: '9999', cantidad_comensales: '100' })).toEqual({});
  });

  it('rechaza campos vacíos, negativos, decimales y capacidades fuera de rango', () => {
    for (const numero of ['', '0', '-1', '1.5', '10000', '1e2']) {
      expect(validarMesa({ ...valida, numero })).toHaveProperty('numero');
    }
    for (const cantidad_comensales of ['', '0', '-4', '4.5', '101']) {
      expect(validarMesa({ ...valida, cantidad_comensales })).toHaveProperty('cantidad_comensales');
    }
  });

  it('rechaza fotos ausentes, archivos ajenos y tipos de mesa desconocidos', () => {
    expect(validarMesa({ ...valida, foto_url: '' })).toHaveProperty('foto_url');
    expect(validarMesa({ ...valida, foto_url: 'data:text/html;base64,YQ==' })).toHaveProperty('foto_url');
    expect(validarMesa({ ...valida, tipo: 'inventado' })).toHaveProperty('tipo');
  });

  it('genera un QR que se puede decodificar y conserva la identidad de la mesa', () => {
    const id = '84f15753-76a4-4b50-a479-1d7d39a9fe53';
    const svg = decodeURIComponent(imagenQrMesa(id).split(',').slice(1).join(','));
    const dimension = Number(svg.match(/viewBox="0 0 (\d+)/)?.[1]);
    const escala = 8;
    const lado = dimension * escala;
    const pixeles = new Uint8ClampedArray(lado * lado).fill(255);
    for (const cuadro of svg.matchAll(/M(\d+),(\d+)h1v1h-1z/g)) {
      const x = Number(cuadro[1]) * escala;
      const y = Number(cuadro[2]) * escala;
      for (let dy = 0; dy < escala; dy++) {
        for (let dx = 0; dx < escala; dx++) pixeles[(y + dy) * lado + x + dx] = 0;
      }
    }
    const bitmap = new BinaryBitmap(new HybridBinarizer(new RGBLuminanceSource(pixeles, lado, lado)));
    expect(new QRCodeReader().decode(bitmap).getText()).toBe(contenidoQrMesa(id));
    expect(JSON.parse(contenidoQrMesa(id))).toEqual({ tipo: 'mesa', version: 1, id });
    expect(contenidoQrMesa('otra-mesa')).not.toBe(contenidoQrMesa(id));
  });

  it('informa números duplicados, permisos insuficientes y configuración pendiente', () => {
    expect(errorMesas({ code: '23505' })).toContain('Ya existe');
    expect(errorMesas({ code: '42501' })).toContain('permisos');
    expect(errorMesas({ code: 'PGRST205' })).toContain('Supabase');
  });
});
