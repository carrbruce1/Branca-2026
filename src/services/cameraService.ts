import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';

export interface OpcionesFoto {
  /** 'user' para selfie (frontal) | 'environment' para mesas/platos (trasera) */
  tipo?: 'user' | 'environment';
  /** Si es true permite elegir de la galería (solo para platos/bebidas). Por defecto false. */
  permitirGaleria?: boolean;
}

export const tomarFoto = async (opciones: OpcionesFoto = {}): Promise<string | null> => {
  const { tipo = 'user', permitirGaleria = false } = opciones;

  // Detección de dispositivo móvil (celular o tablet)
  const esMovil = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  // PC
  if (Capacitor.isNativePlatform() || !esMovil) {
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
      if (
        error?.message?.includes('cancelled') ||
        error?.message?.includes('canceled') ||
        error?.message?.includes('User cancelled')
      ) {
        return null;
      }
      console.warn('Error al capturar foto en nativo/PC:', error);
      return null;
    }
  }

  // Web Browser en celular
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';

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

    // Control si el usuario cancela o cierra la cámara
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
