import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';

export interface OpcionesFoto {
  /** 'user' para selfie (frontal) | 'environment' para mesas/platos (trasera) */
  tipo?: 'user' | 'environment';
  /** Si es true permite elegir de la galería (solo para platos/bebidas). Por defecto false. */
  permitirGaleria?: boolean;
}

/**
 * Servicio unificado de cámara.
 * - En app nativa (APK): ejecuta CameraSource.Camera de Capacitor (abre directo el sensor sin menú de galería).
 * - En navegador web: usa un input HTML5 con el atributo 'capture' para obligar al navegador móvil a abrir la cámara directa.
 */
export const tomarFoto = async (opciones: OpcionesFoto = {}): Promise<string | null> => {
  const { tipo = 'user', permitirGaleria = false } = opciones;

  // 1. DISPOSITIVO NATIVO (App Android / iOS instalada)
  if (Capacitor.isNativePlatform()) {
    try {
      const imagen = await Camera.getPhoto({
        quality: 75,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: permitirGaleria ? CameraSource.Prompt : CameraSource.Camera,
      });

      if (imagen?.base64String) {
        return `data:image/jpeg;base64,${imagen.base64String}`;
      }
      return null;
    } catch (error: any) {
      if (error?.message?.includes('cancelled') || error?.message?.includes('canceled')) {
        return null;
      }
      console.warn('Error al capturar foto en dispositivo nativo:', error);
      return null;
    }
  }

  // 2. NAVEGADOR WEB (Chrome, Safari, etc. en celular o PC)
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';

    // Al definir 'capture', el navegador móvil omite el selector de galería y abre la cámara directo
    if (!permitirGaleria) {
      input.capture = tipo;
    }

    input.onchange = (event: Event) => {
      const target = event.target as HTMLInputElement;
      const file = target?.files?.[0];

      if (!file) {
        resolve(null);
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        resolve(reader.result as string);
      };
      reader.onerror = () => {
        resolve(null);
      };
      reader.readAsDataURL(file);
    };

    // Control si el usuario cancela la captura o vuelve atrás
    window.addEventListener(
      'focus',
      () => {
        setTimeout(() => {
          if (!input.files || input.files.length === 0) {
            resolve(null);
          }
        }, 1000);
      },
      { once: true }
    );

    input.click();
  });
};
